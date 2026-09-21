import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, `inventory_ready_moves_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory operation-type Ready Moves Odoo action parity', () => {
  test('keeps the page/API contract and source action aligned', () => {
    const page = parsed('pages/operation-type-ready-moves.yaml');
    const api = parsed('api/operation-type-ready-moves.yaml');
    const detail = parsed('pages/operation-type-detail.yaml');
    const detailApi = parsed('api/operation-type-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(() => validatePageDefinition(page, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(page.page).toMatchObject({ id: 'operation-type-ready-moves', route: '/operation-types/ready-moves' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(api.datasources.map((item: any) => item.id)).toEqual(expect.arrayContaining([
      'inventory_operation_type_ready_context', 'inventory_operation_type_ready_moves',
    ]));
    expect(detail.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_operation_type_ready_moves', permission: 'inventory.read' }),
    ]));
    expect(detailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_operation_type_ready_moves', navigate_to: '/operation-types/ready-moves', params: { operation_type_id: '{state.inventory_operation_type_detail.id}' } }),
    ]));
    expect(source).toContain('id="action_get_picking_type_ready_moves"');
    expect(source).toContain("[('picking_type_id', '=', active_id)]");
    expect(source).toContain("'search_default_ready': 1");
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operation-types/ready-moves', page: 'operation-type-ready-moves', module: 'inventory' }),
    ]));
  });

  test('seeds and filters ready unfinished moves deterministically by operation type and company', async () => {
    const { database, repository } = await repositoryForTest();
    const api = parsed('api/operation-type-ready-moves.yaml');
    const context = api.datasources.find((item: any) => item.id === 'inventory_operation_type_ready_context');
    const source = api.datasources.find((item: any) => item.id === 'inventory_operation_type_ready_moves');
    expect(await repository.querySource(context, { operation_type_id: 'operation-deliveries', fixture_state: null }, 0, 1)).toMatchObject({
      data: { operation_name: 'Deliveries', ready_move_count: 11 },
    });
    expect((await repository.querySource(source, {
      operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, fixture_state: null,
    }, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'delivery-package-remove-0001-move-001', 'delivery-ready-moves-0001-move-001',
    ]);
    expect((await repository.querySource(source, {
      operation_type_id: 'operation-deliveries', current_company_name: 'Core3 Demo Company', q: 'READY/0001', fixture_state: null,
    }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'delivery-ready-moves-0001-move-001', reserved_quantity: 6 })]);
    expect((await repository.querySource(source, {
      operation_type_id: 'operation-deliveries', current_company_name: 'Other Company', q: null, fixture_state: null,
    }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, {
      operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, fixture_state: 'empty',
    }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, {
      operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, fixture_state: 'transport_error',
    })).rejects.toMatchObject({ status: 503, code: 'INVENTORY_READY_MOVES_UNAVAILABLE' });
    database.close();
  });

  test('enforces read permission on the ready-moves page without widening operation-type management', async () => {
    const { database, repository } = await repositoryForTest();
    const api = parsed('api/operation-type-ready-moves.yaml');
    const page = parsed('pages/operation-type-ready-moves.yaml');
    const reader = { sub: 'inventory-operator', email: 'operator@core3.local', name: 'Inventory Operator', roles: ['user'], permissions: ['inventory.read'] };
    const denied = { ...reader, permissions: [] };
    const makeApi = (user: any) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([[page.page.id, api.datasources.map((source: any) => source.id)]]),
      pages: new Map([[page.page.id, { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-ready-moves-test', eventStore: {}, topics: {},
    });
    const response = await makeApi(reader)(new Request('http://inventory.test/api/pages/operation-type-ready-moves?operation_type_id=operation-deliveries&current_company_name=My%20Company%20%28San%20Francisco%29', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://inventory.test/api/pages/operation-type-ready-moves?operation_type_id=operation-deliveries&current_company_name=My%20Company%20%28San%20Francisco%29'));
    expect(response.status).toBe(200);
    await expect(makeApi(denied)(new Request('http://inventory.test/api/pages/operation-type-ready-moves?operation_type_id=operation-deliveries', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://inventory.test/api/pages/operation-type-ready-moves?operation_type_id=operation-deliveries'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
    expect(parsed('pages/operation-type-detail.yaml').page.auth.require).toEqual(['inventory.manage']);
    database.close();
  });

  test('replays the migration and preserves the ready fixture after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-ready-moves-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const source = parsed('api/operation-type-ready-moves.yaml').datasources.find((item: any) => item.id === 'inventory_operation_type_ready_moves');
    expect((await first.repository.querySource(source, { operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-ready-moves-0001-move-001', row_version: 1 }),
    ]));
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect((await second.repository.querySource(source, { operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)', q: null, fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-ready-moves-0001-move-001', reference: 'WH/OUT/READY/0001' }),
    ]));
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
