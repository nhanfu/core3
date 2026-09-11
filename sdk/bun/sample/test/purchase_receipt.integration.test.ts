import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = (id: string) => yaml('api/purchase-receipt.yaml').datasources.find((item: any) => item.id === id);
const action = (id: string) => yaml('api/purchase-receipt.yaml').actions.find((item: any) => item.id === id);

describe('Purchase receipt stat action parity', () => {
  test('keeps the action-only page/API boundary and Odoo form contract explicit', () => {
    const page = yaml('pages/purchase-receipt.yaml');
    const api = yaml('api/purchase-receipt.yaml');
    const form = page.components[0];
    const grid = page.components[1];
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'purchase-receipt', route: '/purchase/receipt', auth: { require: ['purchase.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'purchase-receipt' });
    expect(discovered.pageDatasources.get('purchase-receipt')).toEqual(expect.arrayContaining(['purchase_receipt_detail', 'purchase_receipt_lines', 'purchase_receipt_timeline']));
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'purchase_receipt_detail', title_field: 'name', subtitle_field: 'vendor_name', status_field: 'state' });
    expect(form.stat_buttons).toContainEqual(expect.objectContaining({ id: 'open_purchase_receipt_moves', label: 'Moves', value_field: 'move_count' }));
    expect(form.header_actions.map((item: any) => item.label)).toEqual(['Validate', 'Cancel']);
    expect(grid).toMatchObject({ type: 'LineItemGrid', source: 'purchase_receipt_lines', parent_source: 'purchase_receipt_detail', variant: 'odoo_x2many' });
    expect(grid.columns.map((item: any) => item.label)).toEqual(['Product', 'Demand', 'Quantity', 'Unit', '']);
    expect(action('validate_purchase_receipt')).toMatchObject({ permission: 'purchase.write', handler: 'yaml_mutation' });
    expect(action('add_purchase_receipt_line')).toMatchObject({ permission: 'purchase.write', handler: 'line_item', operation: 'create' });
    expect(action('edit_purchase_receipt_line')).toMatchObject({ permission: 'purchase.write', handler: 'line_item', operation: 'update' });
    expect(action('delete_purchase_receipt_line')).toMatchObject({ permission: 'purchase.write', handler: 'yaml_mutation', operation: 'delete' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write']));
  });

  test('serves the deterministic WH/IN/00006 receipt, lines, empty, and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_receipt_read_migrations', ['schema', 'data']);

    expect(await repository.querySource(source('purchase_receipt_detail'), { id: 'purchase-receipt-p00012', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'WH/IN/00006', vendor_name: 'Ready Mat', operation_type: 'YourCompany: Receipts', state: 'Ready', move_count: 2 } });
    expect((await repository.querySource(source('purchase_receipt_lines'), { id: 'purchase-receipt-p00012', fixture_state: null }, 0, 50)).data).toMatchObject([
      { product_name: '[FURN_6667] Acoustic Bloc Screens (Black)', demand: 20, quantity: 20, uom: 'Units' },
      { product_name: '[FURN_9001] Flipover', demand: 10, quantity: 10, uom: 'Units' },
    ]);
    expect((await repository.querySource(source('purchase_receipt_timeline'), { id: 'purchase-receipt-p00012', fixture_state: null }, 0, 50)).data).toMatchObject([{ action_label: 'Transfer created', detail: 'This transfer has been created from: P00012' }]);
    expect((await repository.querySource(source('purchase_receipt_lines'), { id: 'purchase-receipt-p00012', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source('purchase_receipt_detail'), { id: 'purchase-receipt-p00012', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_RECEIPT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces purchase write permission-ready line CRUD, stale guards, and receipt workflow', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_receipt_write_migrations', ['schema', 'data']);

    const create = action('add_purchase_receipt_line');
    const created = await repository.executeMutation(create.mutation, { id: 'purchase-receipt-p00012', parent_expected_row_version: 1, values: { product_name: 'Packing labels', description: 'Packing labels', demand: 10, quantity: 0, uom: 'Units' } });
    expect(created).toMatchObject({ receipt_id: 'purchase-receipt-p00012', product_name: 'Packing labels', row_version: 1 });
    const lineId = (created as any).id;

    const edit = action('edit_purchase_receipt_line');
    const edited = await repository.executeMutation(edit.mutation, { id: 'purchase-receipt-p00012', line_id: lineId, parent_expected_row_version: 2, expected_row_version: 1, values: { product_name: 'Packing labels', description: 'Packing labels - updated', demand: 12, quantity: 4, uom: 'Units' } });
    expect(edited).toMatchObject({ id: lineId, quantity: 4, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-receipt-p00012', line_id: lineId, parent_expected_row_version: 3, expected_row_version: 1, values: { product_name: 'Stale', description: 'Stale', demand: 1, quantity: 0, uom: 'Units' } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_RECEIPT_LINE_STALE' });

    const remove = action('delete_purchase_receipt_line');
    await repository.executeMutation(remove.mutation, { id: 'purchase-receipt-p00012', line_id: lineId, parent_expected_row_version: 3, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: 'purchase-receipt-p00012', line_id: lineId, parent_expected_row_version: 4, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_RECEIPT_LINE_STALE' });

    const validate = action('validate_purchase_receipt');
    const done = await repository.executeMutation(validate.mutation, { id: 'purchase-receipt-p00012', expected_row_version: 4, current_user_name: 'Core3 Administrator' });
    expect(done).toMatchObject({ id: 'purchase-receipt-p00012', state: 'Done', row_version: 5 });
    await expect(repository.executeMutation(validate.mutation, { id: 'purchase-receipt-p00012', expected_row_version: 5 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_RECEIPT_NOT_READY' });
    expect(action('validate_purchase_receipt').permission).toBe('purchase.write');
    expect(action('cancel_purchase_receipt').permission).toBe('purchase.write');
    expect(source('purchase_receipt_detail').permission).toBe('purchase.read');
    database.close();
  });
});
