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
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => yaml('api/lot-locations.yaml').actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory Lot Locations parity', () => {
  test('maps Odoo lot Location to a separate page/API contract', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/lot-locations.yaml');
    const api = yaml('api/lot-locations.yaml');
    const detailPage = yaml('pages/lot-detail.yaml');
    const detailApi = yaml('api/lot-detail.yaml');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_lot_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_lot.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: 'lot-locations' });
    expect(page.page).toMatchObject({ id: 'lot-locations', route: '/lots/locations', auth: { require: ['inventory.multi_location'] } });
    expect(discovered.pageDatasources.get('lot-locations')).toEqual(expect.arrayContaining([
      'inventory_lot_locations_context', 'inventory_lot_locations_lines', 'inventory_lot_locations_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/lots/locations', page: 'lot-locations', module: 'inventory' });
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_lot_locations', permission: 'inventory.multi_location' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_lot_locations', navigate_to: '/lots/locations', params: { id: '{row.id}', expected_row_version: '{row.row_version}', current_company_name: '{row.company_name}' } }));
    expect(action('record_inventory_lot_locations')).toMatchObject({ action: 'inventory.lots.locations', handler: 'yaml_mutation', operation: 'report', permission: 'inventory.multi_location' });
    expect(action('back_to_inventory_lot_detail_from_locations')).toMatchObject({ navigate_to: '/lots/detail', params: { id: '{state.inventory_lot_locations_context.id}' } });
    expect(action('record_inventory_lot_locations').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_LOT_LOCATIONS_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_LOT_LOCATIONS_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_LOT_LOCATIONS_ACTOR_REQUIRED' }),
    ]));
    expect(odooView).toContain('name="action_lot_open_quants"');
    expect(odooView).toContain('groups="stock.group_stock_multi_locations"');
    expect(odooModel).toContain('def action_lot_open_quants(self):');
    expect(odooModel).toContain("search_default_lot_id=self.id");
    expect(odooModel).toContain("return self.env['stock.quant'].action_view_quants()");
    validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true });
  });

  test('returns deterministic company-scoped lot locations and report history', async () => {
    const { database, repository: db } = await repository('inventory_lot_locations_fixture');
    const params = { id: 'lot-traceable-0001', current_company_name: 'Core3 Demo Company', q: null };
    expect(await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_context'), params, 0, 1)).toMatchObject({ data: { id: 'lot-traceable-0001', lot_name: 'TRACE-LOT-0001', product_name: '[E-COM08] Storage Box', total_quantity: 15, location_count: 1 } });
    expect((await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_lines'), params, 0, 50)).data).toMatchObject([{ id: 'quant-trace-location-0001', location_name: 'Shelf 2', warehouse_name: 'Main Warehouse', quantity: 15, reserved_quantity: 2, available_quantity: 13, unit_name: 'Units' }]);
    expect((await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_runs'), params, 0, 50)).data).toMatchObject([{ id: 'lot-locations-lot-traceable-0001-1', line_count: 1, requested_by: 'Seeded Inventory' }]);
    expect((await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_lines'), { ...params, q: 'missing-shelf' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_lines'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_context'), { ...params, current_company_name: 'My Company (San Francisco)' }, 0, 1)).data).toEqual({});
    await expect(db.querySource(source('lot-locations.yaml', 'inventory_lot_locations_lines'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_LOT_LOCATIONS_LINES_UNAVAILABLE' });
    database.close();
  });

  test('records a durable location report with actor/company/stale/empty guards', async () => {
    const { database, repository: db } = await repository('inventory_lot_locations_mutation');
    const mutation = action('record_inventory_lot_locations').mutation;
    const base = { lot_id: 'lot-traceable-0001', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };
    expect(await db.executeMutation(mutation, base)).toMatchObject({ id: 'lot-locations-lot-traceable-0001-2', lot_id: 'lot-traceable-0001', line_count: 1, requested_by: 'Admin User' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_lot_location_runs WHERE lot_id = ?', ['lot-traceable-0001'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOT_LOCATIONS_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOT_LOCATIONS_COMPANY' });
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOT_LOCATIONS_STALE' });
    await expect(db.executeMutation(mutation, { ...base, lot_id: 'lot-cable-empty' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOT_LOCATIONS_EMPTY' });
    await expect(db.executeMutation(mutation, { ...base, lot_id: 'lot-cable-00001' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOT_LOCATIONS_LOT_NOT_FOUND' });
    database.close();
  });

  test('survives restart and denies users without multi-location permission', async () => {
    const databasePath = `/tmp/core3-inventory-lot-locations-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_lot_locations_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action('record_inventory_lot_locations').mutation, { lot_id: 'lot-traceable-0001', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company' });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, line_count FROM inventory_lot_location_runs WHERE id = ?', ['lot-locations-lot-traceable-0001-2'])).toEqual([{ requested_by: 'Restart Operator', line_count: 1 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: [] };
      const page = yaml('pages/lot-locations.yaml');
      const api = yaml('api/lot-locations.yaml');
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['lot-locations', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['lot-locations', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.multi_location'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.lots.locations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { lot_id: 'lot-traceable-0001', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.lots.locations'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
