import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Timesheets employee-context action parity', () => {
  test('binds the employee record action to a separate page/API pair', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = discoverPageRoutes(discovered);
    const page = yaml('pages/employee-timesheets.yaml');
    const api = yaml('api/employee-timesheets.yaml');
    const employeeDetail = yaml('../employees/pages/employee-detail.yaml');
    const employeeApi = yaml('../employees/api/employee-detail.yaml');
    expect(page.page).toMatchObject({ id: 'employee-timesheets', route: '/employee-timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'employee-timesheets' });
    expect(discovered.pages.get('employee-timesheets')?.config.page.id).toBe('employee-timesheets');
    expect(discovered.pageDatasources.get('employee-timesheets')).toContain('employee_timesheet_entries');
    expect(routes.find((route) => route.page === 'employee-timesheets')?.path).toBe('/employee-timesheets');
    expect(employeeDetail.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'open_employee_timesheets', label: 'Timesheets' }));
    expect(employeeApi.actions).toContainEqual(expect.objectContaining({ id: 'open_employee_timesheets', navigate_to: '/employee-timesheets', params: { employee_id: '{state.id}' } }));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMPLOYEE_TIMESHEETS_UNAVAILABLE' });
  });

  test('keeps employee scope, fixed date filters, empty/error fixtures, and CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_scope_migrations', ['schema', 'data']);
    const api = yaml('api/employee-timesheets.yaml');
    const source = api.datasources[0];
    const params = { employee_id: 'employee-demo-002', q: null, state: null, work_date: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-report-002', 'timesheet-report-003', 'timesheet-report-007']);
    expect(rows.data.every((row: any) => row.employee_id === 'employee-demo-002' && row.employee_name === 'Morgan Taylor')).toBe(true);
    expect((await repository.querySource(source, { ...params, work_date: 'this_week' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-report-002', 'timesheet-report-003']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEE_TIMESHEETS_UNAVAILABLE' });
    const create = api.actions.find((action: any) => action.id === 'create_employee_timesheet_entry').mutation;
    const update = api.actions.find((action: any) => action.id === 'edit_employee_timesheet_entry').mutation;
    const remove = api.actions.find((action: any) => action.id === 'delete_employee_timesheet_entry').mutation;
    const values = { name: 'TS/2026/EMPLOYEE', employee_id: 'employee-demo-002', employee_name: 'Morgan Taylor', project_id: 'project-demo-001', project_name: 'Core3 Implementation', work_date: '2026-01-15', description: 'Employee review', hours: 2 };
    expect(await repository.executeMutation(create, { id: 'timesheet-employee-test', values })).toMatchObject({ id: 'timesheet-employee-test', employee_id: 'employee-demo-002', state: 'Draft' });
    await expect(repository.executeMutation(create, { id: 'timesheet-employee-invalid', values: { ...values, name: 'TS/2026/INVALID', hours: 25 } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_ENTRY_INVALID' });
    expect(await repository.executeMutation(update, { id: 'timesheet-employee-test', employee_id: 'employee-demo-002', expected_row_version: 1, values: { work_date: '2026-01-15', description: 'Updated employee review', hours: 3 } })).toMatchObject({ row_version: 2, hours: 3 });
    await expect(repository.executeMutation(update, { id: 'timesheet-employee-test', employee_id: 'employee-demo-001', expected_row_version: 2, values: { work_date: '2026-01-15', description: 'Wrong employee', hours: 2 } })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEE_TIMESHEET_SCOPE' });
    expect(await repository.executeMutation(remove, { id: 'timesheet-employee-test', employee_id: 'employee-demo-002', expected_row_version: 2 })).toEqual({ id: 'timesheet-employee-test', deleted: true });
    database.close();
  });
});
