import { describe, expect, test } from 'bun:test';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/operation-type-moves-analysis.yaml');
const page = yaml('pages/operation-type-moves-analysis.yaml');
const detailApi = yaml('api/operation-type-detail.yaml');
const detailPage = yaml('pages/operation-type-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

function discoverInventoryOnly() {
  const isolatedRoot = mkdtempSync('/tmp/core3-inventory-discovery-');
  try {
    cpSync(serviceRoot, join(isolatedRoot, 'services/inventory'), { recursive: true });
    return discoverPages(isolatedRoot);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory operation-type Moves Analysis parity', () => {
  test('maps the Odoo operation-type Reporting action to separate page/API contracts', () => {
    const discovered = discoverInventoryOnly();
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_type_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const globalAction = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_move_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'operation-type-moves-analysis', route: '/operation-types/moves-analysis', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'operation-type-moves-analysis' });
    expect(discovered.pages.get('operation-type-moves-analysis')?.config.page.id).toBe('operation-type-moves-analysis');
    expect(discovered.pageDatasources.get('operation-type-moves-analysis')).toEqual(expect.arrayContaining([
      'inventory_operation_type_moves_context', 'inventory_operation_type_moves', 'inventory_operation_type_moves_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/operation-types/moves-analysis', page: 'operation-type-moves-analysis', module: 'inventory' });
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_operation_type_moves_analysis', label: 'Reporting', permission: 'inventory.read' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_operation_type_moves_analysis', navigate_to: '/operation-types/moves-analysis' }));
    expect(action('record_inventory_operation_type_moves')).toMatchObject({ action: 'inventory.operation_types.moves_analysis', handler: 'yaml_mutation', operation: 'report', permission: 'inventory.read' });
    expect(action('record_inventory_operation_type_moves').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_OPERATION_TYPE_MOVES_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_OPERATION_TYPE_MOVES_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_OPERATION_TYPE_MOVES_ACTOR_REQUIRED' }),
    ]));
    expect(sourceView).toContain('name="get_action_picking_type_moves_analysis"');
    expect(sourceView).toContain('>Reporting</a>');
    expect(sourceModel).toContain('def get_action_picking_type_moves_analysis(self):');
    expect(sourceModel).toContain("('picking_type_id', '=', self.id)");
    expect(globalAction).toContain('stock_move_action');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('returns deterministic company-scoped operation moves and seeded report history', async () => {
    const { database, repository: db } = await repository('inventory_operation_type_moves_fixture');
    const params = { operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, state: null, movement_type: null, from_date: null, to_date: null, fixture_state: null };
    expect(await db.querySource(source('inventory_operation_type_moves_context'), params, 0, 1)).toMatchObject({ data: {
      operation_type_id: 'operation-deliveries', operation_name: 'Deliveries', move_count: 3,
    } });
    expect((await db.querySource(source('inventory_operation_type_moves'), { ...params, state: 'done' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'stock-move-0003', reference: 'WH/OUT/00001', movement_type: 'outgoing' }),
      expect.objectContaining({ id: 'stock-move-0004', reference: 'WH/OUT/00002', product_name: 'Storage Box' }),
    ]));
    expect((await db.querySource(source('inventory_operation_type_moves'), { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_operation_type_moves'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_operation_type_moves'), { ...params, movement_type: 'incoming' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_operation_type_moves_runs'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'operation-type-moves-analysis-operation-deliveries-1', move_count: 3, requested_by: 'Seeded Inventory',
    })]);
    expect((await db.querySource(source('inventory_operation_type_moves_context'), { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    await expect(db.querySource(source('inventory_operation_type_moves'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_OPERATION_TYPE_MOVES_UNAVAILABLE' });
    database.close();
  });

  test('records a durable report request with actor/company/stale guards', async () => {
    const { database, repository: db } = await repository('inventory_operation_type_moves_mutation');
    const base = { operation_type_id: 'operation-deliveries', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)' };
    expect(await db.executeMutation(action('record_inventory_operation_type_moves').mutation, base)).toMatchObject({
      id: 'operation-type-moves-analysis-operation-deliveries-2', operation_type_id: 'operation-deliveries', move_count: 3, requested_by: 'Admin User',
    });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_operation_type_moves_analysis_runs WHERE operation_type_id = ?', ['operation-deliveries'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(action('record_inventory_operation_type_moves').mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_OPERATION_TYPE_MOVES_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action('record_inventory_operation_type_moves').mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_OPERATION_TYPE_MOVES_COMPANY' });
    await expect(db.executeMutation(action('record_inventory_operation_type_moves').mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_OPERATION_TYPE_MOVES_STALE' });
    await expect(db.executeMutation(action('record_inventory_operation_type_moves').mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_OPERATION_TYPE_MOVES_NOT_FOUND' });
    database.close();
  });

  test('persists across restart and denies users without inventory.read', async () => {
    const databasePath = `/tmp/core3-inventory-operation-type-moves-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_operation_type_moves_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action('record_inventory_operation_type_moves').mutation, { operation_type_id: 'operation-deliveries', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)' });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, move_count FROM inventory_operation_type_moves_analysis_runs WHERE id = ?', ['operation-type-moves-analysis-operation-deliveries-2'])).toEqual([{ requested_by: 'Restart Operator', move_count: 3 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: [] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['operation-type-moves-analysis', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['operation-type-moves-analysis', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/pages/operation-type-moves-analysis?operation_type_id=operation-deliveries', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://inventory.test/api/pages/operation-type-moves-analysis?operation_type_id=operation-deliveries'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
