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
const api = yaml('api/replenishment-info.yaml');
const page = yaml('pages/replenishment-info.yaml');
const replenishmentApi = yaml('api/replenishment.yaml');
const replenishmentPage = yaml('pages/replenishment.yaml');
const context = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_info_context');
const demand = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_info_demand');
const runs = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_info_runs');
const routes = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_info_routes');
const openAction = api.actions.find((candidate: any) => candidate.id === 'record_inventory_replenishment_info');
const saveAction = api.actions.find((candidate: any) => candidate.id === 'save_inventory_replenishment_info');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory Replenishment Information parity', () => {
  test('maps the Odoo row wizard to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const rowActions = replenishmentPage.components[0].columns.find((column: any) => column.field === 'actions').actions;
    const sourceAction = replenishmentApi.actions.find((candidate: any) => candidate.id === 'view_inventory_replenishment_info');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'replenishment-info', route: '/replenishment/info', auth: { require: ['inventory.manage'] } });
    expect(api.page).toEqual({ id: 'replenishment-info' });
    expect(discovered.pageDatasources.get('replenishment-info')).toEqual(expect.arrayContaining([
      'inventory_replenishment_info_context', 'inventory_replenishment_info_demand',
      'inventory_replenishment_info_runs', 'inventory_replenishment_info_routes',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/replenishment/info', page: 'replenishment-info', module: 'inventory' });
    expect(sourceAction).toMatchObject({ type: 'navigate', permission: 'inventory.manage', navigate_to: '/replenishment/info', params: { id: '{row.id}', row_version: '{row.row_version}' } });
    expect(rowActions).toContainEqual(expect.objectContaining({ id: 'view_inventory_replenishment_info', label: 'Replenishment Information' }));
    expect(page.components.find((component: any) => component.type === 'Chart')).toMatchObject({ source: 'inventory_replenishment_info_demand', label_field: 'demand_date', value_field: 'stock_balance' });
    expect(openAction).toMatchObject({ type: 'server', permission: 'inventory.manage', action: 'inventory.replenishment.info.open', operation: 'report' });
    expect(saveAction).toMatchObject({ type: 'server_form', permission: 'inventory.manage', action: 'inventory.replenishment.info.save', operation: 'update' });
  });

  test('returns deterministic rule context, demand history, runs, and routes', async () => {
    const db = await repository('inventory_replenishment_info_fixture');
    const params = { id: 'orderpoint-desk-left', company_name: 'My Company (San Francisco)', current_company_name: '' };
    expect(await db.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'orderpoint-desk-left', product_name: '[FURN_1118] Corner Desk Left Sit', min_qty: 0, max_qty: 0, lead_days: 3, demand_line_count: 3, total_demand: 2 } });
    expect((await db.querySource(demand, params, 0, 50)).data).toMatchObject([
      { reference: 'SO/INFO/0001', outgoing_qty: 2, net_demand: 2, stock_balance: 4 },
      { reference: 'SO/INFO/0002', outgoing_qty: 1, net_demand: 1, stock_balance: 3 },
      { reference: 'RET/INFO/0001', returned_qty: 1, net_demand: -1, stock_balance: 2 },
    ]);
    expect((await db.querySource(runs, params, 0, 50)).data).toMatchObject([{ id: 'replenish-info-run-0001', line_count: 3, requested_by: 'Seeded Inventory' }]);
    expect((await db.querySource(routes, params, 0, 50)).data).toEqual([{ value: 'Buy', label: 'Buy' }, { value: 'MTO', label: 'Make To Order' }, { value: 'Manufacture', label: 'Manufacture' }]);
    expect((await db.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
  });

  test('opens durable information runs and saves guarded rule changes', async () => {
    const db = await repository('inventory_replenishment_info_mutation');
    const base = { id: 'orderpoint-desk-left', expected_row_version: 1, company_name: 'My Company (San Francisco)', current_company_name: '', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    expect(await db.executeMutation(openAction.mutation, base)).toMatchObject({ id: 'replenish-info-orderpoint-desk-left-2', orderpoint_id: 'orderpoint-desk-left', requested_by: 'Admin User', line_count: 3 });
    expect(await db.executeMutation(saveAction.mutation, { ...base, min_qty: 2, max_qty: 8, route: 'Manufacture' })).toMatchObject({ id: 'orderpoint-desk-left', min_qty: 2, max_qty: 8, route: 'Manufacture', row_version: 2 });
    await expect(db.executeMutation(saveAction.mutation, { ...base, expected_row_version: 2, min_qty: 9, max_qty: 3, route: 'Buy' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_REPLENISHMENT_INFO_RANGE_INVALID' });
    await expect(db.executeMutation(saveAction.mutation, { ...base, expected_row_version: 2, min_qty: 2, max_qty: 8, route: 'Drop Ship' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_REPLENISHMENT_INFO_ROUTE_INVALID' });
    await expect(db.executeMutation(saveAction.mutation, { ...base, expected_row_version: 1, min_qty: 2, max_qty: 8, route: 'Buy' })).rejects.toMatchObject({ status: 409 });
    await expect(db.executeMutation(openAction.mutation, { ...base, expected_row_version: 2, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REPLENISHMENT_INFO_ACTOR_REQUIRED' });
    await expect(db.executeMutation(saveAction.mutation, { ...base, company_name: 'Other Company', min_qty: 2, max_qty: 8, route: 'Buy' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REPLENISHMENT_INFO_COMPANY' });
  });

  test('preserves the saved rule and run through restart and denies read-only users', async () => {
    const databasePath = `/tmp/core3-inventory-replenishment-info-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_replenishment_info_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(saveAction.mutation, { id: 'orderpoint-desk-left', expected_row_version: 1, min_qty: 1, max_qty: 6, route: 'Buy', company_name: 'My Company (San Francisco)', current_company_name: '', current_user_id: 'user-restart', current_user_name: 'Restart Operator' });
      await firstRepository.executeMutation(openAction.mutation, { id: 'orderpoint-desk-left', expected_row_version: 2, current_company_name: '', current_user_id: 'user-restart', current_user_name: 'Restart Operator' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT min_qty, max_qty, route, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-left'])).toEqual([{ min_qty: 1, max_qty: 6, route: 'Buy', row_version: 2 }]);
      expect(await secondRepository.query('SELECT requested_by, line_count FROM inventory_replenishment_info_runs WHERE id = ?', ['replenish-info-orderpoint-desk-left-2'])).toEqual([{ requested_by: 'Restart Operator', line_count: 3 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['replenishment-info', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['replenishment-info', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/pages/replenishment-info?id=orderpoint-desk-left', { method: 'GET' }), new URL('http://inventory.test/api/pages/replenishment-info?id=orderpoint-desk-left'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
