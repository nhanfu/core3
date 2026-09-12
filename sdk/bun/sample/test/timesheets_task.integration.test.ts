import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Timesheets task-context action parity', () => {
  test('binds Odoo task action to a page/API pair and task stat button', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const taskPage = yaml('../project/pages/project-task-detail.yaml');
    const taskApi = yaml('../project/api/task-detail.yaml');
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(discovered.pages.get('task-timesheets')?.config.page.id).toBe('task-timesheets');
    expect(discovered.pageDatasources.get('task-timesheets')).toContain('task_timesheet_entries');
    expect(routes.find((route) => route.page === 'task-timesheets')?.path).toBe('/task-timesheets');
    expect(taskPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'open_task_timesheets', label: 'Timesheets' }));
    expect(taskApi.actions).toContainEqual(expect.objectContaining({ id: 'open_task_timesheets', navigate_to: '/task-timesheets', params: { task_id: '{state.id}' } }));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'TASK_TIMESHEETS_UNAVAILABLE' });
  });

  test('keeps task scope, filters, empty/error fixtures, and CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_scope_migrations', ['schema', 'data']);
    const api = yaml('api/task-timesheets.yaml');
    const source = api.datasources[0];
    const params = { task_id: 'task-demo-001', q: null, state: null, work_date: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
    expect((await repository.querySource(source, { ...params, work_date: 'today' }, 0, 50)).data.every((row: any) => row.work_date === '2026-01-15')).toBe(true);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'TASK_TIMESHEETS_UNAVAILABLE' });
    database.close();
  });

  test('supports scoped create/edit/delete and rejects invalid, stale, and cross-task mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_crud_migrations', ['schema', 'data']);
    const api = yaml('api/task-timesheets.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_task_timesheet_entry').mutation;
    const update = api.actions.find((action: any) => action.id === 'edit_task_timesheet_entry').mutation;
    const remove = api.actions.find((action: any) => action.id === 'delete_task_timesheet_entry').mutation;
    const values = { name: 'TS/2026/TASK', employee_id: 'employee-demo-001', employee_name: 'Admin User', project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration', work_date: '2026-01-15', description: 'Task review', hours: 2 };
    expect(await repository.executeMutation(create, { id: 'timesheet-task-test', values })).toMatchObject({ id: 'timesheet-task-test', task_id: 'task-demo-001', state: 'Draft' });
    await expect(repository.executeMutation(create, { id: 'timesheet-task-invalid', values: { ...values, hours: 25 } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_ENTRY_INVALID' });
    expect(await repository.executeMutation(update, { id: 'timesheet-task-test', task_id: 'task-demo-001', expected_row_version: 1, values: { work_date: '2026-01-15', description: 'Updated task review', hours: 3 } })).toMatchObject({ row_version: 2, hours: 3 });
    await expect(repository.executeMutation(update, { id: 'timesheet-task-test', task_id: 'task-demo-001', expected_row_version: 1, values: { work_date: '2026-01-15', description: 'Stale', hours: 3 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update, { id: 'timesheet-task-test', task_id: 'task-demo-002', expected_row_version: 2, values: { work_date: '2026-01-15', description: 'Wrong task', hours: 2 } })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_SCOPE' });
    expect(await repository.executeMutation(remove, { id: 'timesheet-task-test', task_id: 'task-demo-001', expected_row_version: 2 })).toEqual({ id: 'timesheet-task-test', deleted: true });
    database.close();
  });
});
