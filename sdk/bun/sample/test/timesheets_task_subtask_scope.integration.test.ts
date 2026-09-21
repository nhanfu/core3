import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const migrations = join(serviceRoot, 'migrations');
const valid = { task_id: 'task-demo-001', include_subtasks: 'true', q: null, state: null, work_date: null, fixture_state: null, current_company_name: 'Core3 Demo Company' };

describe('Timesheets task sub-task scope parity', () => {
  test('maps Odoo action_view_subtask_timesheet to a paired Include sub-tasks context', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'task_timesheet_entries');
    const odooTask = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921160000-021-timesheets-task-subtask-scope.yaml'), 'utf8');

    expect(odooTask).toContain('def action_view_subtask_timesheet');
    expect(odooTask).toContain("'task_id', 'in', task_ids");
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets', auth: { require: ['timesheets.read'] } });
    expect(list.default_filters).toEqual({ include_subtasks: 'true' });
    expect(list.filters).toContainEqual({ field: 'include_subtasks', label: 'Include sub-tasks', options: [{ id: 'true', label: 'Include sub-tasks' }] });
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(source).toMatchObject({ id: 'task_timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['parent_task_id', 'parent_task_name', 'is_subtask']));
    expect(String(source.query)).toContain('child.parent_task_id = :task_id');
    expect(String(source.query)).toContain('t.company_name = COALESCE');
    expect(migration).toContain("parent_task_id = 'task-demo-001'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });

  test('returns exact task rows by default and includes durable child-task rows in context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_task_subtask_scope', ['schema', 'data']);
    const source = yaml('api/task-timesheets.yaml').datasources.find((item: any) => item.id === 'task_timesheet_entries');

    const exact = await repository.querySource(source, { ...valid, include_subtasks: null }, 0, 50);
    expect(exact.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'timesheet-demo-001', task_id: 'task-demo-001', is_subtask: false })]));
    expect(exact.data.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
    const expanded = await repository.querySource(source, valid, 0, 50);
    expect(expanded.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
    expect(expanded.data.find((row: any) => row.id === 'timesheet-report-004')).toMatchObject({ task_id: 'task-demo-002', parent_task_id: 'task-demo-001', parent_task_name: 'Complete module migration', is_subtask: true });
    database.close();
  });

  test('keeps sub-task expansion permissioned, company-scoped, and empty-safe', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_task_subtask_guards', ['schema', 'data']);
    const source = yaml('api/task-timesheets.yaml').datasources.find((item: any) => item.id === 'task_timesheet_entries');
    const page = yaml('pages/task-timesheets.yaml');

    expect(source.permission).toBe('timesheets.read');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, task_id: 'missing-task' }, 0, 50)).data).toEqual([]);
    await repository.run("UPDATE timesheet_tasks SET parent_task_id = NULL, parent_task_name = NULL WHERE id = 'task-demo-002'");
    expect((await repository.querySource(source, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
    database.close();
  });

  test('preserves task hierarchy and expanded rows through migration replay and restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-subtask-'));
    const path = join(directory, 'timesheets.duckdb');
    const source = yaml('api/task-timesheets.yaml').datasources.find((item: any) => item.id === 'task_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_subtask_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_subtask_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      expect(before.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_subtask_restart', ['schema', 'data']);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data).toEqual(before.data);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
