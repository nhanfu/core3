import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const params = { q: null, state: null, work_date: null, fixture_state: null };

async function freshRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Timesheets All Timesheets parity slice', () => {
  test('maps the approver action to page/API fragments and the supported Odoo view family', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const detail = yaml('pages/all-timesheets-detail.yaml');
    const detailApi = yaml('api/all-timesheets-detail.yaml');
    const list = page.components[0];

    expect(manifest.menu.groups.find((group: any) => group.id === 'work').items).toContainEqual({ path: '/all-timesheets', label: 'All Timesheets', icon: 'users', permission: 'timesheets.manage' });
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page.id).toBe('all-timesheets');
    expect(page.datasources).toBeUndefined();
    expect(discovered.pages.get('all-timesheets')?.config.page.id).toBe('all-timesheets');
    expect(discovered.pageDatasources.get('all-timesheets')).toContain('all_timesheet_entries');
    expect(routes.find((route) => route.page === 'all-timesheets')?.path).toBe('/all-timesheets');
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'all_timesheet_entries', view_navigation: 'tabs', row_open_action: 'view_all_timesheet_entry', row_double_click_action: 'view_all_timesheet_entry' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar', 'activity', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'calendar')).toMatchObject({ date_field: 'work_date' });
    expect(list.views.find((view: any) => view.id === 'activity')).toMatchObject({ title_field: 'name', record_date_field: 'activity_date' });
    expect(list.views.find((view: any) => view.id === 'pivot').pivot.default.measures).toEqual([
      { field: 'hours', aggregate: 'sum', column: 'Time Spent' },
      { field: 'unit_amount', aggregate: 'sum', column: 'Timesheet Costs' },
    ]);
    expect(api.datasources[0]).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage' });
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'TIMESHEETS_ALL_ENTRIES_UNAVAILABLE' });
    expect(page.actions).toContainEqual(expect.objectContaining({ id: 'view_all_timesheet_entry', navigate_to: '/all-timesheets/detail', params: { id: '{row.id}' } }));
    expect(detail.page).toMatchObject({ id: 'all-timesheets-detail', route: '/all-timesheets/detail', auth: { require: ['timesheets.manage'] } });
    expect(detailApi.page.id).toBe('all-timesheets-detail');
    expect(discovered.pageDatasources.get('all-timesheets-detail')).toContain('all_timesheet_detail');
    expect(detailApi.datasources[0]).toMatchObject({ id: 'all_timesheet_detail', single: true, permission: 'timesheets.manage' });
    expect(detailApi.actions.find((action: any) => action.id === 'edit_all_timesheet_detail')).toMatchObject({ type: 'server_form', permission: 'timesheets.manage' });
  });

  test('returns deterministic multi-user/project/task rows and fixed date filters', async () => {
    const { database, repository } = await freshRepository('timesheets_all_scope_migrations');
    const source = yaml('api/all-timesheets.yaml').datasources[0];
    const all = await repository.querySource(source, params, 0, 50);
    expect(all.meta.total).toBe(15);
    expect(new Set(all.data.map((row: any) => row.employee_name))).toEqual(new Set(['Admin User', 'Morgan Taylor', 'Priya Shah']));
    expect(new Set(all.data.map((row: any) => row.project_name))).toEqual(new Set(['Core3 Implementation', 'Delivery Enablement']));
    expect(new Set(all.data.map((row: any) => row.task_name))).toEqual(new Set(['Complete module migration', 'Requirements analysis', 'Design', 'Quality analysis', 'Delivery', 'Training', 'Presentation', 'Sprint', 'Stakeholder review', 'Design QA', 'Customer workshop', 'Documentation', 'Release planning', 'Sprint retrospective', 'Acceptance review']));
    expect(all.data[0]).toMatchObject({ id: 'timesheet-demo-001', work_date: '2026-01-15', time_spent_display: '08:00', activity_date: '2026-01-15' });
    expect(all.data.every((row: any) => row.activity_count === 1 && row.activity_user === row.employee_name)).toBe(true);
    expect((await repository.querySource(source, { ...params, work_date: 'today' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
    expect((await repository.querySource(source, { ...params, work_date: 'this_week' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-my-009', 'timesheet-report-002', 'timesheet-my-010', 'timesheet-report-003', 'timesheet-my-011', 'timesheet-report-004']);
    expect((await repository.querySource(source, { ...params, work_date: 'last_week' }, 0, 50)).meta.total).toBe(8);
    expect((await repository.querySource(source, { ...params, q: 'Morgan' }, 0, 50)).data.every((row: any) => row.employee_name === 'Morgan Taylor')).toBe(true);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'TIMESHEETS_ALL_ENTRIES_UNAVAILABLE' });
    database.close();
  });

  test('keeps personal edits scoped while approver detail edits validate and reject stale/cancelled rows', async () => {
    const { database, repository } = await freshRepository('timesheets_all_edit_migrations');
    const personalEdit = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'edit_timesheet_entry');
    const allEdit = yaml('api/all-timesheets-detail.yaml').actions.find((action: any) => action.id === 'edit_all_timesheet_detail');
    const detailSource = yaml('api/all-timesheets-detail.yaml').datasources[0];
    expect((await repository.querySource(detailSource, { id: 'timesheet-report-003', fixture_state: null }, 0, 1)).data).toMatchObject({ employee_name: 'Morgan Taylor' });
    const edited = await repository.executeMutation(allEdit.mutation, { id: 'timesheet-report-003', expected_row_version: 1, values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', task_name: 'Design updated', description: 'Design updated', hours: 4.5 } });
    expect(edited).toMatchObject({ id: 'timesheet-report-003', employee_name: 'Morgan Taylor', hours: 4.5, row_version: 2 });
    const staleInput = { id: 'timesheet-report-003', expected_row_version: 1, values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Stale', hours: 3 } };
    await expect(repository.executeMutation(allEdit.mutation, staleInput)).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const invalidInput = { id: 'timesheet-report-003', expected_row_version: 2, values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Invalid', hours: 25 } };
    await expect(repository.executeMutation(allEdit.mutation, invalidInput)).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_ENTRY_INVALID' });
    await expect(repository.executeMutation(allEdit.mutation, { id: 'missing-timesheet', expected_row_version: 1, values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Missing', hours: 1 } })).rejects.toMatchObject({ status: 403, code: 'TIMESHEETS_ALL_ENTRY_SCOPE' });
    const cancel = yaml('pages/timesheet-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'cancel').mutation;
    await repository.executeMutation(cancel, { id: 'timesheet-report-003' });
    await expect(repository.executeMutation(allEdit.mutation, { id: 'timesheet-report-003', expected_row_version: 3, values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Cancelled', hours: 1 } })).rejects.toMatchObject({ status: 403, code: 'TIMESHEETS_ALL_ENTRY_SCOPE' });
    expect(personalEdit.mutation.guards[0].query).toContain('employee_name');
    database.close();
  });
});
