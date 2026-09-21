import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce product page image roundness parity', () => {
  test('traces Odoo roundness values and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-image-roundness-policy.yaml');
    const page = yaml('pages/product-page-image-roundness-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_image_roundness = fields.Selection');
    expect(websiteModel).toContain("('none', \"None\")");
    expect(websiteModel).toContain("('small', \"Small\")");
    expect(websiteModel).toContain("('medium', \"Medium\")");
    expect(websiteModel).toContain("('big', \"Big\")");
    expect(templates).toContain('website.product_page_image_roundness');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-image-roundness-policy', route: '/ecommerce/product-page-image-roundness' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-image-roundness-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_image_roundness_policy' });
    expect(action(api, 'edit_ecommerce_product_page_image_roundness_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_image_roundness.update' });
    expect(action(api, 'edit_ecommerce_product_page_image_roundness_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_roundness')).toBeTruthy();
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_image_roundness' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-image-roundness', label: 'Product Page Image Roundness', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921340000-132-ecommerce-product-page-image-roundness.yaml').version).toBe('0.0.132');
    expect(yaml('migrations/20260921341000-133-ecommerce-product-page-image-roundness-demo.yaml').version).toBe('0.0.133');
  });

  test('persists image roundness, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_image_roundness_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-image-roundness-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_product_page_image_roundness_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', image_roundness: 'none', image_roundness_label: 'None' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([
      { value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'big', label: 'Big' },
    ]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-image-roundness-my-company', expected_row_version: 1, values: { image_roundness: 'medium' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_ROUNDNESS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-roundness-my-company', expected_row_version: 1, values: { image_roundness: 'huge' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_ROUNDNESS_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-roundness-my-company', expected_row_version: 1, values: { image_roundness: 'medium' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, image_roundness: 'medium', image_roundness_label: 'Medium' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-roundness-my-company', expected_row_version: 1, values: { image_roundness: 'small' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_ROUNDNESS_STALE' });

    const detailApi = yaml('api/product-detail.yaml');
    const detailRoundness = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_roundness');
    const bound = bindNamedParams(detailRoundness.query, { id: 'ecommerce-product-mug', company_name: 'My Company' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-page-image-roundness-my-company', row_version: 2, company_name: 'My Company', image_roundness: 'medium', image_roundness_label: 'Medium' }]);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-image-roundness-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-roundness-my-company', expected_row_version: 1, values: { image_roundness: 'big' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, image_roundness, row_version FROM ecommerce_product_page_image_roundness_policies WHERE id = ?', ['ecommerce-product-page-image-roundness-my-company'])).toEqual([{ company_name: 'My Company', image_roundness: 'big', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
