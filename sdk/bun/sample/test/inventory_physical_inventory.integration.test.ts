import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (id: string) => yaml('api/physical-inventory.yaml').datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => yaml('api/physical-inventory.yaml').actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory physical inventory parity', () => {
  test('keeps the list layout, API fragment, manifest menu, and permissions aligned', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/physical-inventory.yaml');
    const api = yaml('api/physical-inventory.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('physical-inventory');
    expect(discovered.pages.get('physical-inventory')?.config.page.id).toBe('physical-inventory');
    expect(api.page.id).toBe('physical-inventory');
    expect(api.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'apply_all_inventory_quantities', type: 'server_form', permission: 'inventory.write' })]));
    expect(discovered.pageDatasources.get('physical-inventory')).toContain('inventory_physical_inventory');
    expect(discovered.pageDatasources.get('physical-inventory')).toContain('inventory_adjustment_runs');
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Product', 'Lot/Serial Number', 'Scheduled', 'User', 'On Hand', 'Counted', 'Difference', 'Unit', 'Actions',
    ]);
    expect(list.header_actions.map((action: any) => action.label)).toEqual(['Apply All']);
    expect(action('set_inventory_quantity').permission).toBe('inventory.write');
    expect(action('set_inventory_quantity_zero').permission).toBe('inventory.manage');
    expect(action('apply_inventory_quantity').permission).toBe('inventory.write');
    expect(action('clear_inventory_quantity').permission).toBe('inventory.manage');
    expect(list.filters[0].options.map((option: any) => option.label)).toEqual([
      'My Counts', 'Internal Locations', 'Transit Locations', 'To Count', 'To Apply', 'Conflicts', 'Negative Stock',
    ]);
    expect(yaml('manifest.yaml').menu.groups[0].items.map((item: any) => item.label)).toEqual(['Receipts', 'Deliveries', 'Internal', 'Physical Inventory']);
    expect(yaml('permissions.yaml').permissions).toEqual(['inventory.read', 'inventory.write', 'inventory.manage', 'inventory.tracking', 'inventory.multi_location']);
  });

  test('returns stable physical inventory fixtures and explicit empty/error states', async () => {
    const db = await repository('inventory_physical_fixture_test');
    const physical = source('inventory_physical_inventory');
    const params = { q: null, count_filter: null, fixture_state: null, current_user_name: 'Admin User' };

    const initial = await db.querySource(physical, params, 0, 50);
    expect(initial.data).toHaveLength(9);
    expect(initial.data.map((row: any) => row.id)).toEqual([
      'quant-pallet-main', 'quant-cabinet-main', 'quant-box-main', 'quant-cable-lot-a', 'quant-cable-lot-b',
      'quant-desk-main', 'quant-drawer-lot', 'quant-negative-transit', 'quant-chair-transit',
    ]);
    expect(initial.data.find((row: any) => row.id === 'quant-box-main')).toMatchObject({ counted: 20, difference: 2, inventory_quantity_set: true });
    expect(await db.query('SELECT id, inventory_adjustment_name, quant_count, applied_count FROM inventory_adjustments')).toEqual([{ id: 'inventory-adjustment-0001', inventory_adjustment_name: 'Opening cycle count', quant_count: 1, applied_count: 1 }]);
    expect((await db.querySource(source('inventory_adjustment_runs'), {}, 0, 10)).data[0]).toMatchObject({ id: 'inventory-adjustment-0001', inventory_adjustment_name: 'Opening cycle count' });
    expect((await db.querySource(physical, { ...params, q: 'CM-BOX-00002' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['quant-cable-lot-b']);
    expect((await db.querySource(physical, { ...params, count_filter: 'to_apply' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['quant-box-main']);
    expect((await db.querySource(physical, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(db.querySource(physical, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PHYSICAL_DATA_UNAVAILABLE' });
  });

  test('guards counts, applies deterministic updates, and rejects stale writes', async () => {
    const db = await repository('inventory_physical_mutation_test');
    const setZero = action('set_inventory_quantity_zero');
    const apply = action('apply_inventory_quantity');
    const applyAll = action('apply_all_inventory_quantities');

    await expect(db.executeMutation(setZero.mutation, { id: 'quant-desk-main', expected_row_version: 99, current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 409 });
    await db.executeMutation(setZero.mutation, { id: 'quant-desk-main', expected_row_version: 1, current_user_name: 'Admin User' });
    let row = (await db.query('SELECT quantity, counted_quantity, inventory_quantity_set, inventory_user, row_version FROM inventory_quants WHERE id = ?', ['quant-desk-main']))[0] as any;
    expect(row).toMatchObject({ quantity: 235, counted_quantity: 0, inventory_quantity_set: true, inventory_user: 'Admin User', row_version: 2 });

    await db.executeMutation(apply.mutation, { id: 'quant-desk-main', expected_row_version: 2, current_user_name: 'Admin User' });
    row = (await db.query('SELECT quantity, counted_quantity, inventory_quantity_set, inventory_user, row_version FROM inventory_quants WHERE id = ?', ['quant-desk-main']))[0] as any;
    expect(row).toMatchObject({ quantity: 0, counted_quantity: null, inventory_quantity_set: false, inventory_user: null, row_version: 3 });

    const applied = await db.executeMutation(applyAll.mutation, { inventory_adjustment_name: 'January cycle count', counting_date: '2026-01-15', current_user_name: 'Admin User' });
    expect(applied).toMatchObject({ id: 'inventory-adjustment-000002', message: 'January cycle count', quant_count: 1, applied_count: 1 });
    row = (await db.query('SELECT quantity, counted_quantity, inventory_quantity_set, inventory_adjustment_name, counting_date FROM inventory_quants WHERE id = ?', ['quant-box-main']))[0] as any;
    expect(row).toMatchObject({ quantity: 20, counted_quantity: null, inventory_quantity_set: false, inventory_adjustment_name: 'January cycle count' });
    expect(String(row.counting_date).slice(0, 10)).toBe('2026-01-15');
    expect(await db.query("SELECT reference, quantity, state, origin FROM inventory_move_lines WHERE reference = 'January cycle count'")).toEqual([{ reference: 'January cycle count', quantity: 2, state: 'Done', origin: 'January cycle count' }]);
    await expect(db.executeMutation(applyAll.mutation, { inventory_adjustment_name: 'No counts', counting_date: '2026-01-15', current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ADJUSTMENT_EMPTY' });
    await expect(db.executeMutation(applyAll.mutation, { inventory_adjustment_name: '', counting_date: 'bad-date', current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_ADJUSTMENT_INVALID' });

    const databasePath = `/tmp/core3-inventory-physical-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_physical_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action('set_inventory_quantity_zero').mutation, { id: 'quant-desk-main', expected_row_version: 1, current_user_name: 'Admin User' });
    await firstRepository.executeMutation(applyAll.mutation, { inventory_adjustment_name: 'Restart count', counting_date: '2026-01-16', current_user_name: 'Admin User' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT inventory_adjustment_name, applied_count FROM inventory_adjustments WHERE id = ?', ['inventory-adjustment-000002'])).toEqual([{ inventory_adjustment_name: 'Restart count', applied_count: 2 }]);
    expect(await secondRepository.query('SELECT quantity, inventory_quantity_set FROM inventory_quants WHERE id = ?', ['quant-desk-main'])).toEqual([{ quantity: 0, inventory_quantity_set: false }]);
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces read/write boundaries for the page and Apply All action at runtime', async () => {
    const db = await repository('inventory_physical_permission_test');
    const page = yaml('pages/physical-inventory.yaml');
    const apiConfig = yaml('api/physical-inventory.yaml');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: db,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(apiConfig.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([[page.page.id, apiConfig.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([[page.page.id, { ...page, actions: apiConfig.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-physical-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/pages/physical-inventory'), new URL('http://inventory.test/api/pages/physical-inventory'))).resolves.toBeDefined();
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.apply_all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: {} }) }), new URL('http://inventory.test/api/actions/inventory.quants.apply_all'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
