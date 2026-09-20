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
  project_id: 'project-demo-001', task_id: 'task-demo-001', date_from: '2026-01-19', date_to: '2026-01-21',
  hours: 6, description: 'Calendar migration work', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
};

describe('Timesheets Odoo calendar multi-create parity', () => {
  test('maps Odoo calendar and multi-create source contracts to separate YAML page/API actions', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const calendar = page.components[0].views.find((view: any) => view.id === 'calendar');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_timesheet_calendar_batch');

    expect(odoo).toContain('multi_create_view="hr_timesheet.view_calendar_account_analytic_line_multi_create"');
    expect(odoo).toContain('<record id="view_calendar_account_analytic_line_multi_create"');
    expect(calendar).toMatchObject({ id: 'calendar', date_field: 'work_date' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'create_timesheet_calendar_batch', label: 'Log multiple days', permission: 'timesheets.write', variant: 'secondary' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'timesheets.write', operation: 'create', handler: 'yaml_mutation' });
    expect(action.mutation.steps.map((step: any) => step.query).join('\n')).toContain('generate_series');
    expect(action.mutation.result.query).toContain('timesheet_entry_batches');
  });

  test('creates a durable draft entry for each selected day and survives a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-calendar-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_calendar_multi_create', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_calendar_multi_create', ['schema', 'data']);

    const action = yaml('api/entries.yaml').actions.find((candidate: any) => candidate.id === 'create_timesheet_calendar_batch');
    const created = await repository.executeMutation(action.mutation, input);
    expect(created).toMatchObject({
      id: 'timesheet-calendar-batch-admin-user-2026-01-19-2026-01-21-1', employee_name: 'Admin User',
      project_name: 'Core3 Implementation', task_name: 'Complete module migration', date_from: '2026-01-19', date_to: '2026-01-21',
      description: 'Calendar migration work', hours: 6, entry_count: 3, state: 'Draft', row_version: 2,
    });
    expect(await repository.query("SELECT id, work_date, hours, state FROM timesheet_entries WHERE id LIKE 'timesheet-calendar-batch-admin-user-2026-01-19-2026-01-21-1-entry-%' ORDER BY work_date")).toHaveLength(3);
    expect((await repository.query("SELECT work_date, hours, state FROM timesheet_entries WHERE id LIKE 'timesheet-calendar-batch-admin-user-2026-01-19-2026-01-21-1-entry-%' ORDER BY work_date")).map((row: any) => ({ work_date: String(row.work_date).slice(0, 10), hours: Number(row.hours), state: row.state }))).toEqual([
      { work_date: '2026-01-19', hours: 6, state: 'Draft' }, { work_date: '2026-01-20', hours: 6, state: 'Draft' }, { work_date: '2026-01-21', hours: 6, state: 'Draft' },
    ]);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect(await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entry_batches WHERE id = 'timesheet-calendar-batch-admin-user-2026-01-19-2026-01-21-1'")).toEqual([{ count: 1 }]);
    expect(await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE id LIKE 'timesheet-calendar-batch-admin-user-2026-01-19-2026-01-21-1-entry-%'")).toEqual([{ count: 3 }]);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('enforces range, time, relation, employee, and no-partial-write boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_calendar_guards', ['schema', 'data']);
    const mutation = yaml('api/entries.yaml').actions.find((candidate: any) => candidate.id === 'create_timesheet_calendar_batch').mutation;
    const count = () => repository.query("SELECT COUNT(*) AS count FROM timesheet_entry_batches WHERE id LIKE 'timesheet-calendar-batch-%'");

    await expect(repository.executeMutation(mutation, { ...input, date_to: '2026-02-20' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_CALENDAR_RANGE_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, hours: 0 })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_CALENDAR_HOURS_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, task_id: 'task-demo-closed' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_CALENDAR_TASK_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, project_id: 'project-demo-closed' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_CALENDAR_PROJECT_INVALID' });
    await expect(repository.executeMutation(mutation, { ...input, current_user_name: 'Fleet User' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_CALENDAR_EMPLOYEE_SCOPE' });
    expect(await count()).toEqual([{ count: 1 }]);
    database.close();
  });

  test('keeps the migration seed deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920130000-010-timesheets-calendar-multi-create.yaml'), 'utf8');
    expect(migration).toContain("'timesheet-calendar-batch-demo-001'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
