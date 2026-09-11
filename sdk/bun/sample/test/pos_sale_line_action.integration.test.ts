import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Sale line action 731 parity', () => {
  test('registers the standalone action page/API contract and Odoo columns', () => {
    const page = yaml('pages/pos-sale-line.yaml');
    const api = yaml('api/pos-sale-line.yaml');

    expect(page.page).toMatchObject({ id: 'pos-sale-line', route: '/point-of-sale/sale-line' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({
      type: 'ListView', variant: 'odoo', source: 'pos_sale_lines',
      create_action: 'create_pos_sale_line_action',
      row_open_action: 'view_pos_sale_line_action',
      row_double_click_action: 'view_pos_sale_line_action',
    });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([
      'Product', 'Quantity', 'Discount (%) ', 'Unit Price', 'Tax Excl.', 'Tax Incl.', 'Created on',
    ]);
    expect(api.datasources[0]).toMatchObject({ id: 'pos_sale_lines', permission: 'pos.read' });
    expect(api.datasources[0].query).toContain('l.price_subtotal');
    expect(api.datasources[0].query).toContain("o.state IN ('Paid', 'Invoiced')");
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'POS_SALE_LINE_UNAVAILABLE' });
  });

  test('covers read, create, delete, validation, empty state, and permissions', async () => {
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
      INSERT INTO pos_orders VALUES ('order-1', 'POS/2026/09/10/0001', 'session-1', 'Paid');
      INSERT INTO pos_order_lines VALUES ('line-1', 1, 'order-1', 'Wall Shelf Unit', 1, 1.98, 0, 0, 1.98, 0, 1.98, TIMESTAMP '2026-09-10 06:59:00');
    `);

    const api = yaml('api/pos-sale-line.yaml');
    expect(action(api, 'view_pos_sale_line_action')).toMatchObject({ permission: 'pos.read', navigate_to: '/point-of-sale/sales-line-detail' });
    expect(action(api, 'create_pos_sale_line_action')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'create' });
    expect(action(api, 'delete_pos_sale_line_action')).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete' });

    const create = action(api, 'create_pos_sale_line_action');
    const created = await repository.executeMutation(create.mutation, {
      id: 'line-2', values: { order_id: 'order-1', product_name: 'Small Shelf', quantity: 2, unit_price: 2.83, discount: 0 },
    });
    expect(created).toMatchObject({ product_name: 'Small Shelf', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, {
      id: 'line-3', values: { order_id: 'order-1', product_name: 'Invalid', quantity: 0, unit_price: 1, discount: 0 },
    })).rejects.toThrow();
    await expect(repository.executeMutation(create.mutation, {
      id: 'line-4', values: { order_id: 'missing', product_name: 'Invalid', quantity: 1, unit_price: 1, discount: 0 },
    })).rejects.toThrow();

    const remove = action(api, 'delete_pos_sale_line_action');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'POS_SALE_LINE_NOT_FOUND' });
    database.close();
  });

  test('keeps the 21-row fixture deterministic and clock-independent', () => {
    const migration = yaml('migrations/20260911220000-033-pos-sale-line-action.yaml');
    expect(migration.kind).toBe('data');
    expect(migration.type.postgres.up).toContain("'pos-sale-line-action-021'");
    expect(migration.type.postgres.up).toContain("TIMESTAMP '2026-09-10 06:59:00'");
    expect(migration.type.postgres.up).not.toContain('CURRENT_TIMESTAMP');
  });
});
