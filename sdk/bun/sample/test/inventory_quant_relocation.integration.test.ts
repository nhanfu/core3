import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/stock.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'relocate_inventory_quant');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory quant relocation parity', () => {
  test('keeps the On Hand page/API split and Odoo relocation contract', () => {
    const page = yaml('pages/stock.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('stock');
    expect(page.components[0].source).toBe('inventory_stock');
    expect(page.components[0].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'relocate_inventory_quant' }));
    expect(api.page.id).toBe('stock');
    expect(api.datasources.map((source: any) => source.id)).toEqual(['inventory_stock_locations', 'inventory_stock', 'inventory_quant_relocations']);
    expect(action.permission).toBe('inventory.manage');
    expect(action.fields.map((field: any) => field.label)).toEqual(['To Location', 'Reason for relocation']);
    expect(yaml('manifest.yaml').menu.stock.path).toBe('/stock');
  });

  test('relocates positive stock, writes durable history, and rejects invalid destinations', async () => {
    const db = await repository('inventory_quant_relocation_test');
    const stock = api.datasources.find((source: any) => source.id === 'inventory_stock');
    const before = await db.querySource(stock, { q: 'Cable Management Box' }, 0, 20);
    expect(before.data.find((row: any) => row.id === 'quant-cable-lot-a')).toMatchObject({ location_name: 'Stock', quantity: 50 });
    const result = await db.executeMutation(action.mutation, { id: 'quant-cable-lot-a', expected_row_version: 1, location_id: 'location-stock-shelf-1', message: 'Replenishment shelf', current_user_name: 'Mitchell Admin' });
    expect(result).toMatchObject({ id: 'inventory-relocation-0002', source_location: 'Stock', destination_location: 'Shelf 1', quantity: 50, message: 'Replenishment shelf' });
    expect(await db.query('SELECT location_id, row_version FROM inventory_quants WHERE id = ?', ['quant-cable-lot-a'])).toEqual([{ location_id: 'location-stock-shelf-1', row_version: 2 }]);
    expect(await db.query("SELECT reference, source_location_id, destination_location_id, quantity, done_by, origin FROM inventory_move_lines WHERE id = 'inventory-relocation-0002-move'")).toEqual([{ reference: 'Quantity Relocated', source_location_id: 'location-stock', destination_location_id: 'location-stock-shelf-1', quantity: 50, done_by: 'Mitchell Admin', origin: 'Replenishment shelf' }]);
    expect((await db.querySource(api.datasources.find((source: any) => source.id === 'inventory_quant_relocations'), {}, 0, 20)).data[0]).toMatchObject({ id: 'inventory-relocation-0002', destination_location: 'Shelf 1', lot_serial_number: 'CM-BOX-00001' });
    await expect(db.executeMutation(action.mutation, { id: 'quant-desk-main', expected_row_version: 1, location_id: 'location-customer', message: '', current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_RELOCATION_LOCATION_INVALID' });
    await expect(db.executeMutation(action.mutation, { id: 'quant-desk-main', expected_row_version: 1, location_id: 'location-stock', message: '', current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_RELOCATION_SAME_LOCATION' });
    await expect(db.executeMutation(action.mutation, { id: 'quant-desk-main', expected_row_version: 99, location_id: 'location-stock-shelf-2', message: '', current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_QUANT_RELOCATION_STALE' });
  });

  test('persists relocation through a database restart', async () => {
    const databasePath = `/tmp/core3-inventory-relocation-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_quant_relocation_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { id: 'quant-drawer-lot', expected_row_version: 1, location_id: 'location-stock-shelf-2', message: 'Restart proof', current_user_name: 'Mitchell Admin' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT location_id, row_version FROM inventory_quants WHERE id = ?', ['quant-drawer-lot'])).toEqual([{ location_id: 'location-stock-shelf-2', row_version: 2 }]);
    expect(await secondRepository.query('SELECT message, relocated_by FROM inventory_quant_relocations WHERE quant_id = ?', ['quant-drawer-lot'])).toEqual([{ message: 'Restart proof', relocated_by: 'Mitchell Admin' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces the manager-only relocation boundary at runtime', async () => {
    const db = await repository('inventory_quant_relocation_permission_test');
    const page = yaml('pages/stock.yaml');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: db,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['stock', ['inventory_stock', 'inventory_stock_locations', 'inventory_quant_relocations']]]),
      pages: new Map([['stock', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-relocation-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/pages/stock'), new URL('http://inventory.test/api/pages/stock'))).resolves.toBeDefined();
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.relocate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'quant-cable-lot-a', expected_row_version: 1, location_id: 'location-stock-shelf-1' } }) }), new URL('http://inventory.test/api/actions/inventory.quants.relocate'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
  });
});
