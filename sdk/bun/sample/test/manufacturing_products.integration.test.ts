import { describe, expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);
const productMigration = '20260912000000-016-products.yaml';

function productMigrationRoot() {
  const root = mkdtempSync(join(tmpdir(), 'core3-mrp-products-'));
  copyFileSync(join(serviceRoot, 'migrations', productMigration), join(root, productMigration));
  return root;
}

async function productRepository(migrationTable: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrationRoot = productMigrationRoot();
  await migrateDatabase(repository, migrationRoot, undefined, migrationTable, ['schema', 'data']);
  await migrateDatabase(repository, migrationRoot, undefined, migrationTable, ['schema', 'data']);
  rmSync(migrationRoot, { recursive: true, force: true });
  return { database, repository };
}

describe('Manufacturing Products parity slice', () => {
  test('keeps the MRP menu, source action modes, and page/API ownership', () => {
    const page = yaml('pages/products.yaml');
    const detail = yaml('pages/product-detail.yaml');
    const api = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const item = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'master-data').items.find((candidate: any) => candidate.label === 'Products');
    const view = page.components[0];
    const form = detail.components[0];

    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-products', route: '/manufacturing/products', auth: { require: ['manufacturing.read'] } });
    expect(detail.page).toMatchObject({ id: 'manufacturing-product-detail', route: '/manufacturing/products/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(discovered.pages.get(page.page.id)?.config.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('mrp_products');
    expect(discovered.pageDatasources.get(detail.page.id)).toEqual(expect.arrayContaining(['mrp_product_detail', 'mrp_product_messages']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/products', page: page.page.id, module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing/products/detail', page: detail.page.id, module: 'manufacturing' }),
    ]));
    expect(item).toMatchObject({ path: '/manufacturing/products', label: 'Products', permission: 'manufacturing.read' });
    expect(view).toMatchObject({ source: 'mrp_products', view_navigation: 'tabs', form_view: { page: 'apps/services/manufacturing/pages/product-detail.yaml' } });
    expect(view.views.map((candidate: any) => candidate.label)).toEqual(['Kanban', 'List']);
    expect(form).toMatchObject({ source: 'mrp_product_detail', title_field: 'name', subtitle_field: 'default_code', editable: true, message_source: 'mrp_product_messages' });
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Attributes & Variants', 'Sales', 'Point of Sale', 'Purchase', 'Inventory', 'INTERNAL NOTES']);
    expect(api.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));
  });

  test('seeds deterministic products, search, filters, detail, and error states', async () => {
    const { database, repository } = await productRepository('manufacturing_products_schema_migrations');
    const list = yaml('api/products.yaml').datasources.find((source: any) => source.id === 'mrp_products');
    const detail = yaml('api/product-detail.yaml').datasources.find((source: any) => source.id === 'mrp_product_detail');
    const messages = yaml('api/product-detail.yaml').datasources.find((source: any) => source.id === 'mrp_product_messages');
    const params = { q: null, product_type: null, manufactured: null, active: null, fixture_state: null };

    const rows = await repository.querySource(list, params, 0, 50);
    expect(rows.data).toHaveLength(11);
    expect(rows.data[0]).toMatchObject({ id: 'mrp-product-acoustic', name: 'Acoustic Bloc Screens', product_type: 'Goods', on_hand_display: '16.00 Units' });
    expect((await repository.querySource(list, { ...params, q: 'FURN_7800' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Desk Combination']);
    expect((await repository.querySource(list, { ...params, manufactured: true }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Cable Management Box', 'Desk Combination', 'Drawer', 'Table', 'Table Kit', 'Table Top']);
    expect((await repository.querySource(list, { ...params, active: false }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Plastic Laminate']);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTS_UNAVAILABLE' });
    expect(await repository.querySource(detail, { id: 'mrp-product-desk', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Desk Combination', bom_count: 1, variant_count: 1, on_hand_display: '235.00 Units' }) });
    expect((await repository.querySource(messages, { id: 'mrp-product-desk' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(detail, { id: 'missing-product', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'mrp-product-desk', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces create, edit, stale-write, duplicate, archive, delete, and permissions contracts', async () => {
    const { database, repository } = await productRepository('manufacturing_products_crud_migrations');
    const productsApi = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const create = action('api/products.yaml', 'create_mrp_product');
    const edit = action('api/product-detail.yaml', 'edit_mrp_product');
    const archive = action('api/product-detail.yaml', 'archive_mrp_product');
    const remove = action('api/product-detail.yaml', 'delete_mrp_product');
    expect(create.permission).toBe('manufacturing.write');
    expect(edit.permission).toBe('manufacturing.write');
    expect(archive.permission).toBe('manufacturing.manage');
    expect(remove.permission).toBe('manufacturing.manage');
    expect(productsApi.datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 } });
    expect(detailApi.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 } });

    const values = { name: 'QA Manufacturing Product', default_code: 'QA-MRP-001', product_type: 'Goods', uom: 'Units', company_name: 'My Company (San Francisco)', list_price: 12, cost_price: 8, on_hand: 0, manufactured: false, bom_component: false, active: true, tracking: 'No Tracking', invoicing_policy: 'Ordered quantities', product_tags: 'QA' };
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: values.name, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_NAME_EXISTS' });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'QA Manufacturing Product Updated', list_price: 13 } }) as any;
    expect(updated).toMatchObject({ name: 'QA Manufacturing Product Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { ...values, name: 'Desk Combination' } })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_NAME_EXISTS' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_ALREADY_ARCHIVED' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCT_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'mrp-product-desk', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_IN_USE' });
    database.close();
  });
});
