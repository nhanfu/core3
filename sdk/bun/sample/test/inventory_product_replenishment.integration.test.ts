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
const api = yaml('api/product-replenish.yaml');
const page = yaml('pages/product-replenish.yaml');
const stockApi = yaml('api/stock-report.yaml');
const stockPage = yaml('pages/stock-report.yaml');
const context = api.datasources.find((candidate: any) => candidate.id === 'inventory_product_replenish_context');
const warehouses = api.datasources.find((candidate: any) => candidate.id === 'inventory_product_replenish_warehouses');
const runs = api.datasources.find((candidate: any) => candidate.id === 'inventory_product_replenishment_runs');
const action = api.actions.find((candidate: any) => candidate.id === 'launch_inventory_product_replenishment');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory product Replenish parity', () => {
  test('maps the Odoo product.replenish modal to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const stockActions = stockApi.actions.find((candidate: any) => candidate.id === 'replenish_inventory_stock_product');
    const list = page.components[1];

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'product-replenish', route: '/stock-report/replenish', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'product-replenish' });
    expect(discovered.pageDatasources.get('product-replenish')).toEqual(expect.arrayContaining([
      'inventory_product_replenish_context', 'inventory_product_replenish_warehouses',
      'inventory_product_replenish_routes', 'inventory_product_replenishment_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock-report/replenish', page: 'product-replenish', module: 'inventory' });
    expect(stockActions).toMatchObject({ type: 'navigate', permission: 'inventory.manage', navigate_to: '/stock-report/replenish', params: { product_id: '{row.id}' } });
    expect(stockPage.components[1].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'replenish_inventory_stock_product', label: 'Replenish' }));
    expect(action).toMatchObject({ type: 'server_form', action: 'inventory.product.replenish', handler: 'yaml_mutation', operation: 'create', prefill: { product_id: '{state.product_id}', expected_row_version: '{state.row_version}' } });
    expect(action.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'quantity', type: 'number', required: true }),
      expect.objectContaining({ field: 'date_planned', type: 'date', required: true }),
      expect.objectContaining({ field: 'warehouse_name', options_source: 'inventory_product_replenish_warehouses' }),
      expect.objectContaining({ field: 'route', options_source: 'inventory_product_replenish_routes' }),
    ]));
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_REPLENISH_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_REPLENISH_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_REPLENISH_ACTOR_REQUIRED' }),
    ]));
  });

  test('returns product context, deterministic choices, and durable history', async () => {
    const db = await repository('inventory_product_replenishment_fixture');
    const params = { product_id: 'stock-report-cabinet', current_company_name: 'Core3 Demo Company' };
    expect(await db.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'stock-report-cabinet', product_id: 'stock-report-cabinet', product_name: '[E-COM07] Large Cabinet', forecasted_quantity: 270, on_hand: 500 } });
    expect((await db.querySource(warehouses, params, 0, 50)).data).toEqual([{ value: 'Main Warehouse', label: 'Main Warehouse' }]);
    expect((await db.querySource(api.datasources.find((candidate: any) => candidate.id === 'inventory_product_replenish_routes'), params, 0, 50)).data).toEqual([
      { value: 'Buy', label: 'Buy' }, { value: 'MTO', label: 'Make To Order' }, { value: 'Manufacture', label: 'Manufacture' },
    ]);
    expect((await db.querySource(runs, params, 0, 50)).data).toMatchObject([{ id: 'product-replenishment-cabinet-0001', quantity: 10, requested_by: 'Seeded Inventory' }]);
    expect((await db.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
  });

  test('creates a request with actor, company, and row-version guards', async () => {
    const db = await repository('inventory_product_replenishment_mutation');
    const base = {
      product_id: 'stock-report-cabinet', expected_row_version: 1, quantity: 12,
      date_planned: '2026-01-22', warehouse_name: 'Main Warehouse', route: 'Buy',
      company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company',
      current_user_id: 'user-admin', current_user_name: 'Admin User',
    };
    expect(await db.executeMutation(action.mutation, base)).toMatchObject({ id: 'product-replenishment-stock-report-cabinet-2', product_name: '[E-COM07] Large Cabinet', quantity: 12, requested_by: 'Admin User', state: 'Requested' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_product_replenishments WHERE product_id = ?', ['stock-report-cabinet'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_REPLENISH_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_REPLENISH_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_REPLENISH_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, quantity: 0 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_REPLENISH_QUANTITY_INVALID' });
    await expect(db.executeMutation(action.mutation, { ...base, route: 'Drop Ship' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_REPLENISH_ROUTE_INVALID' });
  });

  test('enforces page permission and persists requests across restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-replenish-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_product_replenish_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action.mutation, {
        product_id: 'stock-report-cabinet', expected_row_version: 1, quantity: 8, date_planned: '2026-01-21', warehouse_name: 'Main Warehouse', route: 'Manufacture',
        company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-restart', current_user_name: 'Restart Operator',
      });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, quantity, route FROM inventory_product_replenishments WHERE id = ?', ['product-replenishment-stock-report-cabinet-2'])).toEqual([{ requested_by: 'Restart Operator', quantity: 8, route: 'Manufacture' }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['product-replenish', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['product-replenish', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.product.replenish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { product_id: 'stock-report-cabinet', quantity: 1, date_planned: '2026-01-22', warehouse_name: 'Main Warehouse', route: 'Buy' } }) }), new URL('http://inventory.test/api/actions/inventory.product.replenish'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
