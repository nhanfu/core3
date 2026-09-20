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

describe('Inventory transfer lock parity', () => {
  test('keeps the Odoo manager Lock/Unlock action in separate page/API contracts', () => {
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(page.components.find((component: any) => component.type === 'OdooFormView').header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'toggle_inventory_transfer_lock', label: 'Lock / Unlock', permission: 'inventory.manage' }),
    ]));
    expect(action('toggle_inventory_transfer_lock')).toMatchObject({
      type: 'server', permission: 'inventory.manage', action: 'stock.picking.action_toggle_is_locked', operation: 'toggle_lock',
    });
    expect(source('inventory_transfer_detail').query).toContain('p.is_locked');
  });

  test('toggles the durable lock state, records actor/timeline state, and toggles back', async () => {
    const db = await repository('inventory_transfer_locks_create_test');
    const mutation = action('toggle_inventory_transfer_lock').mutation;
    const base = { id: 'receipt-00001', expected_row_version: 1, current_company_name: 'My Company', current_user_name: 'Inventory Manager' };
    const unlocked = await db.executeMutation(mutation, base) as any;
    expect(unlocked).toMatchObject({ id: 'receipt-00001', is_locked: false, state: 'Ready', row_version: 2 });
    expect((await db.querySource(source('inventory_transfer_detail'), { id: 'receipt-00001', fixture_state: null }, 0, 1)).data).toMatchObject({ is_locked: false, row_version: 2 });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'receipt-00001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ actor_name: 'Inventory Manager', action: 'inventory.transfer.lock_toggled', action_label: 'Unlocked', detail: 'Transfer unlocked for editing' }),
    ]));
    const locked = await db.executeMutation(mutation, { ...base, expected_row_version: 2 }) as any;
    expect(locked).toMatchObject({ id: 'receipt-00001', is_locked: true, state: 'Ready', row_version: 3 });
  });

  test('rejects wrong company, missing actor, stale, and cancelled rows without partial state', async () => {
    const db = await repository('inventory_transfer_locks_guards_test');
    const mutation = action('toggle_inventory_transfer_lock').mutation;
    const base = { id: 'receipt-00001', expected_row_version: 1, current_user_name: 'Inventory Manager' };
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'My Company', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'My Company', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_LOCK_NOT_ALLOWED' });
    await db.run('UPDATE inventory_pickings SET state = \'Cancelled\' WHERE id = ?', ['receipt-00004']);
    await expect(db.executeMutation(mutation, { ...base, id: 'receipt-00004', current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_LOCK_NOT_ALLOWED' });
    expect(await db.query('SELECT is_locked, row_version FROM inventory_pickings WHERE id = ?', ['receipt-00001'])).toEqual([{ is_locked: true, row_version: 1 }]);
  });

  test('persists lock state across restart and enforces inventory.manage', async () => {
    const databasePath = `/tmp/core3-inventory-locks-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_locks_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action('toggle_inventory_transfer_lock').mutation, { id: 'receipt-00001', expected_row_version: 1, current_company_name: 'My Company', current_user_name: 'Restart Manager' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT is_locked, row_version FROM inventory_pickings WHERE id = ?', ['receipt-00001'])).toEqual([{ is_locked: false, row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_locks_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], company_name: 'My Company', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-locks-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_toggle_is_locked', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'receipt-00001', expected_row_version: 1, current_company_name: 'My Company', current_user_name: 'Reader' } }) }), new URL('http://inventory.test/api/actions/stock.picking.action_toggle_is_locked'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
  });
});
