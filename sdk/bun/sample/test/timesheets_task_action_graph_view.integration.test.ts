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
const valid = { task_id: 'task-demo-001', task_ids: '', include_subtasks: 'true', q: null, state: null, work_date: null, fixture_state: null, current_company_name: 'Core3 Demo Company' };

describe('Timesheets task action graph view parity', () => {
  test('maps Odoo task action graph replacement to the paired page/API contract', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
    const list = page.components.find((component: any) => component.type === 'ListView' && component.source === 'task_timesheet_entries');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921180000-023-timesheets-task-action-graph.yaml'), 'utf8');

    expect(source).toContain('graph_view_id = self.env.ref("hr_timesheet.view_hr_timesheet_line_graph_by_employee").id');
    expect(source).toContain("if view[1] == 'graph'");
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(list.views).toContainEqual(expect.objectContaining({ id: 'graph', category_field: 'employee_name', measure_field: 'hours', type: 'bar', mobile: false }));
    expect(entries).toMatchObject({ id: 'task_timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(entries.pivot.fields).toEqual(expect.arrayContaining(['employee_name', 'task_name', 'hours', 'work_date']));
    expect(migration).toContain('timesheet_entries_task_graph_idx');
  });

  test('returns graph-ready durable rows by employee and descendant task in company scope', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_graph_scope', ['schema', 'data']);
      const entries = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');

      const rows = await repository.querySource(entries, valid, 0, 50);
      expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
      expect(rows.data.map((row: any) => row.employee_name)).toEqual(['Admin User', 'Priya Shah']);
      expect(rows.data.map((row: any) => row.hours)).toEqual([8, 3.5]);
      expect((await repository.querySource(entries, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, task_id: 'missing-task' }, 0, 50)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('reflects a persisted graph row after a guarded task create', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_graph_create', ['schema', 'data']);
      const api = yaml('api/task-timesheets.yaml');
      const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
      const mutation = api.actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/TASK-GRAPH', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration',
        context_task_id: 'task-demo-001', context_task_ids: 'task-demo-001', context_project_id: 'project-demo-001',
        work_date: '2026-01-15', description: 'Graph view row', hours: 1.5, current_company_name: 'Core3 Demo Company',
      };

      await repository.executeMutation(mutation, { id: 'timesheet-task-graph-row', values });
      const rows = await repository.querySource(entries, { ...valid, include_subtasks: null }, 0, 50);
      expect(rows.data.map((row: any) => row.id)).toContain('timesheet-task-graph-row');
      expect(rows.data.find((row: any) => row.id === 'timesheet-task-graph-row')).toMatchObject({ employee_name: 'Admin User', task_name: 'Complete module migration', hours: 1.5 });
    } finally {
      database.close();
    }
  });

  test('preserves graph-ready rows and migration replay across file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-graph-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const entries = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_graph_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_graph_restart', ['schema', 'data']);
      const before = await repository.querySource(entries, valid, 0, 50);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_graph_restart', ['schema', 'data']);
      expect(await reopened.querySource(entries, valid, 0, 50)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE task_id = 'task-demo-001' AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
