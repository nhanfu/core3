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
const api = yaml('api/stock-forecast.yaml');
const page = yaml('pages/stock-forecast.yaml');
const stockApi = yaml('api/stock-report.yaml');
const stockPage = yaml('pages/stock-report.yaml');
const context = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_forecast_context');
const lines = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_forecast_lines');
const runs = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_forecast_runs');
const action = api.actions.find((candidate: any) => candidate.id === 'record_inventory_stock_forecast');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory Forecasted Report parity', () => {
  test('maps the Odoo View Availability action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const forecastRowAction = stockApi.actions.find((candidate: any) => candidate.id === 'view_inventory_stock_forecast');
    const list = page.components[1];
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'stock-forecast', route: '/stock-report/forecast', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'stock-forecast' });
    expect(discovered.pageDatasources.get('stock-forecast')).toEqual(expect.arrayContaining([
      'inventory_stock_forecast_context', 'inventory_stock_forecast_lines', 'inventory_stock_forecast_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock-report/forecast', page: 'stock-forecast', module: 'inventory' });
    expect(forecastRowAction).toMatchObject({ type: 'navigate', permission: 'inventory.read', navigate_to: '/stock-report/forecast', params: { product_id: '{row.id}' } });
    expect(stockPage.components[1].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_stock_forecast', label: 'Forecast' }));
    expect(list.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'refresh_inventory_stock_forecast', permission: 'inventory.read' }),
      expect.objectContaining({ id: 'back_to_inventory_stock_report', permission: 'inventory.read' }),
    ]));
    expect(action).toMatchObject({ action: 'inventory.stock.forecast', handler: 'yaml_mutation', operation: 'report' });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_STOCK_FORECAST_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_STOCK_FORECAST_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_STOCK_FORECAST_ACTOR_REQUIRED' }),
    ]));
  });

  test('returns deterministic forecast context, lines, and report history', async () => {
    const db = await repository('inventory_stock_forecast_fixture');
    const params = { product_id: 'stock-report-cabinet', current_company_name: 'Core3 Demo Company' };
    expect(await db.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'stock-report-cabinet', product_name: '[E-COM07] Large Cabinet', on_hand: 500, forecasted: 270 } });
    expect((await db.querySource(lines, params, 0, 50)).data).toMatchObject([
      { reference: 'Opening stock', balance_qty: 500, state: 'Done' },
      { reference: 'SO/FORECAST/0001', outgoing_qty: 230, balance_qty: 270 },
      { reference: 'PO/FORECAST/0001', incoming_qty: 120, balance_qty: 390 },
    ]);
    expect((await db.querySource(runs, params, 0, 50)).data).toMatchObject([{ id: 'stock-forecast-run-0001', line_count: 3, requested_by: 'Seeded Inventory' }]);
    expect((await db.querySource(lines, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(context, { ...params, current_company_name: 'My Company (San Francisco)' }, 0, 1)).data).toEqual({});
  });

  test('records a durable forecast request with actor, company, and row-version guards', async () => {
    const db = await repository('inventory_stock_forecast_mutation');
    const base = { product_id: 'stock-report-cabinet', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };
    expect(await db.executeMutation(action.mutation, base)).toMatchObject({ id: 'stock-forecast-stock-report-cabinet-2', product_id: 'stock-report-cabinet', line_count: 3, requested_by: 'Admin User' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_stock_forecast_runs WHERE product_id = ?', ['stock-report-cabinet'])).toEqual([{ count: 2 }]);
    expect(await db.query('SELECT requested_by FROM inventory_stock_forecast_runs WHERE id = ?', ['stock-forecast-stock-report-cabinet-2'])).toEqual([{ requested_by: 'Admin User' }]);
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_STOCK_FORECAST_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_STOCK_FORECAST_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_STOCK_FORECAST_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, product_id: 'stock-report-corner-desk' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_STOCK_FORECAST_EMPTY' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_stock_forecast_runs WHERE product_id = ?', ['stock-report-corner-desk'])).toEqual([{ count: 0 }]);
  });

  test('enforces the read permission and persists report history across restart', async () => {
    const databasePath = `/tmp/core3-inventory-stock-forecast-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_stock_forecast_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
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
      expect(await secondRepository.query('SELECT requested_by, line_count FROM inventory_stock_forecast_runs WHERE id = ?', ['stock-forecast-stock-report-cabinet-2'])).toEqual([{ requested_by: 'Restart Operator', line_count: 3 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: [] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['stock-forecast', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['stock-forecast', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.stock.forecast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { product_id: 'stock-report-cabinet', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.stock.forecast'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
