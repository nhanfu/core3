import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = {
  q: null,
  employee_id: null,
  project_id: null,
  task_id: 'task-demo-001',
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets Task filter parity', () => {
  test('maps the Odoo Task search field to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const tasks = api.datasources.find((item: any) => item.id === 'all_timesheet_filter_tasks');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<field name="task_id"/>');
    expect(odoo).toContain('<record id="timesheet_action_all" model="ir.actions.act_window">');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.filters).toContainEqual({ field: 'task_id', label: 'Task', options_source: 'all_timesheet_filter_tasks' });
    expect(tasks).toMatchObject({ id: 'all_timesheet_filter_tasks', permission: 'timesheets.manage' });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toContain('task_id');
    expect(String(source.query)).toContain('(:task_id IS NULL OR t.task_id = :task_id)');
  });

  test('filters durable rows by task and preserves task options, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_task_filter', ['schema', 'data']);
    const api = yaml('api/all-timesheets.yaml');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const tasks = api.datasources.find((item: any) => item.id === 'all_timesheet_filter_tasks');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
    expect(new Set(filtered.data.map((row: any) => row.task_name))).toEqual(new Set(['Complete module migration']));
    expect((await repository.querySource(source, { ...valid, task_id: 'task-demo-002' }, 0, 50)).data.every((row: any) => row.task_id === 'task-demo-002')).toBe(true);

    const options = await repository.querySource(tasks, { current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(options.data.map((row: any) => row.value)).toEqual(['task-demo-001', 'task-demo-002']);
    expect((await repository.querySource(tasks, { current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains the task filter after a file-backed restart and keeps the manager permission', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-task-filter-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_task_filter_restart', ['schema', 'data']);
      expect(source.permission).toBe('timesheets.manage');
      expect((await repository.querySource(source, valid, 0, 50)).data.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_task_filter_restart', ['schema', 'data']);
      const filtered = await reopened.querySource(source, valid, 0, 50);
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(filtered.data.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
