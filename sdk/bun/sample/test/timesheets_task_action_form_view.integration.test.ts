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
const valid = { id: 'timesheet-demo-001', current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User', view_scope: 'task', fixture_state: null };

describe('Timesheets task action Form view parity', () => {
  test('maps Odoo task action Form preservation to the paired page/detail API contract', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const detailApi = yaml('api/entry-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView' && component.source === 'task_timesheet_entries');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921193000-027-timesheets-task-action-form.yaml'), 'utf8');

    expect(source).toContain('<record id="timesheet_view_form_user" model="ir.ui.view">');
    expect(source).toContain('<record id="timesheet_action_view_all_form" model="ir.actions.act_window.view">');
    expect(source).toContain('<field name="view_mode">form</field>');
    expect(source).toContain('<field name="view_id" ref="timesheet_view_form_user"/>');
    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar', 'pivot', 'form', 'graph']);
    expect(list.views).toContainEqual(expect.objectContaining({ id: 'form', label: 'Form' }));
    expect(list.form_view).toEqual({ page: 'apps/services/timesheets/pages/timesheet-detail.yaml', side_panel: true });
    expect(detailApi.page).toEqual({ id: 'timesheet-detail' });
    expect(detailApi.datasources.find((candidate: any) => candidate.id === 'timesheet_detail')).toMatchObject({ permission: 'timesheets.read', single: true });
    expect(migration).toContain('timesheet_entries_task_form_idx');
  });

  test('reads the durable task entry Form only in the current company and actor scope', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_form_scope', ['schema', 'data']);
      const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
      const taskEntries = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_entries');

      expect(await repository.querySource(detail, valid, 0, 1)).toMatchObject({ data: expect.objectContaining({ id: 'timesheet-demo-001', task_id: 'task-demo-001', project_name: 'Core3 Implementation', state: 'Approved' }) });
      expect((await repository.querySource(detail, { ...valid, current_company_name: 'Other Company' })).data).toEqual({});
      expect((await repository.querySource(detail, { ...valid, current_user_name: 'Other User' })).data).toEqual({});
      expect((await repository.querySource(detail, { ...valid, id: 'missing-entry' })).data).toEqual({});
      expect((await repository.querySource(taskEntries, { task_id: 'task-demo-001', task_ids: '', include_subtasks: 'true', q: null, state: null, work_date: null, fixture_state: 'empty', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('opens a created task row in Form and rejects a stale guarded edit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_form_create', ['schema', 'data']);
      const taskApi = yaml('api/task-timesheets.yaml');
      const detailApi = yaml('api/entry-detail.yaml');
      const create = taskApi.actions.find((candidate: any) => candidate.id === 'create_task_timesheet_entry').mutation;
      const update = detailApi.actions.find((candidate: any) => candidate.id === 'edit_timesheet_detail').mutation;
      const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
      const values = {
        name: 'TS/2026/TASK-FORM', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration',
        context_task_id: 'task-demo-001', context_task_ids: 'task-demo-001', context_project_id: 'project-demo-001',
        work_date: '2026-01-16', description: 'Form view row', hours: 1.25, current_company_name: 'Core3 Demo Company',
      };

      await repository.executeMutation(create, { id: 'timesheet-task-form-row', values });
      expect(await repository.querySource(detail, { ...valid, id: 'timesheet-task-form-row' }, 0, 1)).toMatchObject({ data: expect.objectContaining({ id: 'timesheet-task-form-row', task_name: 'Complete module migration', hours: 1.25 }) });
      expect(await repository.executeMutation(update, { id: 'timesheet-task-form-row', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User', values: { work_date: '2026-01-17', project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration', description: 'Form updated', hours: 2 } })).toMatchObject({ row_version: 2 });
      await expect(repository.executeMutation(update, { id: 'timesheet-task-form-row', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User', values: { work_date: '2026-01-18', project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-001', task_name: 'Complete module migration', description: 'Stale form edit', hours: 3 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    } finally {
      database.close();
    }
  });

  test('preserves Form-ready task rows and migration replay across file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-form-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const detail = yaml('api/entry-detail.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_detail');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_form_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_form_restart', ['schema', 'data']);
      const before = await repository.querySource(detail, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_form_restart', ['schema', 'data']);
      expect(await reopened.querySource(detail, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE id = 'timesheet-demo-001' AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
