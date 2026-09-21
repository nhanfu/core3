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
  task_id: 'task-demo-001',
  task_ids: 'task-demo-001,task-demo-002',
  include_subtasks: null,
  q: null,
  state: null,
  work_date: null,
  current_company_name: 'Core3 Demo Company',
  fixture_state: null,
};

describe('Timesheets task active_ids multi-scope parity', () => {
  test('maps Odoo task active_ids to a separate multi-task page/API scope', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
    const scope = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_scope');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry');
    const scopeCard = page.components.find((component: any) => component.type === 'StatRow' && component.source === 'task_timesheet_scope');

    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(scopeCard).toMatchObject({ type: 'StatRow', title: 'Task scope' });
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(source).toContain('<record id="timesheet_action_task" model="ir.actions.act_window">');
    expect(source).toContain("[('task_id', 'in', active_ids)]");
    expect(entries.query).toContain(':task_ids');
    expect(scope).toMatchObject({ id: 'task_timesheet_scope', single: true, permission: 'timesheets.read' });
    expect(scope.query).toContain('string_split');
    expect(create.params).toMatchObject({ context_task_id: '{state.task_id}', context_task_ids: '{state.task_ids}', context_project_id: '{state.task_timesheet_entry_defaults.project_id}' });
    expect(create.mutation.guards).toContainEqual(expect.objectContaining({ code: 'TASK_TIMESHEET_CONTEXT_SCOPE' }));
  });

  test('reads selected durable tasks and entries only in the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_action_multi_scope', ['schema', 'data']);
      const api = yaml('api/task-timesheets.yaml');
      const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
      const scope = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_scope');

      const rows = await repository.querySource(entries, valid, 0, 50);
      expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
      expect(rows.data.every((row: any) => row.is_subtask === false)).toBe(true);
      expect(await repository.querySource(scope, valid, 0, 1)).toMatchObject({ data: { task_ids: 'task-demo-001,task-demo-002', task_count: 2, entry_count: 2, total_hours: 11.5 } });
      expect((await repository.querySource(entries, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(scope, { ...valid, task_ids: 'missing-task' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(scope, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('persists a selected task in the multi-context and rejects stale or foreign selections', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_action_multi_create', ['schema', 'data']);
      const create = yaml('api/task-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/TASK-MULTI', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-002', task_name: 'Quality analysis',
        context_task_id: 'task-demo-001', context_task_ids: 'task-demo-001,task-demo-002', work_date: '2026-01-15', description: 'Multi-task context', hours: 2,
        current_company_name: 'Core3 Demo Company',
      };

      expect(await repository.executeMutation(create, { id: 'timesheet-task-multi-context', values })).toMatchObject({ id: 'timesheet-task-multi-context', task_id: 'task-demo-002', company_name: 'Core3 Demo Company', state: 'Draft' });
      await expect(repository.executeMutation(create, { id: 'timesheet-task-multi-stale', values: { ...values, name: 'TS/2026/TASK-MULTI-STALE', task_id: 'task-demo-closed', task_name: 'Closed delivery task' } })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_CONTEXT_SCOPE' });
      await expect(repository.executeMutation(create, { id: 'timesheet-task-multi-foreign', values: { ...values, name: 'TS/2026/TASK-MULTI-FOREIGN', current_company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'TASK_TIMESHEET_TASK_SCOPE' });
    } finally {
      database.close();
    }
  });

  test('keeps multi-task scope and created rows after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-multi-scope-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const scope = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_scope');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_action_multi_restart', ['schema', 'data']);
      const before = await repository.querySource(scope, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_action_multi_restart', ['schema', 'data']);
      expect(await reopened.querySource(scope, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE task_id IN ('task-demo-001', 'task-demo-002') AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBe(2);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
