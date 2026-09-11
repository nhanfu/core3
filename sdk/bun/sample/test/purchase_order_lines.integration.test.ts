import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);
const source = (file: string, id: string) => yaml(file).datasources.find((candidate: any) => candidate.id === id);

describe('Purchase order line editor parity', () => {
  test('binds the Odoo order form and x2many line surface through page-id API fragments', () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const lines = page.components.find((component: any) => component.type === 'LineItemGrid');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-detail', route: '/purchase/detail', auth: { require: ['purchase.read'] } });
    expect(api.page.id).toBe('purchase-detail');
    expect(discovered.pageDatasources.get('purchase-detail')).toEqual(expect.arrayContaining(['purchase_order_detail', 'purchase_order_lines']));
    expect(form.header_actions.map((entry: any) => entry.label)).toEqual(['Send RFQ', 'Confirm Order', 'Receive', 'Cancel']);
    expect(form.notebook.tabs.map((entry: any) => entry.label)).toEqual(['Products', 'Other Information']);
    expect(lines).toMatchObject({ type: 'LineItemGrid', source: 'purchase_order_lines', parent_source: 'purchase_order_detail', variant: 'odoo_x2many' });
    expect(lines.actions).toEqual([expect.objectContaining({ id: 'add_purchase_order_line', label: 'Add a product', permission: 'purchase.write' })]);
    expect(lines.columns.map((entry: any) => entry.label)).toEqual(['Product', 'Quantity', 'Unit', 'Unit Price', 'Taxes', 'Amount', '']);
    expect(lines.children.filter((entry: any) => entry.type === 'LineItemField').map((entry: any) => entry.label)).toEqual(['Product', 'Quantity', 'Unit', 'Unit Price', 'Taxes', 'Amount']);

    expect(source('api/purchase-detail.yaml', 'purchase_order_detail').permission).toBe('purchase.read');
    expect(source('api/purchase-detail.yaml', 'purchase_order_lines').permission).toBe('purchase.read');
    expect(source('api/purchase-detail.yaml', 'purchase_order_lines').error_states.transport_error).toMatchObject({ status: 503, code: 'PURCHASE_ORDER_LINES_UNAVAILABLE' });
    for (const id of ['add_purchase_order_line', 'edit_purchase_order_line', 'delete_purchase_order_line']) {
      expect(action('api/purchase-detail.yaml', id), id).toMatchObject({ permission: 'purchase.write', handler: 'line_item' });
    }
  });

  test('serves stable multi-line RFQ/PO fixtures without changing canonical list totals', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_order_lines_states_migrations', ['schema', 'data']);

    const detail = source('api/purchase-detail.yaml', 'purchase_order_detail');
    const lines = source('api/purchase-detail.yaml', 'purchase_order_lines');
    expect(await repository.querySource(detail, { id: 'po-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'po-demo-001', total_amount: 625, line_count: 2, state: 'Draft' } });
    expect((await repository.querySource(lines, { id: 'po-demo-001', fixture_state: null }, 0, 50)).data).toMatchObject([
      { id: 'purchase-line-demo-001-10', product_name: 'Packaging cartons', quantity: 400, line_total: 500, parent_state: 'Draft' },
      { id: 'purchase-line-demo-001-20', product_name: 'Packing labels', quantity: 10, line_total: 125, parent_state: 'Draft' },
    ]);
    expect((await repository.querySource(lines, { id: 'po-demo-005', fixture_state: null }, 0, 50)).data).toMatchObject([
      { id: 'purchase-line-demo-005-10', product_name: 'Warehouse barcode scanners', qty_received: 6, parent_state: 'Confirmed' },
    ]);
    expect((await repository.querySource(lines, { id: 'po-demo-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detail, { id: 'missing-order', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const orders = source('api/purchase-orders.yaml', 'purchase_orders');
    expect((await repository.querySource(orders, { q: null, state: null, vendor_id: null, fixture_state: null }, 0, 50)).data.map((row: any) => [row.id, row.total_amount])).toEqual([
      ['po-demo-005', 1350], ['po-demo-006', 3360], ['po-demo-007', 555], ['po-demo-003', 2220],
    ]);
    database.close();
  });

  test('supports guarded line CRUD, total recalculation, RFQ transitions, and stale boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_order_lines_crud_migrations', ['schema', 'data']);

    const create = action('api/purchase-detail.yaml', 'add_purchase_order_line');
    const edit = action('api/purchase-detail.yaml', 'edit_purchase_order_line');
    const remove = action('api/purchase-detail.yaml', 'delete_purchase_order_line');
    const added = await repository.executeMutation(create.mutation, {
      id: 'po-demo-001', parent_expected_row_version: 1,
      values: { product_name: 'Stretch wrap', description: 'Stretch wrap', quantity: 2, uom: 'Rolls', unit_price: 5, tax_rate: 0 },
    });
    expect(added).toMatchObject({ order_id: 'po-demo-001', product_name: 'Stretch wrap', quantity: 2, line_total: 10, row_version: 1 });
    expect(await repository.querySource(source('api/purchase-detail.yaml', 'purchase_order_detail'), { id: 'po-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { total_amount: 635, row_version: 2 } });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'po-demo-001', line_id: (added as any).id, parent_expected_row_version: 2, expected_row_version: 1,
      values: { product_name: 'Stretch wrap', description: 'Heavy duty stretch wrap', quantity: 3, uom: 'Rolls', unit_price: 6, tax_rate: 5 },
    });
    expect(updated).toMatchObject({ id: (added as any).id, description: 'Heavy duty stretch wrap', quantity: 3, line_total: 18.9, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'po-demo-001', line_id: (added as any).id, parent_expected_row_version: 3, expected_row_version: 1,
      values: { product_name: 'Stale', description: 'Stale', quantity: 1, uom: 'Units', unit_price: 1, tax_rate: 0 },
    })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_LINE_STALE' });

    await repository.executeMutation(remove.mutation, { id: 'po-demo-001', line_id: (added as any).id, parent_expected_row_version: 3, expected_row_version: 2 });
    expect(await repository.querySource(source('api/purchase-detail.yaml', 'purchase_order_detail'), { id: 'po-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { total_amount: 625, row_version: 4 } });
    await expect(repository.executeMutation(remove.mutation, { id: 'po-demo-001', line_id: (added as any).id, parent_expected_row_version: 4, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_LINE_STALE' });

    const workflow = yaml('pages/purchase-workflow.yaml').workflow;
    const send = workflow.transitions.find((entry: any) => entry.id === 'send');
    const confirm = workflow.transitions.find((entry: any) => entry.id === 'confirm');
    const sent = await repository.executeMutation(send.mutation, { id: 'po-demo-001', expected_row_version: 4 });
    expect(sent).toMatchObject({ id: 'po-demo-001', state: 'Sent', row_version: 5 });
    const confirmed = await repository.executeMutation(confirm.mutation, { id: 'po-demo-001', expected_row_version: 5 });
    expect(confirmed).toMatchObject({ id: 'po-demo-001', state: 'Confirmed', row_version: 6 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'po-demo-001', line_id: 'purchase-line-demo-001-10', parent_expected_row_version: 6, expected_row_version: 1,
      values: { product_name: 'Locked edit', description: 'Locked edit', quantity: 1, uom: 'Units', unit_price: 1, tax_rate: 0 },
    })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_ORDER_LINE_PARENT_STALE' });
    await expect(repository.executeMutation(send.mutation, { id: 'po-demo-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
