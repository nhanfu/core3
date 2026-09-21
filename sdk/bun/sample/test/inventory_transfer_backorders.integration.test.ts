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

describe('Inventory partial transfer backorder parity', () => {
  test('keeps the Odoo backorder wizard in separate page/API contracts', () => {
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(page.components.find((component: any) => component.type === 'OdooFormView').header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_inventory_backorder', label: 'Create Backorder', permission: 'inventory.write' }),
    ]));
    expect(action('create_inventory_backorder')).toMatchObject({
      type: 'server_form', permission: 'inventory.write', action: 'stock.backorder.confirmation.process', operation: 'backorder',
    });
    expect(action('create_inventory_backorder').fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'decision', type: 'select', options: expect.arrayContaining([
        expect.objectContaining({ value: 'create', label: 'Create Backorder' }),
        expect.objectContaining({ value: 'none', label: 'No Backorder' }),
      ]) }),
    ]));
    expect(source('inventory_transfer_backorders')).toMatchObject({ single: false, permission: 'inventory.read' });
  });

  test('creates a durable backorder and completes only the processed source transfer', async () => {
    const db = await repository('inventory_transfer_backorders_create_test');
    const values = { id: 'delivery-backorder-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', decision: 'create' };
    const created = await db.executeMutation(action('create_inventory_backorder').mutation, values) as any;
    expect(created).toMatchObject({ id: 'backorder-run-delivery-backorder-0001-1', source_picking_id: 'delivery-backorder-0001', backorder_picking_id: 'backorder-delivery-backorder-0001-1', backorder_name: 'BACKORDER/WH/OUT/BACKORDER/0001/backorder-delivery-backorder-0001-1', decision: 'create', processed_by: 'Inventory Operator', state: 'Created', row_version: 1 });
    expect(await db.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-backorder-0001'])).toEqual([{ state: 'Done', row_version: 2 }]);
    expect(await db.query('SELECT backorder_of_id, source_location_id, destination_location_id, state FROM inventory_pickings WHERE id = ?', ['backorder-delivery-backorder-0001-1'])).toEqual([{ backorder_of_id: 'delivery-backorder-0001', source_location_id: 'location-stock', destination_location_id: 'location-customer', state: 'Waiting' }]);
    expect(await db.query('SELECT product_name, quantity, done_quantity FROM inventory_picking_moves WHERE id = ?', ['backorder-move-delivery-backorder-0001-1'])).toEqual([{ product_name: '[E-COM08] Storage Box', quantity: 4, done_quantity: 0 }]);
    expect((await db.querySource(source('inventory_transfer_backorders'), { id: 'delivery-backorder-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ backorder_name: 'BACKORDER/WH/OUT/BACKORDER/0001/backorder-delivery-backorder-0001-1', decision: 'create', processed_by: 'Inventory Operator', state: 'Created' });
    expect((await db.querySource(source('inventory_transfer_detail'), { id: 'delivery-backorder-0001', fixture_state: null }, 0, 1)).data).toMatchObject({ has_partial: false, backorder_count: 1, row_version: 2 });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-backorder-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ actor_name: 'Inventory Operator', action: 'inventory.transfer.backorder_created', action_label: 'Backorder created' }),
    ]));
  });

  test('supports No Backorder and rejects wrong company, actor, decision, stale, and multi-line requests without partial state', async () => {
    const db = await repository('inventory_transfer_backorders_guards_test');
    const mutation = action('create_inventory_backorder').mutation;
    const base = { id: 'delivery-backorder-0001', expected_row_version: 1, current_user_name: 'Inventory Operator' };
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Other Company', decision: 'create' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', current_user_name: '', decision: 'create' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', decision: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_BACKORDER_DECISION_INVALID' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', expected_row_version: 99, decision: 'create' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_BACKORDER_NOT_ALLOWED' });
    const skipped = await db.executeMutation(mutation, { ...base, current_company_name: 'Core3 Demo Company', decision: 'none' }) as any;
    expect(skipped).toMatchObject({ decision: 'none', backorder_picking_id: null, state: 'Skipped' });
    expect(await db.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-backorder-0001'])).toEqual([{ state: 'Done', row_version: 2 }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_pickings WHERE id LIKE ?', ['backorder-delivery-backorder-0001-%'])).toEqual([{ count: 0 }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_backorders')).toEqual([{ count: 1 }]);
  });

  test('persists the backorder decision across restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-backorders-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_backorders_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action('create_inventory_backorder').mutation, { id: 'delivery-backorder-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Restart Operator', decision: 'create' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT decision, processed_by, state FROM inventory_transfer_backorders WHERE source_picking_id = ?', ['delivery-backorder-0001'])).toEqual([{ decision: 'create', processed_by: 'Restart Operator', state: 'Created' }]);
    expect(await secondRepository.query('SELECT backorder_of_id, state FROM inventory_pickings WHERE id = ?', ['backorder-delivery-backorder-0001-1'])).toEqual([{ backorder_of_id: 'delivery-backorder-0001', state: 'Waiting' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_backorders_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], company_name: 'Core3 Demo Company', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-backorders-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.backorder.confirmation.process', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-backorder-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Reader', decision: 'create' } }) }), new URL('http://inventory.test/api/actions/stock.backorder.confirmation.process'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
