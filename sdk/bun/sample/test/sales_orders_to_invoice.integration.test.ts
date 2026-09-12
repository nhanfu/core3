import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'sales_orders_to_invoice_test', ['schema', 'data']);
  return { database, repository };
}

describe('Sales orders to invoice parity slice', () => {
  test('declares Odoo list action and permissioned bulk invoice creation', () => {
    const page = yaml('pages/sale-to-invoice.yaml');
    const api = yaml('api/sale-to-invoice.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_invoices_from_selected_orders');

    expect(page.page).toMatchObject({ id: 'sale-to-invoice', route: '/order/to-invoice' });
    expect(list).toMatchObject({ selectable: true, row_open_action: 'view_to_invoice_order' });
    expect(list.bulk_actions).toEqual([
      expect.objectContaining({ id: 'create_invoices_from_selected_orders', label: 'Create Invoices', permission: 'orders.write' }),
    ]);
    expect(action).toMatchObject({ type: 'server', permission: 'orders.write', operation: 'bulk_create' });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SALES_INVOICE_SELECTION_REQUIRED',
      'SALES_INVOICE_SELECTION_INVALID',
    ]);
  });

  test('creates draft invoices atomically and blocks duplicate creation', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/sale-to-invoice.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'sale_orders_to_invoice');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_invoices_from_selected_orders');
    const params = { q: null, view_scope: 'all', current_branch_id: 'branch-hcm' };

    const selectedIds = ['order-demo-06', 'order-demo-07'];
    expect((await repository.querySource(source, { ...params, q: 'DH-2026-0106' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'order-demo-06', invoice_status: 'To invoice' }),
    ]);
    expect((await repository.querySource(source, { ...params, q: 'DH-2026-0107' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'order-demo-07', invoice_status: 'To invoice' }),
    ]);
    expect(await repository.query("SELECT id FROM orders WHERE id IN (?, ?) AND status = 'Approved' ORDER BY id", selectedIds)).toEqual([
      { id: 'order-demo-06' },
      { id: 'order-demo-07' },
    ]);

    const created = await repository.executeMutation(action.mutation, { ...params, selectedIds });
    expect(Number(created.created_count)).toBe(2);
    expect(await repository.query('SELECT order_id, invoice_number, state, amount FROM sale_invoices WHERE order_id IN (?, ?) ORDER BY order_id', selectedIds)).toEqual([
      expect.objectContaining({ order_id: 'order-demo-06', invoice_number: 'INV/DH-2026-0106', state: 'Draft', amount: 9200000 }),
      expect.objectContaining({ order_id: 'order-demo-07', invoice_number: 'INV/DH-2026-0107', state: 'Draft', amount: 11800000 }),
    ]);
    expect((await repository.querySource(source, { ...params, q: 'DH-2026-0106' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'order-demo-06', invoice_status: 'To invoice' }),
    ]);
    expect((await repository.querySource(source, { ...params, q: 'DH-2026-0107' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'order-demo-07', invoice_status: 'To invoice' }),
    ]);
    await expect(repository.executeMutation(action.mutation, { ...params, selectedIds })).rejects.toMatchObject({ status: 409, code: 'SALES_INVOICE_SELECTION_INVALID' });

    await expect(repository.executeMutation(action.mutation, { ...params, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'SALES_INVOICE_SELECTION_REQUIRED' });
    await database.close();
  }, 30000);

  test('rejects mixed branch or already invoiced selections without partial writes', async () => {
    const { database, repository } = await repositoryForTest();
    const action = yaml('api/sale-to-invoice.yaml').actions.find((candidate: any) => candidate.id === 'create_invoices_from_selected_orders');
    const params = { view_scope: 'branch', current_branch_id: 'branch-hcm', selectedIds: ['order-demo-06', 'order-demo-02'] };

    await expect(repository.executeMutation(action.mutation, params)).rejects.toMatchObject({ status: 409, code: 'SALES_INVOICE_SELECTION_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM sale_invoices WHERE order_id IN ('order-demo-06', 'order-demo-02')")).toEqual([{ count: 0 }]);

    await expect(repository.executeMutation(action.mutation, { view_scope: 'all', current_branch_id: 'branch-hcm', selectedIds: ['order-demo-03'] })).rejects.toMatchObject({ status: 409, code: 'SALES_INVOICE_SELECTION_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM sale_invoices WHERE order_id = 'order-demo-03'")).toEqual([{ count: 1 }]);
    await database.close();
  }, 30000);
});
