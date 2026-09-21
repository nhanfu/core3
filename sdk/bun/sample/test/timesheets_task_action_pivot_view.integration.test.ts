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

describe('Timesheets task action Pivot view parity', () => {
  test('maps Odoo task action Pivot preservation to the paired page/API contract', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
    const list = page.components.find((component: any) => component.type === 'ListView' && component.source === 'task_timesheet_entries');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921192000-026-timesheets-task-action-pivot.yaml'), 'utf8');

    expect(source).toContain('<record id="view_hr_timesheet_line_pivot" model="ir.ui.view">');
    expect(source).toContain('<field name="employee_id" type="row"/>');
    expect(source).toContain('<field name="date" interval="month" type="col"/>');
    expect(source).toContain('<field name="unit_amount" string="Time Spent" type="measure"');
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar', 'pivot', 'graph']);
    expect(list.views).toContainEqual(expect.objectContaining({ id: 'pivot', mobile: false, pivot: expect.objectContaining({ default: expect.objectContaining({ rows: ['employee_name'], columns: ['work_date'] }) }) }));
    expect(entries).toMatchObject({ id: 'task_timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(entries.pivot.fields).toEqual(expect.arrayContaining(['employee_name', 'work_date', 'hours', 'cost']));
    expect(migration).toContain('timesheet_entries_task_pivot_idx');
  });

  test('returns Pivot-ready durable task rows and measures only in the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_pivot_scope', ['schema', 'data']);
      const entries = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');

      const rows = await repository.querySource(entries, valid, 0, 50);
      expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
      expect(rows.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'timesheet-demo-001', employee_name: 'Admin User', work_date: '2026-01-15', hours: 8, cost: 1000 }),
        expect.objectContaining({ id: 'timesheet-report-004', employee_name: 'Priya Shah', work_date: '2026-01-12', hours: 3.5, cost: 385 }),
      ]));
      expect((await repository.querySource(entries, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, task_id: 'missing-task' }, 0, 50)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('keeps a created row Pivot-ready and rejects a stale guarded edit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_pivot_create', ['schema', 'data']);
      const api = yaml('api/task-timesheets.yaml');
      const entries = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
      const create = api.actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry').mutation;
      const update = api.actions.find((candidate: any) => candidate.id === 'edit_task_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/TASK-PIVOT', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration',
        context_task_id: 'task-demo-001', context_task_ids: 'task-demo-001', context_project_id: 'project-demo-001',
        work_date: '2026-01-16', description: 'Pivot view row', hours: 1.25, current_company_name: 'Core3 Demo Company',
      };

      await repository.executeMutation(create, { id: 'timesheet-task-pivot-row', values });
      expect((await repository.querySource(entries, { ...valid, include_subtasks: null }, 0, 50)).data.find((row: any) => row.id === 'timesheet-task-pivot-row')).toMatchObject({ employee_name: 'Admin User', hours: 1.25, cost: 156.25 });
      expect(await repository.executeMutation(update, { id: 'timesheet-task-pivot-row', task_id: 'task-demo-001', expected_row_version: 1, values: { work_date: '2026-01-17', description: 'Pivot updated', hours: 2 } })).toMatchObject({ row_version: 2 });
      await expect(repository.executeMutation(update, { id: 'timesheet-task-pivot-row', task_id: 'task-demo-001', expected_row_version: 1, values: { work_date: '2026-01-18', description: 'Stale pivot edit', hours: 3 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    } finally {
      database.close();
    }
  });

  test('preserves Pivot-ready rows and migration replay across file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-pivot-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const entries = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_pivot_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_pivot_restart', ['schema', 'data']);
      const before = await repository.querySource(entries, valid, 0, 50);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_pivot_restart', ['schema', 'data']);
      expect(await reopened.querySource(entries, valid, 0, 50)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE task_id = 'task-demo-001' AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
