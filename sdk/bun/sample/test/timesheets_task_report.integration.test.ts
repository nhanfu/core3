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
const valid = { task_id: 'task-demo-001', expected_entry_count: 1, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets Odoo task report binding parity', () => {
  test('maps the Odoo project.task report action to the task-context page/API pair', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/report_timesheet_templates.xml', 'utf8');
    expect(odoo).toContain('<record id="timesheet_report_task" model="ir.actions.report">');
    expect(odoo).toContain('<field name="model">project.task</field>');
    expect(page.components[0].header_actions).toContainEqual({ id: 'print_task_timesheets_report', label: 'Print', permission: 'timesheets.read', variant: 'secondary' });
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['task_timesheet_context', 'timesheet_task_report_runs']));
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'print_task_timesheets_report', type: 'client', permission: 'timesheets.read' }));
    expect(api.actions.find((action: any) => action.id === 'record_task_timesheets_report_run')).toMatchObject({ type: 'server', operation: 'report', handler: 'yaml_mutation', permission: 'timesheets.read' });
  });

  test('records a task report run and preserves it across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_report_runs', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_report_runs', ['schema', 'data']);
    const api = yaml('api/task-timesheets.yaml');
    const context = api.datasources.find((source: any) => source.id === 'task_timesheet_context');
    const history = api.datasources.find((source: any) => source.id === 'timesheet_task_report_runs');
    const mutation = api.actions.find((action: any) => action.id === 'record_task_timesheets_report_run').mutation;
    expect((await repository.querySource(context, valid, 0, 1)).data).toMatchObject({ id: 'task-demo-001', entry_count: 1, total_hours: 8 });
    const created = await repository.executeMutation(mutation, valid);
    expect(created).toMatchObject({ id: 'timesheet-task-report-run-task-demo-001-2', task_id: 'task-demo-001', task_name: 'Complete module migration', project_name: 'Core3 Implementation', requested_by: 'Admin User', entry_count: 1, total_hours: 8, row_version: 1 });
    expect((await repository.querySource(history, valid, 0, 10)).data).toHaveLength(2);
    first.close();
    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect((await reopened.querySource(history, valid, 0, 10)).data.map((row: any) => row.id)).toEqual(['timesheet-task-report-run-task-demo-001-2', 'timesheet-task-report-run-demo-001']);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects missing, empty, stale, actor, and company report requests without a partial run', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_report_guards', ['schema', 'data']);
    const mutation = yaml('api/task-timesheets.yaml').actions.find((action: any) => action.id === 'record_task_timesheets_report_run').mutation;
    await expect(repository.executeMutation(mutation, { ...valid, task_id: 'missing-task' })).rejects.toMatchObject({ status: 404, code: 'TASK_TIMESHEET_REPORT_TASK_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { ...valid, task_id: 'task-demo-closed', expected_entry_count: 0 })).rejects.toMatchObject({ status: 404, code: 'TASK_TIMESHEET_REPORT_EMPTY' });
    await expect(repository.executeMutation(mutation, { ...valid, expected_entry_count: 99 })).rejects.toMatchObject({ status: 409, code: 'TASK_TIMESHEET_REPORT_STALE' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_REPORT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_REPORT_COMPANY' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_task_report_runs WHERE task_id = 'task-demo-001'")).at(0)?.count).toBe(1);
    database.close();
  });

  test('keeps the task report fixture deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920140000-011-timesheets-task-report-runs.yaml'), 'utf8');
    expect(migration).toContain("'timesheet-task-report-run-demo-001'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
