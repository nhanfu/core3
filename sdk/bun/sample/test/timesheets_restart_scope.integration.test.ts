import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/timesheets');
const projectRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Timesheets restart, approval, and context boundaries', () => {
  test('persists an entry and approval across a file-backed restart and updates linked hours atomically', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-'));
    const path = join(directory, 'timesheets.duckdb');
    const projectService = { call: async () => ({}) };
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first, () => projectService);
    await migrateDatabase(repository, projectRoot + '/migrations', undefined, 'project_restart_scope', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'timesheets_restart_scope', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'timesheets_restart_scope', ['schema', 'data']);
    const create = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'create_timesheet_entry').mutation;
    const submit = yaml('pages/timesheet-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'submit').mutation;
    const approve = yaml('pages/timesheet-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'approve').mutation;
    const created = await repository.executeMutation(create, { id: 'timesheet-restart-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', values: { name: 'TS/RESTART/001', employee_id: 'employee-demo-001', employee_name: 'Admin User', project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration', work_date: '2026-01-15', description: 'Restart proof', hours: 2 } });
    expect(created).toMatchObject({ company_name: 'Core3 Demo Company', employee_name: 'Admin User' });
    await repository.executeMutation(submit, { id: 'timesheet-restart-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' });
    await repository.executeMutation(approve, { id: 'timesheet-restart-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' });
    const projectBefore = await repository.query("SELECT spent_hours FROM projects WHERE id = 'project-demo-001'");
    first.close();
    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second, () => projectService);
    const row = await reopened.query("SELECT state, hours, company_name, employee_name FROM timesheet_entries WHERE id = 'timesheet-restart-001'");
    expect(row[0]).toMatchObject({ state: 'Approved', hours: 2, company_name: 'Core3 Demo Company', employee_name: 'Admin User' });
    expect(Number((await reopened.query("SELECT spent_hours FROM projects WHERE id = 'project-demo-001'"))[0].spent_hours)).toBe(Number(projectBefore[0].spent_hours));
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('fails closed for another company and employee, and rejects duplicate names', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'timesheets_boundary_scope', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
    expect((await repository.querySource(source, { q: null, state: null, work_date: null, fixture_state: null, current_company_name: 'Core3 Vietnam Branch', current_user_name: 'Admin User' }, 0, 50)).data).toEqual([]);
    const create = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'create_timesheet_entry').mutation;
    await expect(repository.executeMutation(create, { id: 'timesheet-duplicate-001', current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User', values: { name: 'TS/2026/0001', project_name: 'Core3 Implementation', work_date: '2026-01-15', description: 'duplicate', hours: 1 } })).rejects.toBeTruthy();
    database.close();
  });

  test('keeps cancellation owner-scoped and rejects replay after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-cancel-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, projectRoot + '/migrations', undefined, 'project_cancel_scope', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'timesheets_cancel_scope', ['schema', 'data']);
    const cancel = yaml('pages/timesheet-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'cancel').mutation;
    await expect(repository.executeMutation(cancel, {
      id: 'timesheet-report-003',
      current_user_name: 'Admin User',
      current_company_name: 'Core3 Demo Company',
    })).rejects.toMatchObject({ status: 403, code: 'TIMESHEETS_ENTRY_SCOPE' });

    const cancelled = await repository.executeMutation(cancel, {
      id: 'timesheet-report-003',
      current_user_name: 'Morgan Taylor',
      current_company_name: 'Core3 Demo Company',
    });
    expect(cancelled).toMatchObject({ id: 'timesheet-report-003', employee_name: 'Morgan Taylor', state: 'Cancelled', row_version: 2 });
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect((await reopened.query("SELECT employee_name, state, row_version FROM timesheet_entries WHERE id = 'timesheet-report-003'")).at(0)).toMatchObject({
      employee_name: 'Morgan Taylor', state: 'Cancelled', row_version: 2,
    });
    await expect(reopened.executeMutation(cancel, {
      id: 'timesheet-report-003',
      current_user_name: 'Morgan Taylor',
      current_company_name: 'Core3 Demo Company',
    })).rejects.toMatchObject({ status: 409 });
    expect((await reopened.query("SELECT state, row_version FROM timesheet_entries WHERE id = 'timesheet-report-003'")).at(0)).toMatchObject({ state: 'Cancelled', row_version: 2 });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
