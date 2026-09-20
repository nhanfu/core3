import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

const input = {
  employee_id: 'employee-demo-002', employee_name: 'Demo Employee', project_id: 'project-demo-001', task_id: 'task-demo-001',
  date_from: '2026-01-19', date_to: '2026-01-21', hours: 6, description: 'All calendar migration work',
  current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
};

const migrations = join(serviceRoot, 'migrations');

describe('Timesheets All Timesheets calendar multi-create parity', () => {
  test('maps the Odoo All Timesheets calendar multi-create to separate page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const calendar = page.components[0].views.find((view: any) => view.id === 'calendar');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_all_timesheet_calendar_batch');

    expect(odoo).toContain('<record id="timesheet_action_view_all_calendar"');
    expect(odoo).toContain('<field name="view_id" ref="view_calendar_account_analytic_line"/>');
    expect(odoo).toContain('multi_create_view="hr_timesheet.view_calendar_account_analytic_line_multi_create"');
    expect(calendar).toMatchObject({ id: 'calendar', date_field: 'work_date' });
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'create_all_timesheet_calendar_batch', label: 'Log multiple days', permission: 'timesheets.manage', variant: 'secondary' });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(api.datasources.find((source: any) => source.id === 'all_timesheet_employees')).toMatchObject({ permission: 'timesheets.manage' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'timesheets.manage', operation: 'create', handler: 'yaml_mutation' });
    expect(action.fields).toContainEqual({ field: 'employee_id', label: 'Employee', type: 'select', options_source: 'all_timesheet_employees', required: true });
    expect(action.mutation.steps.map((step: any) => step.query).join('\n')).toContain('generate_series');
    expect(action.mutation.result.query).toContain('timesheet_entry_batches');
  });

  test('creates selected employee entries durably and preserves them after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-calendar-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_all_calendar_multi_create', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_all_calendar_multi_create', ['schema', 'data']);

    const action = yaml('api/all-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_all_timesheet_calendar_batch');
    const created = await repository.executeMutation(action.mutation, input);
    expect(created).toMatchObject({
      id: 'timesheet-all-calendar-batch-demo-employee-2026-01-19-2026-01-21-1', employee_id: 'employee-demo-002', employee_name: 'Demo Employee',
      company_name: 'Core3 Demo Company', project_name: 'Core3 Implementation', task_name: 'Complete module migration',
      date_from: '2026-01-19', date_to: '2026-01-21', description: 'All calendar migration work', hours: 6, entry_count: 3, state: 'Draft', row_version: 2,
    });
    expect((await repository.query("SELECT employee_id, work_date, hours, state FROM timesheet_entries WHERE id LIKE 'timesheet-all-calendar-batch-demo-employee-%-entry-%' ORDER BY work_date")).map((row: any) => ({ employee_id: row.employee_id, work_date: String(row.work_date).slice(0, 10), hours: Number(row.hours), state: row.state }))).toEqual([
      { employee_id: 'employee-demo-002', work_date: '2026-01-19', hours: 6, state: 'Draft' },
      { employee_id: 'employee-demo-002', work_date: '2026-01-20', hours: 6, state: 'Draft' },
      { employee_id: 'employee-demo-002', work_date: '2026-01-21', hours: 6, state: 'Draft' },
    ]);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect(await reopened.query("SELECT employee_id, entry_count, row_version FROM timesheet_entry_batches WHERE id = 'timesheet-all-calendar-batch-demo-employee-2026-01-19-2026-01-21-1'")).toEqual([
      { employee_id: 'employee-demo-002', entry_count: 3, row_version: 2 },
    ]);
    expect(await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE id LIKE 'timesheet-all-calendar-batch-demo-employee-%-entry-%'")).toEqual([{ count: 3 }]);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps manager/company, relation, range, and no-partial-write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_all_calendar_guards', ['schema', 'data']);
    const mutation = yaml('api/all-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_all_timesheet_calendar_batch').mutation;
    const count = () => repository.query("SELECT COUNT(*) AS count FROM timesheet_entry_batches WHERE id LIKE 'timesheet-all-calendar-batch-%'");

    await expect(repository.executeMutation(mutation, { ...input, employee_name: 'Admin User' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_ALL_CALENDAR_EMPLOYEE_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_ALL_CALENDAR_EMPLOYEE_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, date_to: '2026-02-20' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_ALL_CALENDAR_RANGE_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, project_id: 'project-demo-closed' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_ALL_CALENDAR_PROJECT_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, task_id: 'task-demo-closed' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_ALL_CALENDAR_TASK_INVALID' });
    expect(await count()).toEqual([{ count: 0 }]);
    database.close();
  });

  test('keeps the existing deterministic calendar migration replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920130000-010-timesheets-calendar-multi-create.yaml'), 'utf8');
    expect(migration).toContain("'timesheet-calendar-batch-demo-001'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
