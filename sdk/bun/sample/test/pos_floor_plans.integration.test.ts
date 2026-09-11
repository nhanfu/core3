import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Floor Plans parity', () => {
  test('registers the Odoo configuration action and keeps every page/API pair joined', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const listPage = yaml('pages/pos-floor-plans.yaml');
    const listApi = yaml('api/pos-floor-plans.yaml');
    const detailPage = yaml('pages/pos-floor-plan-detail.yaml');
    const detailApi = yaml('api/pos-floor-plan-detail.yaml');
    const newPage = yaml('pages/pos-floor-plan-new.yaml');
    const newApi = yaml('api/pos-floor-plan-new.yaml');

    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/floor-plans', label: 'Floor Plans', permission: 'pos.read' }));
    expect(listPage.page.id).toBe('pos-floor-plans');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailPage.page.id).toBe('pos-floor-plan-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newPage.page.id).toBe('pos-floor-plan-new');
    expect(newApi.page.id).toBe(newPage.page.id);

    const list = listPage.components.find((component: any) => component.type === 'ListView');
    expect(list).toMatchObject({ create_action: 'new_pos_floor_plan', row_open_action: 'view_pos_floor_plan', row_double_click_action: 'view_pos_floor_plan', responsive_card: true });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Floor Name', 'Point of Sales']);
    expect(list.views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);

    const grid = detailPage.components.find((component: any) => component.type === 'LineItemGrid');
    expect(grid).toMatchObject({ source: 'pos_floor_plan_tables', parent_source: 'pos_floor_plan_detail', variant: 'odoo_x2many' });
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'add_pos_floor_plan_table', permission: 'pos.manage' }));
    expect(grid.columns.map((column: any) => column.label)).toEqual(['Table Number', 'Seats', 'Shape', '']);
  });

  test('seeds five Odoo-shaped floor plans and explicit empty/error sources', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_floor_plans_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-floor-plans.yaml').datasources[0];
    const detailApi = yaml('api/pos-floor-plan-detail.yaml');
    const rows = await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(5);
    expect(rows.data.map((row: any) => row.name)).toEqual([
      'Main Floor', 'Patio', 'My Company (San Francisco)', 'My Company (San Francisco)', 'My Company (San Francisco)',
    ]);
    expect(rows.data[0]).toMatchObject({ point_of_sale_names: 'Restaurant, Bar', table_count: 1, row_version: 1 });
    expect((await repository.querySource(listSource, { q: 'Kiosk', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_FLOOR_PLANS_UNAVAILABLE' });

    const detail = await repository.querySource(detailApi.datasources[0], { id: 'pos-floor-main', fixture_state: null }, 0, 1);
    const tables = await repository.querySource(detailApi.datasources[1], { id: 'pos-floor-main', fixture_state: null }, 0, 50);
    expect(detail.data).toMatchObject({ id: 'pos-floor-main', name: 'Main Floor', point_of_sale_names: 'Restaurant, Bar' });
    expect(tables.data).toEqual([expect.objectContaining({ table_number: 1, seats: 1, shape: 'Square' })]);
    expect((await repository.querySource(detailApi.datasources[0], { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('guards floor and table CRUD with permissions, validation, in-use, and optimistic concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_floor_plans_crud_migrations', ['schema', 'data']);
    const listApi = yaml('api/pos-floor-plans.yaml');
    const detailApi = yaml('api/pos-floor-plan-detail.yaml');
    const create = action(listApi, 'create_pos_floor_plan');
    const edit = action(detailApi, 'edit_pos_floor_plan');
    const remove = action(detailApi, 'delete_pos_floor_plan');
    const addTable = action(detailApi, 'add_pos_floor_plan_table');
    const editTable = action(detailApi, 'edit_pos_floor_plan_table');
    const removeTable = action(detailApi, 'delete_pos_floor_plan_table');

    for (const candidate of [create, edit, remove, addTable, editTable, removeTable]) expect(candidate.permission).toBe('pos.manage');
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_FLOOR_PLAN_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'main floor' } })).rejects.toMatchObject({ status: 409, code: 'POS_FLOOR_PLAN_NAME_EXISTS' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Garden Floor', point_of_sale_names: 'Restaurant', sequence: 60 } });
    expect(created).toMatchObject({ name: 'Garden Floor', point_of_sale_names: 'Restaurant', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Garden Floor Updated', point_of_sale_names: 'Restaurant, Bar', sequence: 60 } });
    expect(edited).toMatchObject({ name: 'Garden Floor Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Floor' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(remove.mutation, { id: 'pos-floor-main', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'POS_FLOOR_PLAN_IN_USE' });

    const added = await repository.executeMutation(addTable.mutation, { id: created.id, parent_expected_row_version: 2, values: { table_number: 7, seats: 4, shape: 'Round' } });
    expect(added).toMatchObject({ floor_plan_id: created.id, table_number: 7, seats: 4, shape: 'Round', row_version: 1 });
    await expect(repository.executeMutation(addTable.mutation, { id: created.id, parent_expected_row_version: 3, values: { table_number: 7, seats: 4, shape: 'Round' } })).rejects.toMatchObject({ status: 409, code: 'POS_FLOOR_PLAN_TABLE_EXISTS' });
    await expect(repository.executeMutation(editTable.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 3, expected_row_version: 1, values: { table_number: 8, seats: 6, shape: 'Rectangle' } })).resolves.toMatchObject({ table_number: 8, seats: 6, row_version: 2 });
    await expect(repository.executeMutation(editTable.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 1, values: { table_number: 9, seats: 6, shape: 'Square' } })).rejects.toMatchObject({ status: 409, code: 'POS_FLOOR_PLAN_TABLE_STALE' });
    await repository.executeMutation(removeTable.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 2 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 })).rejects.toMatchObject({ status: 404, code: 'POS_FLOOR_PLAN_NOT_FOUND' });
    database.close();
  });
});
