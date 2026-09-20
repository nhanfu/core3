import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/stock-locations.yaml');
const page = yaml('pages/stock-locations.yaml');
const stockApi = yaml('api/stock-report.yaml');
const stockPage = yaml('pages/stock-report.yaml');
const context = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_locations_context');
const lines = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_locations_lines');
const runs = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_locations_runs');
const action = api.actions.find((candidate: any) => candidate.id === 'record_inventory_stock_locations');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory Stock Locations parity', () => {
  test('maps the Odoo Locations row action to a separate page/API contract', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const locationsRowAction = stockApi.actions.find((candidate: any) => candidate.id === 'view_inventory_stock_locations');
    const list = page.components[1];
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'stock-locations', route: '/stock-report/locations', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'stock-locations' });
    expect(discovered.pageDatasources.get('stock-locations')).toEqual(expect.arrayContaining([
      'inventory_stock_locations_context', 'inventory_stock_locations_lines', 'inventory_stock_locations_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock-report/locations', page: 'stock-locations', module: 'inventory' });
    expect(locationsRowAction).toMatchObject({ type: 'navigate', permission: 'inventory.read', navigate_to: '/stock-report/locations', params: { product_id: '{row.id}' } });
    expect(stockPage.components[1].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_stock_locations', label: 'Locations' }));
    expect(list.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'refresh_inventory_stock_locations', permission: 'inventory.read' }),
      expect.objectContaining({ id: 'back_to_inventory_stock_report_from_locations', permission: 'inventory.read' }),
    ]));
    expect(action).toMatchObject({ action: 'inventory.stock.locations', handler: 'yaml_mutation', operation: 'report' });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_STOCK_LOCATIONS_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_STOCK_LOCATIONS_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_STOCK_LOCATIONS_ACTOR_REQUIRED' }),
    ]));
  });

  test('returns deterministic company-scoped product locations and history', async () => {
    const db = await repository('inventory_stock_locations_fixture');
    const params = { product_id: 'stock-report-cabinet', current_company_name: 'Core3 Demo Company', q: null };
    expect(await db.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'stock-report-cabinet', product_name: '[E-COM07] Large Cabinet', on_hand: 500, location_count: 1 } });
    expect((await db.querySource(lines, params, 0, 50)).data).toMatchObject([{ id: 'quant-cabinet-main', location_name: 'Stock', warehouse_name: 'Main Warehouse', quantity: 33, reserved_quantity: 0, available_quantity: 33, stock_value: 9900 }]);
    expect((await db.querySource(runs, params, 0, 50)).data).toMatchObject([{ id: 'stock-locations-run-0001', line_count: 1, requested_by: 'Seeded Inventory' }]);
    expect((await db.querySource(lines, { ...params, q: 'missing-shelf' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(lines, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(context, { ...params, current_company_name: 'My Company (San Francisco)' }, 0, 1)).data).toEqual({});
  });

  test('records a durable location report with actor/company/row-version guards', async () => {
    const db = await repository('inventory_stock_locations_mutation');
    const base = { product_id: 'stock-report-cabinet', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };
    expect(await db.executeMutation(action.mutation, base)).toMatchObject({ id: 'stock-locations-stock-report-cabinet-2', product_id: 'stock-report-cabinet', line_count: 1, requested_by: 'Admin User' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_stock_location_runs WHERE product_id = ?', ['stock-report-cabinet'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_STOCK_LOCATIONS_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_STOCK_LOCATIONS_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_STOCK_LOCATIONS_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, product_id: 'stock-report-desk-white' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_STOCK_LOCATIONS_EMPTY' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_stock_location_runs WHERE product_id = ?', ['stock-report-desk-white'])).toEqual([{ count: 0 }]);
  });

  test('survives restart and denies readers without inventory.read', async () => {
    const databasePath = `/tmp/core3-inventory-stock-locations-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_stock_locations_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action.mutation, { product_id: 'stock-report-cabinet', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, line_count FROM inventory_stock_location_runs WHERE id = ?', ['stock-locations-stock-report-cabinet-2'])).toEqual([{ requested_by: 'Restart Operator', line_count: 1 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: [] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['stock-locations', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['stock-locations', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.stock.locations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { product_id: 'stock-report-cabinet', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.stock.locations'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
