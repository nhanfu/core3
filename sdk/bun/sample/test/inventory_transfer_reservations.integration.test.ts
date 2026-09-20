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

describe('Inventory transfer reservation parity', () => {
  test('keeps the Odoo action_assign contract in the separate page/API layers', () => {
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(page.components.find((component: any) => component.type === 'LineItemGrid').columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'reserved_quantity', label: 'Reserved' }),
    ]));
    expect(action('check_inventory_transfer_availability')).toMatchObject({
      type: 'server', permission: 'inventory.write', action: 'inventory.pickings.check_availability', operation: 'check_availability',
    });
    expect(action('check_inventory_transfer_availability').mutation).toMatchObject({ concurrency: { required: true }, generated: ['message_id'] });
    expect(action('unreserve_inventory_transfer').mutation.steps.map((step: any) => step.query)).toEqual(expect.arrayContaining([
      expect.stringContaining('DELETE FROM inventory_transfer_reservations'),
      expect.stringContaining('reserved_quantity'),
    ]));
  });

  test('reserves matching company stock, records actor/timeline state, and unreserves it', async () => {
    const db = await repository('inventory_transfer_reservations_test');
    const check = action('check_inventory_transfer_availability');
    const unreserve = action('unreserve_inventory_transfer');
    const base = { id: 'delivery-reserve-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator' };

    const ready = await db.executeMutation(check.mutation, base) as any;
    expect(ready).toMatchObject({ id: 'delivery-reserve-0001', state: 'Ready', row_version: 2 });
    expect(await db.query('SELECT reserved_quantity, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ reserved_quantity: 7, row_version: 2 }]);
    expect(await db.query('SELECT picking_id, move_id, quant_id, quantity, company_name, reserved_by, state FROM inventory_transfer_reservations')).toEqual([{
      picking_id: 'delivery-reserve-0001', move_id: 'delivery-reserve-0001-move-001', quant_id: 'quant-box-main', quantity: 4, company_name: 'Core3 Demo Company', reserved_by: 'Inventory Operator', state: 'Reserved',
    }]);
    expect((await db.querySource(source('inventory_transfer_lines'), { id: 'delivery-reserve-0001', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ reserved_quantity: 4, availability: 'Available' });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-reserve-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ actor_name: 'Inventory Operator', action: 'inventory.transfer.availability_checked', action_label: 'Availability checked' }),
    ]));

    const waiting = await db.executeMutation(unreserve.mutation, { ...base, expected_row_version: 2 }) as any;
    expect(waiting).toMatchObject({ id: 'delivery-reserve-0001', state: 'Waiting', row_version: 3 });
    expect(await db.query('SELECT reserved_quantity, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ reserved_quantity: 3, row_version: 3 }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_reservations WHERE picking_id = ?', ['delivery-reserve-0001'])).toEqual([{ count: 0 }]);
  });

  test('rejects wrong company, stale rows, and unavailable stock without partial state', async () => {
    const db = await repository('inventory_transfer_reservation_guards_test');
    const check = action('check_inventory_transfer_availability');
    const base = { id: 'delivery-reserve-0001', expected_row_version: 1, current_user_name: 'Inventory Operator' };
    await expect(db.executeMutation(check.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(check.mutation, { ...base, current_company_name: 'Core3 Demo Company', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_CHECK_AVAILABILITY_NOT_ALLOWED' });
    await expect(db.executeMutation(check.mutation, { ...base, id: 'receipt-00004', current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_NOT_AVAILABLE' });
    expect(await db.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-reserve-0001'])).toEqual([{ state: 'Waiting', row_version: 1 }]);
    expect(await db.query('SELECT reserved_quantity, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ reserved_quantity: 3, row_version: 1 }]);
  });

  test('persists reservation state across restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-reservations-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_reservations_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action('check_inventory_transfer_availability').mutation, { id: 'delivery-reserve-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Restart Operator' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-reserve-0001'])).toEqual([{ state: 'Ready', row_version: 2 }]);
    expect(await secondRepository.query('SELECT quantity, reserved_by FROM inventory_transfer_reservations WHERE picking_id = ?', ['delivery-reserve-0001'])).toEqual([{ quantity: 4, reserved_by: 'Restart Operator' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_reservations_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], company_name: 'Core3 Demo Company', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-reservations-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.pickings.check_availability', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-reserve-0001', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.pickings.check_availability'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
