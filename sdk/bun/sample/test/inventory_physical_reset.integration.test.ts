import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/physical-inventory.yaml');
const api = yaml('api/physical-inventory.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'reset_inventory_counts');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory physical inventory reset parity', () => {
  test('keeps the Odoo warning action separate from the row-level clear action', () => {
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list.bulk_actions).toEqual([
      { id: 'reset_inventory_counts', label: 'Clear', permission: 'inventory.manage' },
      { id: 'request_inventory_count', label: 'Request a Count', permission: 'inventory.manage' },
      { id: 'resolve_inventory_conflict', label: 'Resolve Conflict', permission: 'inventory.write' },
    ]);
    expect(api.page.id).toBe('physical-inventory');
    expect(api.datasources.map((source: any) => source.id)).toContain('inventory_reset_runs');
    expect(action).toMatchObject({ type: 'server', permission: 'inventory.manage', action: 'inventory.quants.reset' });
    expect(action.confirm).toContain('discard all unapplied counts');
    expect(action.mutation.steps[0].for_each.input).toBe('selectedIds');
  });

  test('clears selected quantities atomically and records a durable reset run', async () => {
    const db = await repository('inventory_physical_reset_test');
    const result = await db.executeMutation(action.mutation, {
      selectedIds: ['quant-box-main', 'quant-desk-main'],
      current_company_name: 'Core3 Demo Company',
      current_user_name: 'Mitchell Admin',
    });
    expect(result).toMatchObject({ id: 'inventory-reset-0002', reset_count: 2, requested_by: 'Mitchell Admin' });
    expect(await db.query('SELECT counted_quantity, inventory_quantity_set, inventory_user, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([
      { counted_quantity: null, inventory_quantity_set: false, inventory_user: null, row_version: 2 },
    ]);
    expect(await db.query('SELECT counted_quantity, inventory_quantity_set, row_version FROM inventory_quants WHERE id = ?', ['quant-desk-main'])).toEqual([
      { counted_quantity: null, inventory_quantity_set: false, row_version: 2 },
    ]);
    expect(await db.query('SELECT quant_id, row_version FROM inventory_count_reset_lines WHERE reset_id = ? ORDER BY quant_id', ['inventory-reset-0002'])).toEqual([
      { quant_id: 'quant-box-main', row_version: 1 },
      { quant_id: 'quant-desk-main', row_version: 1 },
    ]);
    expect((await db.querySource(api.datasources.find((source: any) => source.id === 'inventory_reset_runs'), {}, 0, 10)).data[0]).toMatchObject({ id: 'inventory-reset-0002', reset_count: 2 });
  });

  test('rejects cross-company, stale, and invalid selections without partial reset', async () => {
    const db = await repository('inventory_physical_reset_guards_test');
    await expect(db.executeMutation(action.mutation, { selectedIds: ['quant-box-main'], current_company_name: 'Other Company', current_user_name: 'Other User' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_RESET_COMPANY_FORBIDDEN' });
    await expect(db.executeMutation(action.mutation, { selectedIds: ['quant-box-main'], expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RESET_STALE' });
    await expect(db.executeMutation(action.mutation, { selectedIds: ['quant-box-main', 'missing-quant'], current_company_name: 'Core3 Demo Company', current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RESET_STALE' });
    expect(await db.query('SELECT counted_quantity, inventory_quantity_set, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([
      { counted_quantity: 20, inventory_quantity_set: true, row_version: 1 },
    ]);
  });

  test('preserves reset state through a file-backed restart and enforces manager permission', async () => {
    const databasePath = `/tmp/core3-inventory-physical-reset-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_physical_reset_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { selectedIds: ['quant-drawer-lot'], current_company_name: 'Core3 Demo Company', current_user_name: 'Mitchell Admin' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT counted_quantity, inventory_quantity_set, row_version FROM inventory_quants WHERE id = ?', ['quant-drawer-lot'])).toEqual([
      { counted_quantity: null, inventory_quantity_set: false, row_version: 2 },
    ]);
    expect(await secondRepository.query('SELECT reset_count, requested_by FROM inventory_count_resets WHERE id = ?', ['inventory-reset-0002'])).toEqual([
      { reset_count: 1, requested_by: 'Mitchell Admin' },
    ]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_physical_reset_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['physical-inventory', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['physical-inventory', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-physical-reset-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selectedIds: ['quant-box-main'] }) }), new URL('http://inventory.test/api/actions/inventory.quants.reset'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
  });
});
