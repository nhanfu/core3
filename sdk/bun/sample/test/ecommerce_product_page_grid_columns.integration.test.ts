import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce product page grid columns parity', () => {
  test('traces the Odoo grid action and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const plugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/product_page_option_plugin.js', 'utf8');
    const optionView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/product_page_option.xml', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-grid-columns-policy.yaml');
    const page = yaml('pages/product-page-grid-columns-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_grid_columns = fields.Integer(default=2)');
    expect(plugin).toContain('static id = "productPageImageGridColumns"');
    expect(plugin).toContain('product_page_grid_columns: value');
    expect(optionView).toContain("action=\"'productPageImageGridColumns'\"");
    expect(optionView).toContain('actionValue="1"');
    expect(optionView).toContain('actionValue="2"');
    expect(optionView).toContain('actionValue="3"');
    expect(template).toContain('data-grid_columns="website.product_page_grid_columns"');
    expect(template).toContain('t-foreach="website.product_page_grid_columns"');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-grid-columns-policy', route: '/ecommerce/product-page-grid-columns' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-grid-columns-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_grid_columns_policy' });
    expect(action(api, 'edit_ecommerce_product_page_grid_columns_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_grid_columns.update' });
    expect(action(api, 'edit_ecommerce_product_page_grid_columns_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_product_page_grid_columns', permission: 'ecommerce.read' })]));
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_grid_columns' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-grid-columns', label: 'Product Page Grid Columns', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921420000-148-ecommerce-product-page-grid-columns.yaml').version).toBe('0.0.148');
    expect(yaml('migrations/20260921421000-149-ecommerce-product-page-grid-columns-demo.yaml').version).toBe('0.0.149');
  });

  test('persists columns, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_product_page_grid_columns_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-grid-columns-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_product_page_grid_columns_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', grid_columns: 2, grid_columns_label: '2 columns' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([{ value: 1, label: '1 column' }, { value: 2, label: '2 columns' }, { value: 3, label: '3 columns' }]);
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 3 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_GRID_COLUMNS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 4 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_GRID_COLUMNS_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 3 } }) as any;
    expect(updated).toMatchObject({ row_version: 2, grid_columns: 3, grid_columns_label: '3 columns' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 1 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_GRID_COLUMNS_STALE' });
    const detail = yaml('api/product-detail.yaml').datasources.find((source: any) => source.id === 'ecommerce_product_page_grid_columns');
    expect(await repository.querySource(detail, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 10)).toMatchObject({ data: [expect.objectContaining({ grid_columns: 3, grid_columns_label: '3 columns' })] });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-product-page-grid-columns-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 1 } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query("SELECT company_name, grid_columns, row_version FROM ecommerce_product_page_grid_columns_policies WHERE id = 'ecommerce-product-page-grid-columns-my-company'", [])).toEqual([{ company_name: 'My Company', grid_columns: 1, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
