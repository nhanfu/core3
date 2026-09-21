import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = yaml('pages/pos-orders.yaml');
const api = yaml('api/pos-orders.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'create_pos_invoices');

async function openRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

async function seedOrders(repository: YamlRepository) {
  await repository.run(`
    INSERT INTO pos_orders(id, row_version, name, session_id, partner_name, state, amount_total, amount_tax, amount_paid, payment_method, date_order, config_id, cashier_id, company, to_invoice)
    VALUES
      ('pos-bulk-invoice-001', 1, 'POS/BULK/001', 'pos-session-demo-001', 'Bulk Customer', 'Paid', 12.00, 1.20, 12.00, 'Cash', TIMESTAMP '2026-01-15 09:00:00', 'Main Shop', 'cashier-1', 'Core3 Demo Company', TRUE),
      ('pos-bulk-invoice-002', 1, 'POS/BULK/002', 'pos-session-demo-001', 'Bulk Customer', 'Paid', 8.00, 0.80, 8.00, 'Cash', TIMESTAMP '2026-01-15 09:01:00', 'Main Shop', 'cashier-1', 'Core3 Demo Company', TRUE),
      ('pos-bulk-invoice-split', 1, 'POS/BULK/003', 'pos-session-demo-001', 'Other Customer', 'Paid', 5.00, 0.50, 5.00, 'Cash', TIMESTAMP '2026-01-15 09:02:00', 'Main Shop', 'cashier-1', 'Core3 Demo Company', TRUE)
  `);
}

describe('POS bulk Create Invoices parity', () => {
  test('maps the Odoo list header action through separate page/API contracts', () => {
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.page.id).toBe('pos-orders');
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ selectable: true, row_open_action: 'view_pos_order' });
    expect(list.bulk_actions).toContainEqual(expect.objectContaining({ id: 'create_pos_invoices', label: 'Create Invoices', permission: 'pos.write' }));
    expect(action).toMatchObject({ type: 'server_form', title: 'Create Invoice(s)', permission: 'pos.write', operation: 'bulk_create_invoices', handler: 'yaml_mutation' });
    expect(action.fields).toContainEqual(expect.objectContaining({ field: 'consolidated_billing', label: 'Consolidated Billing', default: true }));
    expect(api.datasources.find((source: any) => source.id === 'pos_orders').query).toContain('invoice_id');
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml', 'utf8')).toContain('string="Create Invoices"');
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/wizard/pos_make_invoice.xml', 'utf8')).toContain('name="consolidated_billing"');
  });

  test('creates one durable consolidated invoice and links every selected order', async () => {
    const { database, repository } = await openRepository('pos_order_bulk_invoice_create');
    await seedOrders(repository);
    const result = await repository.executeMutation(action.mutation, {
      selectedIds: ['pos-bulk-invoice-001', 'pos-bulk-invoice-002'],
      consolidated_billing: true,
      current_company_name: 'Core3 Demo Company',
      current_user_id: 'pos-manager',
      current_user_name: 'POS Manager',
    }) as any;
    expect(result).toMatchObject({ consolidated_billing: true, selected_count: 2, invoice_count: 1, state: 'Created', created_by: 'POS Manager' });
    expect(await repository.query('SELECT state, invoice_id FROM pos_orders WHERE id IN (?, ?) ORDER BY id', ['pos-bulk-invoice-001', 'pos-bulk-invoice-002'])).toEqual([
      { state: 'Invoiced', invoice_id: result.id + '-invoice-1' },
      { state: 'Invoiced', invoice_id: result.id + '-invoice-1' },
    ]);
    expect(await repository.query('SELECT COUNT(*) AS count, MAX(amount) AS amount FROM pos_invoices WHERE id = ?', [result.id + '-invoice-1'])).toEqual([{ count: 1, amount: 20 }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_invoice_run_orders WHERE run_id = ?', [result.id])).toEqual([{ count: 2 }]);
    await database.close();
  }, 30000);

  test('supports separate invoices and rejects invalid, cross-company, and read-only selections atomically', async () => {
    const { database, repository } = await openRepository('pos_order_bulk_invoice_guards');
    await seedOrders(repository);
    const base = { consolidated_billing: false, current_company_name: 'Core3 Demo Company', current_user_id: 'pos-manager', current_user_name: 'POS Manager' };
    const split = await repository.executeMutation(action.mutation, { ...base, selectedIds: ['pos-bulk-invoice-001', 'pos-bulk-invoice-split'] }) as any;
    expect(split.invoice_count).toBe(2);
    expect(await repository.query('SELECT COUNT(DISTINCT invoice_id) AS count FROM pos_orders WHERE id IN (?, ?)', ['pos-bulk-invoice-001', 'pos-bulk-invoice-split'])).toEqual([{ count: 2 }]);
    await expect(repository.executeMutation(action.mutation, { ...base, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'POS_INVOICE_SELECTION_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, selectedIds: ['pos-bulk-invoice-001', 'missing-order'] })).rejects.toMatchObject({ status: 409, code: 'POS_INVOICE_SELECTION_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Core3 Vietnam Branch', selectedIds: ['pos-bulk-invoice-002'] })).rejects.toMatchObject({ status: 409, code: 'POS_INVOICE_SELECTION_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...base, selectedIds: ['pos-order-touch-demo-001'] })).rejects.toMatchObject({ status: 409, code: 'POS_INVOICE_SELECTION_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM pos_invoice_runs WHERE state = 'Created'" )).toEqual([{ count: 1 }]);
    await database.close();
  }, 30000);

  test('keeps invoice run and order links after restart and migration replay', async () => {
    const databasePath = `/tmp/core3-pos-bulk-invoice-${crypto.randomUUID()}.duckdb`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, join(root, 'migrations'), undefined, 'pos_order_bulk_invoice_restart', ['schema', 'data']);
    await seedOrders(first);
    const result = await first.executeMutation(action.mutation, { selectedIds: ['pos-bulk-invoice-001'], consolidated_billing: true, current_company_name: 'Core3 Demo Company', current_user_id: 'pos-manager', current_user_name: 'POS Manager' }) as any;
    await firstDatabase.close();
    const secondDatabase = await DuckDbDatabase.open(databasePath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, join(root, 'migrations'), undefined, 'pos_order_bulk_invoice_restart', ['schema', 'data']);
    expect(await second.query('SELECT state, invoice_count FROM pos_invoice_runs WHERE id = ?', [result.id])).toEqual([{ state: 'Created', invoice_count: 1 }]);
    expect(await second.query('SELECT state, invoice_id FROM pos_orders WHERE id = ?', ['pos-bulk-invoice-001'])).toEqual([{ state: 'Invoiced', invoice_id: result.id + '-invoice-1' }]);
    await secondDatabase.close();
  }, 30000);
});
