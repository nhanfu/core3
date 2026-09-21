import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/quant-replenishment.yaml');
const page = yaml('pages/quant-replenishment.yaml');
const stockApi = yaml('api/stock.yaml');
const stockPage = yaml('pages/stock.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory quant replenishment parity', () => {
  test('maps the Odoo On Hand Replenishment action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_quant_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_quant.py', 'utf8');
    const productModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/product.py', 'utf8');
    const orderpointView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_orderpoint_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'quant-replenishment', route: '/stock/quant-replenishment', auth: { require: ['inventory.manage'] } });
    expect(api.page).toEqual({ id: 'quant-replenishment' });
    expect(discovered.pages.get('quant-replenishment')?.config.page.id).toBe('quant-replenishment');
    expect(discovered.pageDatasources.get('quant-replenishment')).toEqual(expect.arrayContaining([
      'inventory_quant_replenishment_context', 'inventory_quant_replenishment_orderpoints', 'inventory_quant_replenishment_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock/quant-replenishment', page: 'quant-replenishment', module: 'inventory' });
    expect(stockPage.components[0].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_quant_replenishment', label: 'Replenishment' }));
    expect(stockApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_quant_replenishment', navigate_to: '/stock/quant-replenishment' }));
    expect(action('record_inventory_quant_replenishment')).toMatchObject({ action: 'inventory.quants.replenishment', handler: 'yaml_mutation', operation: 'report', permission: 'inventory.manage' });
    expect(action('record_inventory_quant_replenishment').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_QUANT_REPLENISHMENT_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_QUANT_REPLENISHMENT_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_QUANT_REPLENISHMENT_ACTOR_REQUIRED' }),
    ]));
    expect(sourceView).toContain('name="action_view_orderpoints"');
    expect(sourceView).toContain('string="Replenishment"');
    expect(sourceView).toContain("search_default_location_id");
    expect(sourceModel).toContain('def action_view_orderpoints(self):');
    expect(sourceModel).toContain("action = self.env['product.product'].action_view_orderpoints()");
    expect(productModel).toContain("'search_default_filter_not_snoozed': True");
    expect(productModel).toContain("'default_product_id': self.ids[0]");
    expect(orderpointView).toContain('id="action_orderpoint_replenish"');
    expect(orderpointView).toContain('stock.warehouse.orderpoint');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('returns deterministic company-scoped rules and durable open history', async () => {
    const { database, repository: db } = await repository('inventory_quant_replenishment_fixture');
    const params = { quant_id: 'quant-box-main', current_company_name: 'Core3 Demo Company', q: null, trigger: null, fixture_state: null };
    expect(await db.querySource(source('inventory_quant_replenishment_context'), params, 0, 1)).toMatchObject({ data: {
      id: 'quant-box-main', product_name: '[E-COM08] Storage Box', location_name: 'Stock', orderpoint_count: 1,
    } });
    expect((await db.querySource(source('inventory_quant_replenishment_orderpoints'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'orderpoint-quant-replenish-0001', product_name: '[E-COM08] Storage Box', location_name: 'Stock', trigger: 'manual', to_order: 2,
    })]);
    expect((await db.querySource(source('inventory_quant_replenishment_runs'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'quant-replenishment-quant-box-main-1', orderpoint_count: 1, requested_by: 'Seeded Inventory',
    })]);
    expect((await db.querySource(source('inventory_quant_replenishment_orderpoints'), { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_quant_replenishment_orderpoints'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_quant_replenishment_context'), { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    await expect(db.querySource(source('inventory_quant_replenishment_orderpoints'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_QUANT_REPLENISHMENT_LINES_UNAVAILABLE' });
    database.close();
  });

  test('records a durable request with actor/company/stale guards', async () => {
    const { database, repository: db } = await repository('inventory_quant_replenishment_mutation');
    const base = { quant_id: 'quant-box-main', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' };
    expect(await db.executeMutation(action('record_inventory_quant_replenishment').mutation, base)).toMatchObject({
      id: 'quant-replenishment-quant-box-main-2', quant_id: 'quant-box-main', orderpoint_count: 1, requested_by: 'Admin User',
    });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_quant_replenishment_runs WHERE quant_id = ?', ['quant-box-main'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(action('record_inventory_quant_replenishment').mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_QUANT_REPLENISHMENT_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action('record_inventory_quant_replenishment').mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_QUANT_REPLENISHMENT_COMPANY' });
    await expect(db.executeMutation(action('record_inventory_quant_replenishment').mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_QUANT_REPLENISHMENT_STALE' });
    await expect(db.executeMutation(action('record_inventory_quant_replenishment').mutation, { ...base, quant_id: 'quant-box-main', current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_QUANT_REPLENISHMENT_NOT_FOUND' });
    database.close();
  });

  test('persists across restart and denies users without inventory.manage', async () => {
    const databasePath = `/tmp/core3-inventory-quant-replenishment-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_quant_replenishment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action('record_inventory_quant_replenishment').mutation, { quant_id: 'quant-box-main', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, orderpoint_count FROM inventory_quant_replenishment_runs WHERE id = ?', ['quant-replenishment-quant-box-main-2'])).toEqual([{ requested_by: 'Restart Operator', orderpoint_count: 1 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['quant-replenishment', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['quant-replenishment', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.replenishment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { quant_id: 'quant-box-main', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.quants.replenishment'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
