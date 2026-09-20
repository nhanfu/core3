import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = yaml('pages/moves-analysis.yaml');
const api = yaml('api/moves-analysis.yaml');
const detailPage = yaml('pages/move-analysis-detail.yaml');
const detailApi = yaml('api/move-analysis-detail.yaml');
const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_moves_analysis');

async function repositoryForTest(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Moves Analysis Odoo action parity', () => {
  test('maps the source menu/action and keeps page/API and read-only contracts separate', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components[0];

    expect(reporting.items).toContainEqual({ path: '/moves-analysis', label: 'Moves Analysis', icon: 'chart', permission: 'inventory.read' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'moves-analysis', route: '/moves-analysis', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'moves-analysis' });
    expect(detailApi.page).toEqual({ id: 'move-analysis-detail' });
    expect(page.page.route).toBe('/moves-analysis');
    expect(detailPage.page.route).toBe('/moves-analysis/detail');
    expect(list).toMatchObject({ source: 'inventory_stock_moves_analysis', default_filters: { state: 'done' }, view_navigation: 'tabs', form_view: { side_panel: false } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph', 'kanban', 'form']);
    expect(list.views.find((view: any) => view.id === 'pivot').pivot.default).toMatchObject({ rows: ['date'], columns: ['operation_type_name'] });
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'product_name', measure_field: 'quantity' });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_stock_move_detail', editable: false, status_field: 'state' });
    expect(api.actions).toEqual([{ id: 'view_inventory_stock_move', type: 'navigate', permission: 'inventory.read', navigate_to: '/moves-analysis/detail', params: { id: '{row.id}' } }]);
    expect(detailApi.actions).toEqual([{ id: 'back_to_inventory_moves_analysis', type: 'navigate', permission: 'inventory.read', navigate_to: '/moves-analysis' }]);
    expect(JSON.stringify([page, api, detailPage, detailApi])).not.toMatch(/operation: (create|update|delete)|inventory\.write|inventory\.manage/);
  });

  test('serves deterministic report rows, source filters, pivot data, empty, and transport states', async () => {
    const { database, repository } = await repositoryForTest('inventory_moves_analysis_fixture_test');
    const params = { q: null, state: 'done', movement_type: null, from_date: null, to_date: null, fixture_state: null };
    const done = await repository.querySource(source, params, 0, 50);
    expect(done.data).toHaveLength(6);
    expect(done.data.every((row: any) => row.state === 'Done')).toBe(true);
    expect(done.data[0]).toMatchObject({ id: 'stock-move-0008', movement_type: 'inventory', is_inventory: true, source_location: 'Stock', destination_location: 'Inventory Loss' });
    expect((await repository.querySource(source, { ...params, state: 'todo' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['stock-move-0007', 'stock-move-0006']);
    expect((await repository.querySource(source, { ...params, movement_type: 'incoming' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['stock-move-0001', 'stock-move-0002']);
    expect((await repository.querySource(source, { ...params, q: 'Desk Combination' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['stock-move-0002', 'stock-move-0003']);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-14', to_date: '2026-01-15' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['stock-move-0008', 'stock-move-0001', 'stock-move-0002']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_MOVES_ANALYSIS_UNAVAILABLE' });
    const pivot = await repository.querySource(source, params, 0, 50, undefined, undefined, { rows: ['operation_type_name'], columns: [], measures: [{ field: 'quantity', aggregate: 'sum', label: 'Quantity' }] });
    expect(pivot.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation_type_name: 'Receipts', Quantity: 85 }),
      expect.objectContaining({ operation_type_name: 'Inventory Adjustments', Quantity: 15 }),
    ]));
    const detail = detailApi.datasources[0];
    expect(await repository.querySource(detail, { id: 'stock-move-0003', fixture_state: null }, 0, 1)).toMatchObject({ data: { reference: 'WH/OUT/00001', state: 'Done', source_location: 'Stock', destination_location: 'Customers' } });
    await expect(repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'INVENTORY_STOCK_MOVE_NOT_FOUND' });
    await expect(repository.querySource(detail, { id: 'stock-move-0003', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_MOVES_ANALYSIS_UNAVAILABLE' });
    database.close();
  });

  test('keeps the report read-only and enforces the authenticated read boundary', async () => {
    const { database, repository } = await repositoryForTest('inventory_moves_analysis_permission_test');
    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(api.datasources.every((candidate: any) => candidate.permission === 'inventory.read')).toBe(true);
    expect(detailApi.datasources[0].permission).toBe('inventory.read');
    expect(api.actions[0].permission).toBe('inventory.read');
    expect(JSON.stringify([page, api, detailPage, detailApi])).not.toMatch(/operation: (create|update|delete)/);
    await expect(repository.querySource(source, { ...{ q: null, state: 'done', movement_type: null, from_date: null, to_date: null }, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'INVENTORY_MOVES_ANALYSIS_FORBIDDEN' });
    const user: any = { sub: 'inventory-analysis-reader', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([['moves-analysis', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['moves-analysis', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    await expect(handler(new Request('http://inventory.test/api/pages/moves-analysis'), new URL('http://inventory.test/api/pages/moves-analysis'))).resolves.toBeDefined();
    user.permissions = [];
    await expect(handler(new Request('http://inventory.test/api/pages/moves-analysis'), new URL('http://inventory.test/api/pages/moves-analysis'))).rejects.toMatchObject({ status: 403 });
    database.close();
  });

  test('preserves the report fixtures and detail after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-moves-analysis-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_moves_analysis_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await firstRepository.query('SELECT COUNT(*) AS count FROM inventory_stock_moves')).toEqual([{ count: 8 }]);
      expect(await firstRepository.querySource(detailApi.datasources[0], { id: 'stock-move-0008', fixture_state: null }, 0, 1)).toMatchObject({ data: { origin: 'Inventory adjustment', state: 'Done' } });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT COUNT(*) AS count FROM inventory_stock_moves')).toEqual([{ count: 8 }]);
      expect(await secondRepository.querySource(source, { q: null, state: 'done', movement_type: null, from_date: null, to_date: null, fixture_state: null }, 0, 50)).toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ id: 'stock-move-0008', movement_type: 'inventory' })]) });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
