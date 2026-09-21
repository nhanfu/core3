import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/transfer-detail.yaml');
const api = yaml('api/transfer-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory completed transfer return parity', () => {
  test('keeps the Odoo Return action in the separate page/API contracts', () => {
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(page.components.find((component: any) => component.type === 'OdooFormView').header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'return_inventory_transfer', label: 'Return', permission: 'inventory.write' }),
    ]));
    expect(action('return_inventory_transfer')).toMatchObject({
      type: 'server_form', permission: 'inventory.write', action: 'stock.picking.return', operation: 'return',
    });
    expect(action('return_inventory_transfer').mutation).toMatchObject({ concurrency: { required: true }, generated: ['return_id', 'return_move_id', 'return_run_id', 'message_id'] });
    expect(source('inventory_transfer_returns')).toMatchObject({ single: false, permission: 'inventory.read' });
  });

  test('creates a durable reverse transfer with actor, company, reason, and timeline state', async () => {
    const db = await repository('inventory_transfer_returns_create_test');
    const values = { id: 'delivery-return-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', return_quantity: 2, reason: 'Customer changed order' };
    const created = await db.executeMutation(action('return_inventory_transfer').mutation, values) as any;
    expect(created).toMatchObject({ id: 'return-run-delivery-return-0001-1', source_picking_id: 'delivery-return-0001', return_picking_id: 'return-delivery-return-0001-1', return_quantity: 2, returned_by: 'Inventory Operator', reason: 'Customer changed order', state: 'Waiting', row_version: 1 });
    expect(await db.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-return-0001'])).toEqual([{ state: 'Done', row_version: 2 }]);
    expect(await db.query('SELECT name, source_location_id, destination_location_id, state FROM inventory_pickings WHERE id = ?', ['return-delivery-return-0001-1'])).toEqual([{ name: 'RET/WH/OUT/RETURN/0001/return-delivery-return-0001-1', source_location_id: 'location-customer', destination_location_id: 'location-stock', state: 'Waiting' }]);
    expect(await db.query('SELECT product_name, quantity, done_quantity FROM inventory_picking_moves WHERE id = ?', ['return-move-delivery-return-0001-1'])).toEqual([{ product_name: '[E-COM08] Storage Box', quantity: 2, done_quantity: 0 }]);
    expect((await db.querySource(source('inventory_transfer_returns'), { id: 'delivery-return-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ return_name: 'RET/WH/OUT/RETURN/0001/return-delivery-return-0001-1', return_quantity: 2, returned_by: 'Inventory Operator' });
    expect((await db.querySource(source('inventory_transfer_detail'), { id: 'delivery-return-0001', fixture_state: null }, 0, 1)).data).toMatchObject({ return_count: 1, row_version: 2 });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-return-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ actor_name: 'Inventory Operator', action: 'inventory.transfer.return_created', action_label: 'Return created' }),
    ]));
  });

  test('rejects wrong company, missing actor, stale rows, unsupported lines, and excess quantity without partial state', async () => {
    const db = await repository('inventory_transfer_returns_guards_test');
    const mutation = action('return_inventory_transfer').mutation;
    const base = { id: 'delivery-return-0001', expected_row_version: 1, current_user_name: 'Inventory Operator', return_quantity: 2 };
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_RETURN_NOT_ALLOWED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', return_quantity: 5 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_RETURN_QUANTITY_INVALID' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_returns')).toEqual([{ count: 0 }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_pickings WHERE id LIKE ?', ['return-delivery-return-0001-%'])).toEqual([{ count: 0 }]);
  });

  test('persists returns across restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-returns-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_returns_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action('return_inventory_transfer').mutation, { id: 'delivery-return-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Restart Operator', return_quantity: 1, reason: 'Restart proof' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT return_quantity, returned_by, reason FROM inventory_transfer_returns WHERE source_picking_id = ?', ['delivery-return-0001'])).toEqual([{ return_quantity: 1, returned_by: 'Restart Operator', reason: 'Restart proof' }]);
    expect(await secondRepository.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-return-0001'])).toEqual([{ state: 'Done', row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_returns_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], company_name: 'Core3 Demo Company', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-returns-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.return', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-return-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Reader', return_quantity: 1 } }) }), new URL('http://inventory.test/api/actions/stock.picking.return'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
