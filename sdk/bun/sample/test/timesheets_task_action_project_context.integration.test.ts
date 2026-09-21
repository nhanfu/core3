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
const valid = { task_id: 'task-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null };

describe('Timesheets task action project context parity', () => {
  test('maps Odoo task project default context to a separate page/API prefill', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    const defaults = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entry_defaults');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry');
    const contextCard = page.components.find((component: any) => component.type === 'StatRow' && component.source === 'task_timesheet_entry_defaults');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921170000-022-timesheets-task-project-context.yaml'), 'utf8');

    expect(source).toContain("'default_project_id': self.project_id.id");
    expect(source).toContain("('task_id', 'in', task_ids)");
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(defaults).toMatchObject({ id: 'task_timesheet_entry_defaults', single: true, permission: 'timesheets.write' });
    expect(defaults.query).toContain('p.allow_timesheets');
    expect(create.params).toMatchObject({ context_project_id: '{state.task_timesheet_entry_defaults.project_id}' });
    expect(create.prefill).toBe('source');
    expect(create.prefill_source).toBe('task_timesheet_entry_defaults');
    expect(create.mutation.guards).toContainEqual(expect.objectContaining({ code: 'TASK_TIMESHEET_PROJECT_CONTEXT' }));
    expect(create.mutation.guards).toContainEqual(expect.objectContaining({ code: 'TASK_TIMESHEET_PROJECT_RELATION' }));
    expect(contextCard).toMatchObject({ type: 'StatRow', title: 'Task project context' });
    expect(migration).toContain('timesheet_tasks_project_context_idx');
  });

  test('reads durable task project defaults only in the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_project_context', ['schema', 'data']);
      const defaults = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entry_defaults');

      expect(await repository.querySource(defaults, valid, 0, 1)).toMatchObject({ data: { task_id: 'task-demo-001', task_name: 'Complete module migration', project_id: 'project-demo-001', project_name: 'Core3 Implementation', context_action: 'task_subtask_action' } });
      expect((await repository.querySource(defaults, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(defaults, { ...valid, task_id: 'missing-task' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(defaults, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('persists canonical task project values and rejects stale project context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_project_context_create', ['schema', 'data']);
      const mutation = yaml('api/task-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/TASK-PROJECT-CONTEXT', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Spoofed project', task_id: 'task-demo-001', task_name: 'Spoofed task',
        context_task_id: 'task-demo-001', context_task_ids: 'task-demo-001', context_project_id: 'project-demo-001',
        work_date: '2026-01-15', description: 'Task project context', hours: 2, current_company_name: 'Core3 Demo Company',
      };

      expect(await repository.executeMutation(mutation, { id: 'timesheet-task-project-context', values })).toMatchObject({ id: 'timesheet-task-project-context', task_id: 'task-demo-001', task_name: 'Complete module migration', project_id: 'project-demo-001', project_name: 'Core3 Implementation', company_name: 'Core3 Demo Company', state: 'Draft' });
      await expect(repository.executeMutation(mutation, { id: 'timesheet-task-project-stale', values: { ...values, name: 'TS/2026/TASK-PROJECT-STALE', context_project_id: 'project-demo-002' } })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_PROJECT_CONTEXT' });
      await expect(repository.executeMutation(mutation, { id: 'timesheet-task-project-relation', values: { ...values, name: 'TS/2026/TASK-PROJECT-RELATION', project_id: 'project-demo-002', project_name: 'Quality Assurance', context_project_id: 'project-demo-002' } })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_PROJECT_RELATION' });
    } finally {
      database.close();
    }
  });

  test('keeps task project context and persisted rows after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-project-context-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const defaults = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entry_defaults');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_project_context_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_project_context_restart', ['schema', 'data']);
      const before = await repository.querySource(defaults, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_project_context_restart', ['schema', 'data']);
      expect(await reopened.querySource(defaults, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_tasks WHERE id = 'task-demo-001' AND project_id = 'project-demo-001' AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
