import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Inventory Moves History Odoo parity', () => {
  test('keeps the Reporting action order, responsive view modes, and page-id API split', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/moves.yaml');
    const api = yaml('api/moves.yaml');
    const detailPage = yaml('pages/move-line-detail.yaml');
    const detailApi = yaml('api/move-line-detail.yaml');
    const reporting = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'reporting');

    expect(reporting.items).toContainEqual(expect.objectContaining({ path: '/moves', label: 'Moves History', permission: 'inventory.read' }));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: 'moves' });
    expect(detailApi.page).toEqual({ id: 'move-line-detail' });
    expect(discovered.pageDatasources.get('moves')).toContain('inventory_move_lines');
    expect(discovered.pageDatasources.get('move-line-detail')).toContain('inventory_move_line_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      { path: '/moves', page: 'moves', module: 'inventory' },
      { path: '/moves/detail', page: 'move-line-detail', module: 'inventory' },
    ]));

    const list = page.components[0];
    expect(page.page).toMatchObject({ id: 'moves', route: '/moves', auth: { require: ['inventory.read'] } });
    expect(list).toMatchObject({ source: 'inventory_move_lines', default_filters: { state: 'done' }, form_view: { side_panel: false } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'pivot', 'form']);
    expect(list.views[0]).toMatchObject({ id: 'list', mobile: false });
    expect(list.views[1]).toMatchObject({ id: 'kanban', mobile: true, group_by: 'movement_type' });
    expect(list.views[2].pivot.default).toMatchObject({ rows: ['date'], columns: ['product_category_name'] });
    expect(list.columns.map((column: any) => column.field)).toEqual([
      'date', 'reference', 'product_name', 'lot_serial_number', 'source_location',
      'destination_location', 'quantity', 'unit_name', 'state', 'done_by',
    ]);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_move_line_detail', editable: false, status_field: 'state' });
  });

  test('seeds deterministic done and todo lines and covers filters, empty, date, pivot, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_moves_history', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_moves_history', ['schema', 'data']);
    const api = yaml('api/moves.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_move_lines');
    const params = { q: null, state: 'done', movement_type: null, from_date: null, to_date: null, fixture_state: null };

    const done = await repository.querySource(source, params, 0, 50);
    expect(done.data).toHaveLength(10);
    expect(done.data.map((row: any) => row.id)).toEqual([
      'move-line-0002', 'move-line-0001', 'move-line-0003', 'move-line-0004', 'move-line-0005',
      'move-line-0006', 'move-line-0007', 'move-line-0008', 'move-line-0009', 'move-line-0010',
    ]);
    expect(done.data.every((row: any) => row.state === 'Done')).toBe(true);
    expect(done.data.every((row: any) => String(row.date).startsWith('2026-'))).toBe(true);

    const todo = await repository.querySource(source, { ...params, state: 'todo' }, 0, 50);
    expect(todo.data.map((row: any) => row.id)).toEqual(['move-line-0016', 'move-line-0015', 'move-line-0013', 'move-line-0012', 'move-line-0011']);
    const searched = await repository.querySource(source, { ...params, q: 'CM-BOX' }, 0, 50);
    expect(searched.data).toMatchObject([{ id: 'move-line-0009', lot_serial_number: 'CM-BOX-00001', product_name: 'Cable Management Box' }]);
    const filtered = await repository.querySource(source, { ...params, movement_type: 'outgoing' }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['move-line-0004', 'move-line-0005', 'move-line-0008', 'move-line-0010']);
    const dated = await repository.querySource(source, { ...params, from_date: '2026-01-14', to_date: '2026-01-15' }, 0, 50);
    expect(dated.data.map((row: any) => row.id)).toEqual(['move-line-0002', 'move-line-0001', 'move-line-0003']);
    expect((await repository.querySource(source, { ...params, q: 'not-a-move' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_MOVE_HISTORY_UNAVAILABLE' });

    const pivot = await repository.querySource(source, params, 0, 50, undefined, undefined, {
      rows: ['product_category_name'], columns: [], measures: [{ field: 'quantity_product_uom', aggregate: 'sum', label: 'Quantity' }],
    });
    expect(pivot.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ product_category_name: 'Furniture', Quantity: 195 }),
      expect.objectContaining({ product_category_name: 'Office Supplies', Quantity: 83 }),
    ]));

    const detail = yaml('api/move-line-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'move-line-0008', fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'move-line-0008', reference: 'WH/OUT/00003', state: 'Done', source_location: 'Stock', destination_location: 'Customers' } });
    expect(await repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).toEqual({ data: {} });
    await expect(repository.querySource(detail, { id: 'move-line-0008', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_MOVE_LINE_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('is explicitly read-only and keeps stale/CRUD mutations out of the report', () => {
    const page = yaml('pages/moves.yaml');
    const api = yaml('api/moves.yaml');
    const detailPage = yaml('pages/move-line-detail.yaml');
    const detailApi = yaml('api/move-line-detail.yaml');
    const migration = yaml('migrations/20260911100000-010-inventory-moves-history.yaml');

    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(api.datasources.every((source: any) => source.permission === 'inventory.read')).toBe(true);
    expect(detailApi.datasources[0].permission).toBe('inventory.read');
    expect(page.actions).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(api.actions).toEqual([{ id: 'view_inventory_move_line', type: 'navigate', permission: 'inventory.read', navigate_to: '/moves/detail', params: { id: '{row.id}' } }]);
    expect(detailApi.actions).toEqual([{ id: 'back_to_inventory_move_history', type: 'navigate', permission: 'inventory.read', navigate_to: '/moves' }]);
    expect(JSON.stringify([page, api, detailPage, detailApi])).not.toMatch(/inventory\.write|inventory\.manage|operation: (create|update|delete)/);
    expect(migration.type.postgres.up).toContain("TIMESTAMP '2026-01-15");
    expect(migration.type.postgres.up).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(api.datasources.find((source: any) => source.id === 'inventory_move_lines').error_states.transport_error).toMatchObject({ status: 503, code: 'INVENTORY_MOVE_HISTORY_UNAVAILABLE' });
  });
});
