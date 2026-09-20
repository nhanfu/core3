import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { id: 'task-demo-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', fixture_state: null };

describe('Timesheets task report preview parity', () => {
  test('maps the Odoo task QWeb report to a separate page/API preview with persisted lines', () => {
    const page = yaml('pages/task-report-preview.yaml');
    const api = yaml('api/task-report-preview.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/report_timesheet_templates.xml', 'utf8');
    expect(source).toContain('<record id="timesheet_report_task" model="ir.actions.report">');
    expect(source).toContain('<field name="model">project.task</field>');
    expect(source).toContain('<field name="report_type">qweb-pdf</field>');
    expect(page.page).toMatchObject({ id: 'task-timesheet-report-preview', route: '/timesheets/task-report-preview', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'task-timesheet-report-preview' });
    expect(api.datasources.map((item: any) => item.id)).toEqual(['task_timesheet_report_preview', 'task_timesheet_report_lines']);
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'task_timesheet_report_preview', editable: false });
    expect(page.components[1]).toMatchObject({ type: 'ListView', source: 'task_timesheet_report_lines' });
    expect(yaml('api/task-timesheets.yaml').actions.find((item: any) => item.id === 'print_task_timesheets_report').script).toContain('/timesheets/task-report-preview?id=');
  });

  test('renders the durable task report and lines after migration replay and restart', async () => {
    const root = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-preview-'));
    const path = join(root, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'task_report_preview_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'task_report_preview_restart', ['schema', 'data']);
      const taskApi = yaml('api/task-timesheets.yaml');
      const mutation = taskApi.actions.find((item: any) => item.id === 'record_task_timesheets_report_run').mutation;
      const created = await repository.executeMutation(mutation, { ...valid, task_id: valid.id, expected_entry_count: 1 });
      expect(created).toMatchObject({ id: 'timesheet-task-report-run-task-demo-001-2', task_name: 'Complete module migration', entry_count: 1, total_hours: 8 });
      const preview = yaml('api/task-report-preview.yaml').datasources[0];
      const lines = yaml('api/task-report-preview.yaml').datasources[1];
      expect((await repository.querySource(preview, valid, 0, 1)).data).toMatchObject({ report_run_id: created.id, task_name: 'Complete module migration', project_name: 'Core3 Implementation', entry_count: 1, total_hours: 8 });
      expect((await repository.querySource(lines, valid, 0, 50)).data).toHaveLength(1);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect((await reopened.querySource(preview, valid, 0, 1)).data).toMatchObject({ report_run_id: created.id, task_id: 'task-demo-001' });
      expect((await reopened.querySource(lines, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
      second.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('keeps the preview scoped to company and task and honors deterministic empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'task_report_preview_guards', ['schema', 'data']);
    const api = yaml('api/task-report-preview.yaml');
    const preview = api.datasources[0];
    const lines = api.datasources[1];
    expect((await repository.querySource(preview, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(lines, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(lines, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(preview, { ...valid, id: 'missing-task' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('keeps the source report preview contract deterministic and page/API owned', () => {
    const page = yaml('pages/task-report-preview.yaml');
    const api = yaml('api/task-report-preview.yaml');
    expect(page.components[0].header_actions).toEqual([
      { id: 'print_task_timesheet_report_preview', label: 'Print', permission: 'timesheets.read', variant: 'primary' },
      { id: 'back_to_task_timesheets', label: 'Back to task timesheets', permission: 'timesheets.read', variant: 'secondary' },
    ]);
    expect(api.datasources[0].error_states).toMatchObject({ missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(String(api.datasources[0].query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
    expect(String(api.datasources[1].query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
