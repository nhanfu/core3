import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Purchase order Catalog action parity', () => {
  test('joins the source-backed Catalog control to the detail page and catalog datasource', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const lines = page.components.find((component: any) => component.type === 'LineItemGrid');
    const action = api.actions.find((item: any) => item.id === 'add_purchase_order_catalog');

    expect(page.page.id).toBe('purchase-detail');
    expect(api.page.id).toBe('purchase-detail');
    expect(lines.actions).toContainEqual(expect.objectContaining({ id: 'add_purchase_order_catalog', label: 'Catalog' }));
    expect(api.datasources).toContainEqual(expect.objectContaining({ id: 'purchase_order_catalog_products', permission: 'purchase.read' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'purchase.write', action: 'purchase.orders.catalog.add' });
    expect(action.fields).toContainEqual(expect.objectContaining({ field: 'product_ids', type: 'multi-select', options_source: 'purchase_order_catalog_products', multiple: true }));
    expect(action.mutation.concurrency).toEqual({ required: true });
  });

  test('adds selected purchaseable products, merges repeats, persists totals, and guards stale/invalid orders', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_order_catalog_test_schema_migrations', ['schema', 'data']);
    const action = yaml('api/purchase-detail.yaml').actions.find((item: any) => item.id === 'add_purchase_order_catalog');
    const input = { id: 'po-demo-001', expected_row_version: 1, values: { product_ids: ['purchase-product-acoustic', 'purchase-product-apple-pie'], quantity: 2 } };

    const added = await repository.executeMutation(action.mutation, input) as any;
    expect(added).toMatchObject({ product_id: 'purchase-product-acoustic', quantity: 2, line_total: 360 });
    const addedRows = await repository.query("SELECT product_id, quantity, line_total FROM purchase_order_lines WHERE order_id = 'po-demo-001' AND product_id IN ('purchase-product-acoustic', 'purchase-product-apple-pie') ORDER BY product_id");
    expect(addedRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ product_id: 'purchase-product-acoustic', quantity: 2, line_total: 360 }),
      expect.objectContaining({ product_id: 'purchase-product-apple-pie', quantity: 2, line_total: 14 }),
    ]));
    expect(await repository.query("SELECT quantity, total_amount, row_version FROM purchase_orders WHERE id = 'po-demo-001'")).toEqual([
      expect.objectContaining({ quantity: 414, total_amount: 999, row_version: 2 }),
    ]);

    const merged = await repository.executeMutation(action.mutation, { id: 'po-demo-001', expected_row_version: 2, values: { product_ids: ['purchase-product-acoustic'], quantity: 1 } }) as any;
    expect(merged).toMatchObject({ product_id: 'purchase-product-acoustic', quantity: 3, line_total: 540 });
    expect(await repository.query("SELECT COUNT(*) AS count FROM purchase_order_lines WHERE order_id = 'po-demo-001' AND product_id = 'purchase-product-acoustic'")).toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT quantity, total_amount, row_version FROM purchase_orders WHERE id = 'po-demo-001'")).toEqual([
      expect.objectContaining({ quantity: 415, total_amount: 1179, row_version: 3 }),
    ]);

    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-001', expected_row_version: 2, values: { product_ids: ['purchase-product-bagel'], quantity: 1 } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_CATALOG_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-005', expected_row_version: 1, values: { product_ids: ['purchase-product-bagel'], quantity: 1 } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_CATALOG_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-001', expected_row_version: 3, values: { product_ids: ['missing-product'], quantity: 1 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_CATALOG_PRODUCT_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'po-demo-001', expected_row_version: 3, values: { product_ids: [], quantity: 1 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_ORDER_CATALOG_SELECTION_REQUIRED' });
  });
});
