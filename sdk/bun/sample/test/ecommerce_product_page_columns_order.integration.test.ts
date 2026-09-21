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

describe('eCommerce product page columns order parity', () => {
  test('traces Odoo columns-order values and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-page-columns-order-policy.yaml');
    const page = yaml('pages/product-page-columns-order-policy.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('product_page_cols_order = fields.Selection');
    expect(websiteModel).toContain("('regular', \"Regular order\")");
    expect(websiteModel).toContain("('inverse', \"Inverse order\")");
    expect(templates).toContain("website.product_page_cols_order == 'inverse'");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-page-columns-order-policy', route: '/ecommerce/product-page-columns-order' });
    expect(api.page).toEqual({ id: 'ecommerce-product-page-columns-order-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_page_columns_order_policy' });
    expect(action(api, 'edit_ecommerce_product_page_columns_order_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.page_columns_order.update' });
    expect(action(api, 'edit_ecommerce_product_page_columns_order_policy').mutation.concurrency).toEqual({ required: true });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_columns_order')).toBeTruthy();
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_product_page_columns_order' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-page-columns-order', label: 'Product Page Columns Order', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921350000-134-ecommerce-product-page-columns-order.yaml').version).toBe('0.0.134');
    expect(yaml('migrations/20260921351000-135-ecommerce-product-page-columns-order-demo.yaml').version).toBe('0.0.135');
  });

  test('persists columns order, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_columns_order_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-page-columns-order-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_product_page_columns_order_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', columns_order: 'regular', columns_order_label: 'Regular order' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([
      { value: 'regular', label: 'Regular order' }, { value: 'inverse', label: 'Inverse order' },
    ]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-page-columns-order-my-company', expected_row_version: 1, values: { columns_order: 'inverse' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_COLUMNS_ORDER_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-columns-order-my-company', expected_row_version: 1, values: { columns_order: 'sideways' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_PAGE_COLUMNS_ORDER_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-columns-order-my-company', expected_row_version: 1, values: { columns_order: 'inverse' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, columns_order: 'inverse', columns_order_label: 'Inverse order' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-columns-order-my-company', expected_row_version: 1, values: { columns_order: 'regular' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_PAGE_COLUMNS_ORDER_STALE' });

    const detailApi = yaml('api/product-detail.yaml');
    const detailColumnsOrder = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_page_columns_order');
    const bound = bindNamedParams(detailColumnsOrder.query, { id: 'ecommerce-product-mug', company_name: 'My Company' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-page-columns-order-my-company', row_version: 2, company_name: 'My Company', columns_order: 'inverse', columns_order_label: 'Inverse order' }]);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-columns-order-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-page-columns-order-my-company', expected_row_version: 1, values: { columns_order: 'inverse' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, columns_order, row_version FROM ecommerce_product_page_columns_order_policies WHERE id = ?', ['ecommerce-product-page-columns-order-my-company'])).toEqual([{ company_name: 'My Company', columns_order: 'inverse', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
