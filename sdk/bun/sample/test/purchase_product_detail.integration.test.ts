import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/purchase-product-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Purchase product catalog detail parity', () => {
  test('binds the Products list to the Odoo-shaped product detail by page id', () => {
    const list = yaml('pages/purchase-products.yaml');
    const detail = yaml('pages/purchase-product-detail.yaml');
    const listApi = yaml('api/purchase-products.yaml');
    const detailApi = yaml('api/purchase-product-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listView = list.components[0];
    const detailView = detail.components[0];

    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.page).toMatchObject({ id: 'purchase-products', route: '/purchase/products', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'purchase-product-detail', route: '/purchase/products/detail', auth: { require: ['purchase.read'] } });
    expect(listApi.page.id).toBe('purchase-products');
    expect(detailApi.page.id).toBe('purchase-product-detail');
    expect(discovered.pageDatasources.get('purchase-product-detail')).toEqual(expect.arrayContaining(['purchase_product_detail', 'purchase_product_messages']));
    expect(listView).toMatchObject({ source: 'purchase_products', row_open_action: 'view_purchase_product', row_double_click_action: 'view_purchase_product' });
    expect(detailView).toMatchObject({ source: 'purchase_product_detail', title_field: 'name', subtitle_field: 'default_code', editable: true, message_source: 'purchase_product_messages' });
    expect(detailView.groups.map((group: any) => group.title)).toEqual(['Product', 'General Information', 'Purchase']);
    expect(detailView.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Purchase', 'Sales', 'Chatter']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'products').items).toContainEqual(expect.objectContaining({ path: '/purchase/products', label: 'Products', permission: 'purchase.read' }));
  });

  test('serves deterministic product defaults, search, detail, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_detail_schema_migrations', ['schema', 'data']);

    const listSource = yaml('api/purchase-products.yaml').datasources.find((source: any) => source.id === 'purchase_products');
    const detailSource = yaml('api/purchase-product-detail.yaml').datasources.find((source: any) => source.id === 'purchase_product_detail');
    const messagesSource = yaml('api/purchase-product-detail.yaml').datasources.find((source: any) => source.id === 'purchase_product_messages');
    const params = { q: null, purchase_ok: null, active: null, fixture_state: null };
    const firstPage = await repository.querySource(listSource, params, 0, 80);
    const secondPage = await repository.querySource(listSource, params, 80, 80);
    expect([...firstPage.data, ...secondPage.data]).toHaveLength(105);
    expect(firstPage.data[0]).toMatchObject({ id: 'purchase-product-acoustic', name: 'Acoustic Bloc Screens', default_code: 'FURN-001', purchase_ok: true });
    expect((await repository.querySource(listSource, { ...params, q: 'Acoustic' }, 0, 50)).data).toMatchObject([{ id: 'purchase-product-acoustic' }]);
    expect((await repository.querySource(listSource, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = await repository.querySource(detailSource, { id: 'purchase-product-acoustic', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Acoustic Bloc Screens', default_code: 'FURN-001', cost_price: 180, on_hand_display: '16.00 Units', variant_count: 1 });
    expect((await repository.querySource(messagesSource, { id: 'purchase-product-acoustic' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(detailSource, { id: 'missing-product', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detailSource, { id: 'purchase-product-acoustic', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_PRODUCT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces read/write permissions and guarded edit/archive mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_detail_crud_schema_migrations', ['schema', 'data']);
    const detailApi = yaml('api/purchase-product-detail.yaml');
    expect(detailApi.datasources.every((source: any) => source.permission === 'purchase.read')).toBe(true);
    expect(detailApi.actions.filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'purchase.write')).toBe(true);
    expect(yaml('pages/purchase-product-detail.yaml').page.auth.require).toEqual(['purchase.read']);

    const edit = action('edit_purchase_product_detail');
    const archive = action('archive_purchase_product_detail');
    const values = { default_code: 'FURN-001', name: 'Acoustic Bloc Screens Updated', product_tags: 'Office Furniture', barcode: '100000000001', company_name: 'My Company (San Francisco)', list_price: 295, cost_price: 181, category: 'Office Furniture', product_type: 'Goods', uom: 'Units', purchase_ok: true, active: true };
    const updated = await repository.executeMutation(edit.mutation, { id: 'purchase-product-acoustic', expected_row_version: 1, values });
    expect(updated).toMatchObject({ name: 'Acoustic Bloc Screens Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-product-acoustic', expected_row_version: 1, values: { ...values, name: 'Stale Product Update' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-product-acoustic', expected_row_version: 2, values: { ...values, name: 'Apple Pie' } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_PRODUCT_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-product', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_PRODUCT_NOT_FOUND' });
    await repository.executeMutation(archive.mutation, { id: 'purchase-product-acoustic', expected_row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: 'purchase-product-acoustic', expected_row_version: 3 })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
