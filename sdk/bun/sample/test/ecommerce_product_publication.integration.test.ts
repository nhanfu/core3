import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (document: any, id: string) => document.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product publication parity', () => {
  test('traces Odoo publication and keeps list/detail page/API contracts separate', () => {
    const productTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const publishedMixin = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/mixins.py', 'utf8');
    const productViews = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    expect(productTemplate).toContain('publish_date = fields.Datetime');
    expect(productTemplate).toContain('def _compute_publish_date');
    expect(publishedMixin).toContain('def website_publish_button');
    expect(publishedMixin).toContain("value = not self.website_published");
    expect(productViews).toContain('widget="website_redirect_button"');
    expect(productViews).toContain('name="is_published" widget="boolean_toggle"');

    const api = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const productsPage = yaml('pages/products.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    expect(productsPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(api.page.id).toBe(productsPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(api.datasources[0].query).toContain('publish_date');
    expect(detailApi.datasources[0].query).toContain('publish_date');
    expect(action(api, 'publish_ecommerce_product')).toMatchObject({ type: 'server', permission: 'ecommerce.write' });
    expect(action(api, 'unpublish_ecommerce_product')).toMatchObject({ type: 'server', permission: 'ecommerce.write' });
    expect(action(detailApi, 'publish_ecommerce_product').mutation.steps[0].query).toContain('publish_date');
    expect(productsPage.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'publish_date' })]));
    expect(detailPage.components[0].groups[1].fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'publish_date' })]));
  });

  test('publishes and unpublishes with company and optimistic concurrency guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_publication_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_publication_test', ['schema', 'data']);

    const detailApi = yaml('api/product-detail.yaml');
    const shop = yaml('api/shop.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_shop_products');
    const publish = action(detailApi, 'publish_ecommerce_product');
    const unpublish = action(detailApi, 'unpublish_ecommerce_product');
    const setup = (await repository.query('SELECT * FROM ecommerce_products WHERE id = ?', ['ecommerce-product-setup']))[0] as any;
    expect(setup).toMatchObject({ is_published: false, publish_date: null, row_version: 1 });

    const published = await repository.executeMutation(publish.mutation, {
      id: setup.id,
      expected_row_version: 1,
      current_company_name: 'My Company',
    }) as any;
    expect(published).toMatchObject({ id: setup.id, is_published: true, row_version: 2 });
    expect(published.publish_date).toBeTruthy();
    expect((await repository.querySource(shop, { q: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).toContain(setup.id);

    const unpublished = await repository.executeMutation(unpublish.mutation, {
      id: setup.id,
      expected_row_version: 2,
      current_company_name: 'My Company',
    }) as any;
    expect(unpublished).toMatchObject({ id: setup.id, is_published: false, publish_date: null, row_version: 3 });
    expect((await repository.querySource(shop, { q: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).not.toContain(setup.id);

    await expect(repository.executeMutation(publish.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'Other Company',
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(publish.mutation, {
      id: setup.id, expected_row_version: 2, current_company_name: 'My Company',
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PUBLICATION_STALE' });
    database.close();
  });

  test('preserves publication timestamp and visibility across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-publication-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_publication_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const publish = action(yaml('api/products.yaml'), 'publish_ecommerce_product');
    const published = await firstRepository.executeMutation(publish.mutation, {
      id: 'ecommerce-product-setup', expected_row_version: 1, current_company_name: 'My Company',
    }) as any;
    expect(published.publish_date).toBeTruthy();
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const persisted = (await secondRepository.query('SELECT is_published, CAST(publish_date AS VARCHAR) AS publish_date, row_version FROM ecommerce_products WHERE id = ?', ['ecommerce-product-setup']))[0] as any;
    expect(persisted).toMatchObject({ is_published: true, row_version: 2 });
    expect(persisted.publish_date).toBeTruthy();
    second.close();
    rmSync(databasePath, { force: true });
  });
});
