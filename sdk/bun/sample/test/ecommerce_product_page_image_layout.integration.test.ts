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

describe('eCommerce product page image layout parity', () => {
  test('traces Odoo Carousel/Grid layout and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-image-layout-policy.yaml');
    const page = yaml('pages/product-page-image-layout-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_image_layout = fields.Selection');
    expect(websiteModel).toContain("('carousel', \"Carousel\")");
    expect(websiteModel).toContain("('grid', \"Grid\")");
    expect(templates).toContain('data-image_layout="website.product_page_image_layout"');
    expect(templates).toContain("website_sale.shop_product_#{website.product_page_image_layout}");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-image-layout-policy', route: '/ecommerce/product-page-image-layout' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-image-layout-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_image_layout_policy' });
    expect(action(api, 'edit_ecommerce_product_page_image_layout_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_image_layout.update' });
    expect(action(api, 'edit_ecommerce_product_page_image_layout_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_layout')).toBeTruthy();
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_image_layout' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-image-layout', label: 'Product Page Image Layout', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921310000-126-ecommerce-product-page-image-layout.yaml').version).toBe('0.0.126');
    expect(yaml('migrations/20260921311000-127-ecommerce-product-page-image-layout-demo.yaml').version).toBe('0.0.127');
  });

  test('persists layout policy, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_image_layout_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-image-layout-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_product_page_image_layout_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', image_layout: 'carousel', image_layout_label: 'Carousel' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([{ value: 'carousel', label: 'Carousel' }, { value: 'grid', label: 'Grid' }]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-image-layout-my-company', expected_row_version: 1, values: { image_layout: 'grid' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_LAYOUT_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-layout-my-company', expected_row_version: 1, values: { image_layout: 'masonry' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_LAYOUT_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-layout-my-company', expected_row_version: 1, values: { image_layout: 'grid' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, image_layout: 'grid', image_layout_label: 'Grid' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-layout-my-company', expected_row_version: 1, values: { image_layout: 'carousel' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_IMAGE_LAYOUT_STALE' });

    const detailApi = yaml('api/product-detail.yaml');
    const detailLayout = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_image_layout');
    const bound = bindNamedParams(detailLayout.query, { id: 'ecommerce-product-mug', company_name: 'My Company' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-page-image-layout-my-company', row_version: 2, company_name: 'My Company', image_layout: 'grid', image_layout_label: 'Grid' }]);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-image-layout-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-image-layout-my-company', expected_row_version: 1, values: { image_layout: 'grid' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, image_layout, row_version FROM ecommerce_product_page_image_layout_policies WHERE id = ?', ['ecommerce-product-page-image-layout-my-company'])).toEqual([{ company_name: 'My Company', image_layout: 'grid', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
