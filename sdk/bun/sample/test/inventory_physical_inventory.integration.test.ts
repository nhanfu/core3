import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (id: string) => yaml('api/physical-inventory.yaml').datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => yaml('pages/physical-inventory.yaml').actions.find((candidate: any) => candidate.id === id);

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
    expect(page.page.id).toBe('physical-inventory');
    expect(discovered.pages.get('physical-inventory')?.config.page.id).toBe('physical-inventory');
    expect(api.page.id).toBe('physical-inventory');
    expect(discovered.pageDatasources.get('physical-inventory')).toContain('inventory_physical_inventory');
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

    await db.executeMutation(applyAll.mutation, { inventory_adjustment_name: 'January cycle count', counting_date: '2026-01-15', current_user_name: 'Admin User' });
    row = (await db.query('SELECT quantity, counted_quantity, inventory_quantity_set, inventory_adjustment_name, counting_date FROM inventory_quants WHERE id = ?', ['quant-box-main']))[0] as any;
    expect(row).toMatchObject({ quantity: 20, counted_quantity: null, inventory_quantity_set: false, inventory_adjustment_name: 'January cycle count' });
    expect(String(row.counting_date).slice(0, 10)).toBe('2026-01-15');
  });
});
