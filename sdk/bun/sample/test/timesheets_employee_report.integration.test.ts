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
const valid = {
  employee_id: 'employee-demo-002', expected_entry_count: 3,
  requested_by: 'Admin User', company_name: 'Core3 Demo Company',
  current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
};

describe('Timesheets employee-context report action parity', () => {
  test('maps the Odoo employee action to a separate YAML page/API report contract', () => {
    const page = yaml('pages/employee-timesheets.yaml');
    const api = yaml('api/employee-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const employeeSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_employee.py', 'utf8');
    expect(source).toContain('<record id="timesheet_action_from_employee" model="ir.actions.act_window">');
    expect(source).toContain("('employee_id', '=', active_id)");
    expect(employeeSource).toContain('hr_timesheet.timesheet_action_from_employee');
    expect(page.page).toMatchObject({ id: 'employee-timesheets', route: '/employee-timesheets' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'print_employee_timesheets_report', label: 'Print', permission: 'timesheets.read', variant: 'secondary' });
    expect(api.page).toEqual({ id: 'employee-timesheets' });
    expect(api.datasources.map((item: any) => item.id)).toEqual(expect.arrayContaining(['employee_timesheet_report_context', 'employee_timesheet_report_runs']));
    expect(api.actions.find((action: any) => action.id === 'print_employee_timesheets_report')).toMatchObject({ type: 'client', permission: 'timesheets.read' });
    expect(api.actions.find((action: any) => action.id === 'record_employee_timesheets_report_run')).toMatchObject({ type: 'server', operation: 'report', handler: 'yaml_mutation', permission: 'timesheets.read' });
  });

  test('records the employee report and preserves it through migration replay and restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-employee-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_employee_report_restart', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_employee_report_restart', ['schema', 'data']);
    const api = yaml('api/employee-timesheets.yaml');
    const context = api.datasources.find((item: any) => item.id === 'employee_timesheet_report_context');
    const history = api.datasources.find((item: any) => item.id === 'employee_timesheet_report_runs');
    const mutation = api.actions.find((action: any) => action.id === 'record_employee_timesheets_report_run').mutation;
    expect((await repository.querySource(context, valid, 0, 1)).data).toMatchObject({ employee_id: valid.employee_id, employee_name: 'Morgan Taylor', entry_count: 3, total_hours: 13.5 });
    const created = await repository.executeMutation(mutation, valid);
    expect(created).toMatchObject({ id: 'timesheet-employee-report-run-employee-demo-002-2', employee_id: valid.employee_id, employee_name: 'Morgan Taylor', entry_count: 3, total_hours: 13.5, requested_by: 'Admin User' });
    expect((await repository.querySource(history, valid, 0, 10)).data).toHaveLength(2);
    first.close();
    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect((await reopened.querySource(history, valid, 0, 10)).data.map((row: any) => row.id)).toEqual(['timesheet-employee-report-run-employee-demo-002-2', 'timesheet-employee-report-run-demo-002']);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects missing, empty, stale, actor, and company reports without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_employee_report_guards', ['schema', 'data']);
    const mutation = yaml('api/employee-timesheets.yaml').actions.find((action: any) => action.id === 'record_employee_timesheets_report_run').mutation;
    await expect(repository.executeMutation(mutation, { ...valid, employee_id: 'missing-employee' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEE_TIMESHEET_REPORT_EMPLOYEE_NOT_FOUND' });
    await repository.run("INSERT INTO timesheet_employees(id, name, company_name, hourly_cost, active) VALUES ('employee-empty-001', 'Empty Employee', 'Core3 Demo Company', 50, TRUE)");
    await expect(repository.executeMutation(mutation, { ...valid, employee_id: 'employee-empty-001', expected_entry_count: 0 })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEE_TIMESHEET_REPORT_EMPTY' });
    await expect(repository.executeMutation(mutation, { ...valid, employee_id: 'employee-demo-001', expected_entry_count: 0 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_TIMESHEET_REPORT_STALE' });
    await expect(repository.executeMutation(mutation, { ...valid, expected_entry_count: 99 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_TIMESHEET_REPORT_STALE' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEE_TIMESHEET_REPORT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEE_TIMESHEET_REPORT_COMPANY' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_employee_report_runs WHERE employee_id = 'employee-demo-002'")).at(0)?.count).toBe(1);
    database.close();
  });

  test('keeps employee report fixtures deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920170000-014-timesheets-employee-report-runs.yaml'), 'utf8');
    expect(migration).toContain("'timesheet-employee-report-run-demo-002'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
