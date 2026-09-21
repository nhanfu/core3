import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', project_id: 'project-demo-001', fixture_state: null };

describe('Timesheets project/task dependency parity', () => {
  test('maps Odoo project onchange and task context to separate YAML controls', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_timesheet_entry');
    const projects = api.datasources.find((candidate: any) => candidate.id === 'timesheet_entry_projects');
    const tasks = api.datasources.find((candidate: any) => candidate.id === 'timesheet_entry_tasks');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'timesheets.write', prefill: 'source' });
    expect(action.fields).toContainEqual({ field: 'project_id', label: 'Project ID', type: 'select', options_source: 'timesheet_entry_projects' });
    expect(action.fields).toContainEqual({ field: 'task_id', label: 'Task ID', type: 'select', options_source: 'timesheet_entry_tasks' });
    expect(action.fields).toContainEqual({ field: 'task_name', label: 'Task', type: 'hidden' });
    expect(projects).toMatchObject({ id: 'timesheet_entry_projects', permission: 'timesheets.write' });
    expect(tasks).toMatchObject({ id: 'timesheet_entry_tasks', permission: 'timesheets.write' });
    expect(String(tasks.query)).toContain('t.project_id = :project_id');
    expect(odooModel).toContain('def _onchange_project_id');
    expect(odooView).toContain("'default_project_id': project_id");
    expect(odooView).toContain("'search_default_open_tasks': True");
  });

  test('returns only open tasks for the selected active project and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_task_dependency', ['schema', 'data']);
      const tasks = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entry_tasks');

      expect((await repository.querySource(tasks, valid, 0, 20)).data.map((row: any) => row.value)).toEqual(['task-demo-001', 'task-demo-002']);
      expect((await repository.querySource(tasks, { ...valid, project_id: 'project-demo-002' }, 0, 20)).data).toEqual([]);
      expect((await repository.querySource(tasks, { ...valid, current_company_name: 'Other Company' }, 0, 20)).data).toEqual([]);
      expect((await repository.querySource(tasks, { ...valid, fixture_state: 'empty' }, 0, 20)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('canonicalizes a selected task, permits no task, and rejects stale cross-project task values', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_task_mutations', ['schema', 'data']);
      const create = yaml('api/entries.yaml').actions.find((candidate: any) => candidate.id === 'create_timesheet_entry');
      const base = {
        employee_id: 'employee-demo-001', employee_name: 'Admin User', project_id: 'project-demo-001', project_name: 'Core3 Implementation',
        work_date: '2026-01-15', description: 'Project task dependency', hours: 2, billable: true, unit_amount: 125,
        current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
      };
      const selected = await repository.executeMutation(create.mutation, { values: { ...base, name: 'TS/2026/DEPENDENCY-SELECTED', task_id: 'task-demo-002', task_name: '' } }) as any;
      expect(selected).toMatchObject({ task_id: 'task-demo-002', task_name: 'Quality analysis' });
      const noTask = await repository.executeMutation(create.mutation, { values: { ...base, name: 'TS/2026/DEPENDENCY-NONE', task_id: '', task_name: '' } }) as any;
      expect(noTask).toMatchObject({ task_id: null, task_name: null });
      await expect(repository.executeMutation(create.mutation, { values: { ...base, name: 'TS/2026/DEPENDENCY-STALE', project_id: 'project-demo-002', project_name: 'Customer Delivery', task_id: 'task-demo-002', task_name: '' } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_TASK_INVALID' });
    } finally {
      database.close();
    }
  });

  test('preserves project-scoped task options after migration replay and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-project-task-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const tasks = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entry_tasks');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_project_task_restart', ['schema', 'data']);
      const before = await repository.querySource(tasks, valid, 0, 20);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_project_task_restart', ['schema', 'data']);
      const after = await reopened.querySource(tasks, valid, 0, 20);
      expect(after.data).toEqual(before.data);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
