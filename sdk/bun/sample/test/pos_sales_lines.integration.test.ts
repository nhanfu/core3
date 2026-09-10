import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS all sales lines action parity', () => {
  test('registers action 684 as a distinct menu and joins page/API pairs by id', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const page = yaml('pages/pos-sales-lines.yaml');
    const api = yaml('api/pos-sales-lines.yaml');
    const detailPage = yaml('pages/pos-sales-line-detail.yaml');
    const detailApi = yaml('api/pos-sales-line-detail.yaml');

    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/sales-lines', label: 'All Sales Lines', permission: 'pos.read' }));
    expect(page.page).toMatchObject({ id: 'pos-sales-lines', route: '/point-of-sale/sales-lines' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(page.components[0]).toMatchObject({
      source: 'pos_sales_lines', create_action: 'create_pos_sales_line',
      row_open_action: 'view_pos_sales_line', row_double_click_action: 'view_pos_sales_line',
      empty_state: expect.objectContaining({ title: 'No sales lines' }),
    });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Order Ref', 'Created on', 'Product', 'Quantity', 'Unit Price']);
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.field)).toEqual([
      'order_name', 'product_name', 'quantity', 'discount', 'unit_price', 'created_on', 'currency',
    ]);
  });

  test('covers create, update, delete, search, stale, missing, and permission contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE pos_sessions(id VARCHAR PRIMARY KEY, currency VARCHAR);
      CREATE TABLE pos_orders(id VARCHAR PRIMARY KEY, name VARCHAR, session_id VARCHAR, state VARCHAR);
      CREATE TABLE pos_order_lines(
        id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, order_id VARCHAR, product_name VARCHAR,
        quantity DECIMAL(18,3), price_unit DECIMAL(18,2), discount DECIMAL(9,4), tax_rate DECIMAL(9,4),
        price_subtotal DECIMAL(18,2), price_tax DECIMAL(18,2), price_total DECIMAL(18,2), created_at TIMESTAMP
      );
      INSERT INTO pos_sessions VALUES ('session-1', 'USD');
      INSERT INTO pos_orders VALUES ('order-1', 'POS/2026/01/15/0001', 'session-1', 'Paid');
      INSERT INTO pos_order_lines VALUES ('line-1', 1, 'order-1', 'Wall Shelf Unit', 1, 1.98, 0, 0, 1.98, 0, 1.98, TIMESTAMP '2026-01-15 10:15:00');
    `);

    const listApi = yaml('api/pos-sales-lines.yaml');
    const detailApi = yaml('api/pos-sales-line-detail.yaml');
    expect(action(listApi, 'view_pos_sales_line')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/sales-line-detail', params: { id: '{row.id}' },
    });
    expect(action(listApi, 'create_pos_sales_line')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'create' });
    expect(action(detailApi, 'edit_pos_sales_line')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update' });
    expect(action(listApi, 'delete_pos_sales_line')).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete' });
    expect(listApi.datasources[0].query).toContain(":q IS NULL");
    expect(listApi.datasources[0].error_states.transport_error.status).toBe(503);
    expect(detailApi.datasources[0].error_states.transport_error.code).toBe('POS_SALES_LINE_DETAIL_UNAVAILABLE');
    expect(detailApi.datasources[0].query).toContain('l.id = :id');

    const create = action(listApi, 'create_pos_sales_line');
    const created = await repository.executeMutation(create.mutation, {
      id: 'line-2', values: { order_id: 'order-1', product_name: 'Small Shelf', quantity: 2, unit_price: 2.83, discount: 0 },
    });
    expect(created).toMatchObject({ product_name: 'Small Shelf', order_id: 'order-1', row_version: 1 });
    const createdId = created.id;
    await expect(repository.executeMutation(create.mutation, {
      id: 'line-3', values: { order_id: 'missing', product_name: 'Invalid', quantity: 1, unit_price: 1, discount: 0 },
    })).rejects.toThrow();

    const update = action(detailApi, 'edit_pos_sales_line');
    const updated = await repository.executeMutation(update.mutation, {
      id: 'line-1', expected_row_version: 1,
      values: { product_name: 'Wall Shelf Updated', quantity: 2, unit_price: 2.50, discount: 10 },
    });
    expect(updated).toMatchObject({ id: 'line-1', product_name: 'Wall Shelf Updated', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: 'line-1', expected_row_version: 1,
      values: { product_name: 'Stale', quantity: 1, unit_price: 1, discount: 0 },
    })).rejects.toMatchObject({ status: 409, code: 'POS_SALES_LINE_STALE' });

    const remove = action(listApi, 'delete_pos_sales_line');
    await repository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 1 });
    await expect(repository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'POS_SALES_LINE_NOT_FOUND' });
    database.close();
  });

  test('uses deterministic fixture IDs and dates without moving clocks', () => {
    const migration = yaml('migrations/20260911110000-023-pos-sales-lines.yaml');
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain("'pos-sales-line-demo-001'");
    expect(migration.type.postgres.up).toContain("TIMESTAMP '2026-01-15 10:15:00'");
    expect(migration.type.postgres.up).not.toContain('CURRENT_TIMESTAMP');
  });
});
