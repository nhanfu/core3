import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Timesheets project-scoped action parity', () => {
  test('binds the Project action to a separate page/API pair', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const page = yaml('pages/project-timesheets.yaml');
    const api = yaml('api/project-timesheets.yaml');
    const projectDetail = yaml('../project/pages/project-detail.yaml');
    const projectApi = yaml('../project/api/project-detail.yaml');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-timesheets', route: '/project-timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'project-timesheets' });
    expect(discovered.pages.get('project-timesheets')?.config.page.id).toBe('project-timesheets');
    expect(discovered.pageDatasources.get('project-timesheets')).toContain('project_timesheet_entries');
    expect(routes.find((route) => route.page === 'project-timesheets')?.path).toBe('/project-timesheets');
    expect(projectDetail.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'open_project_timesheets', label: 'Timesheets' }));
    expect(projectApi.actions).toContainEqual(expect.objectContaining({ id: 'open_project_timesheets', navigate_to: '/project-timesheets', params: { project_id: '{state.id}' } }));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'pivot', 'graph', 'form']);
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_TIMESHEETS_UNAVAILABLE' });
    expect(api.actions.filter((action: any) => action.permission === 'timesheets.write').map((action: any) => action.id)).toEqual(expect.arrayContaining(['create_project_timesheet_entry', 'edit_project_timesheet_entry', 'delete_project_timesheet_entry', 'submit_project_timesheet_entry']));
  });

  test('returns fixed project scope, filters and empty/error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_scope_migrations', ['schema', 'data']);
    const source = yaml('api/project-timesheets.yaml').datasources[0];

    const rows = await repository.querySource(source, { project_id: 'project-demo-001', q: null, state: null, work_date: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-my-009', 'timesheet-report-002', 'timesheet-my-010', 'timesheet-report-003', 'timesheet-report-004', 'timesheet-my-013', 'timesheet-my-015']);
    expect(rows.data.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
    expect((await repository.querySource(source, { project_id: 'project-demo-001', q: 'Stakeholder', state: null, work_date: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { project_id: 'project-demo-001', q: null, state: null, work_date: 'today', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
    expect((await repository.querySource(source, { project_id: 'project-demo-001', q: null, state: null, work_date: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { project_id: 'project-demo-001', q: null, state: null, work_date: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PROJECT_TIMESHEETS_UNAVAILABLE' });
    database.close();
  });

  test('supports scoped create/edit/delete and rejects invalid or protected mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_crud_migrations', ['schema', 'data']);
    const api = yaml('api/project-timesheets.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_project_timesheet_entry').mutation;
    const update = api.actions.find((action: any) => action.id === 'edit_project_timesheet_entry').mutation;
    const remove = api.actions.find((action: any) => action.id === 'delete_project_timesheet_entry').mutation;

    const created = await repository.executeMutation(create, { id: 'timesheet-project-test', values: { name: 'TS/2026/PROJECT', project_id: 'project-demo-001', project_name: 'Core3 Implementation', work_date: '2026-01-15', description: 'Project review', hours: 2 } });
    expect(created).toMatchObject({ id: 'timesheet-project-test', project_id: 'project-demo-001', state: 'Draft' });
    await expect(repository.executeMutation(create, { id: 'timesheet-project-invalid', values: { name: 'TS/INVALID', project_id: 'project-demo-001', project_name: 'Core3 Implementation', work_date: '2026-01-15', description: 'Invalid', hours: 25 } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_ENTRY_INVALID' });
    expect(await repository.executeMutation(update, { id: 'timesheet-project-test', expected_row_version: 1, values: { work_date: '2026-01-15', task_name: 'Updated task', description: 'Updated project review', hours: 3 } })).toMatchObject({ id: 'timesheet-project-test', row_version: 2, hours: 3 });
    await expect(repository.executeMutation(update, { id: 'timesheet-project-test', expected_row_version: 1, values: { work_date: '2026-01-15', description: 'Stale', hours: 3 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update, { id: 'timesheet-report-005', expected_row_version: 1, values: { work_date: '2026-01-15', description: 'Approved', hours: 2 } })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TIMESHEET_SCOPE' });
    expect(await repository.executeMutation(remove, { id: 'timesheet-project-test', expected_row_version: 2 })).toEqual({ id: 'timesheet-project-test', deleted: true });
    database.close();
  });
});
