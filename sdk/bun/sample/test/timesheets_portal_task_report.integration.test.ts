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
  task_id: 'task-demo-001',
  expected_entry_count: 1,
  expected_task_row_version: 1,
  current_user_name: 'Portal User',
  current_company_name: 'Core3 Demo Company',
  fixture_state: null,
};

describe('Timesheets portal task report parity', () => {
  test('maps Odoo portal View Details to separate Timesheets page/API contracts', () => {
    const detailPage = yaml('pages/portal-task-timesheet-detail.yaml');
    const detailApi = yaml('api/portal-task-timesheet-detail.yaml');
    const previewPage = yaml('pages/portal-task-timesheet-report-preview.yaml');
    const previewApi = yaml('api/portal-task-timesheet-report-preview.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/project_task_portal_templates.xml', 'utf8');
    const report = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/report_timesheet_templates.xml', 'utf8');

    expect(source).toContain("def _show_task_report(self, task_sudo, report_type, download):");
    expect(source).toContain("report_ref='hr_timesheet.timesheet_report_task_timesheets'");
    expect(template).toContain("task.get_portal_url(report_type='pdf')");
    expect(template).toContain('View Details');
    expect(report).toContain('<record id="timesheet_report_task_timesheets" model="ir.actions.report">');
    expect(detailPage.page).toMatchObject({ id: 'portal-task-timesheet-detail', auth: { require: ['project.portal'] } });
    expect(detailPage.components[0].header_actions).toContainEqual({ id: 'view_portal_task_timesheet_report', label: 'View Details', permission: 'project.portal', variant: 'primary' });
    expect(detailApi.page).toEqual({ id: 'portal-task-timesheet-detail' });
    expect(detailApi.datasources.map((item: any) => item.id)).toEqual(['portal_task_timesheet_detail', 'portal_task_timesheet_report_context']);
    expect(detailApi.actions.find((item: any) => item.id === 'record_portal_task_timesheet_report_run')).toMatchObject({ type: 'server', operation: 'report', permission: 'project.portal' });
    expect(previewPage.page).toMatchObject({ id: 'portal-task-timesheet-report-preview', route: '/my/projects/task/timesheet/report-preview', auth: { require: ['project.portal'] } });
    expect(previewApi.page).toEqual({ id: 'portal-task-timesheet-report-preview' });
    expect(previewApi.datasources.map((item: any) => item.id)).toEqual(['portal_task_timesheet_report_preview', 'portal_task_timesheet_report_lines']);
  });

  test('records the portal task report and reloads its rendered lines after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-portal-task-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_task_report_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_task_report_restart', ['schema', 'data']);
      const detailApi = yaml('api/portal-task-timesheet-detail.yaml');
      const context = detailApi.datasources.find((item: any) => item.id === 'portal_task_timesheet_report_context');
      const mutation = detailApi.actions.find((item: any) => item.id === 'record_portal_task_timesheet_report_run').mutation;
      expect((await repository.querySource(context, valid, 0, 1)).data).toMatchObject({ task_id: 'task-demo-001', task_name: 'Complete module migration', entry_count: 1, total_hours: 8, task_row_version: 1 });
      const created = await repository.executeMutation(mutation, valid);
      expect(created).toMatchObject({ id: 'timesheet-portal-task-report-run-task-demo-001-2', task_id: 'task-demo-001', requested_by: 'Portal User', entry_count: 1, total_hours: 8, row_version: 1 });
      const previewApi = yaml('api/portal-task-timesheet-report-preview.yaml');
      const preview = previewApi.datasources[0];
      const lines = previewApi.datasources[1];
      expect((await repository.querySource(preview, valid, 0, 1)).data).toMatchObject({ report_run_id: created.id, report_title: 'Timesheets for Complete module migration', total_time_spent: '08:00' });
      expect((await repository.querySource(lines, valid, 0, 50)).data).toMatchObject([{ id: 'timesheet-demo-001', time_spent_display: '08:00', description: 'Migration work' }]);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect((await reopened.querySource(preview, valid, 0, 1)).data).toMatchObject({ report_run_id: created.id, task_id: 'task-demo-001' });
      expect((await reopened.querySource(lines, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('rejects missing, empty, stale, unauthorized, and foreign-company report requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_task_report_guards', ['schema', 'data']);
      const mutation = yaml('api/portal-task-timesheet-detail.yaml').actions.find((item: any) => item.id === 'record_portal_task_timesheet_report_run').mutation;
      await expect(repository.executeMutation(mutation, { ...valid, task_id: 'missing-task' })).rejects.toMatchObject({ status: 404, code: 'PORTAL_TASK_TIMESHEET_REPORT_TASK_NOT_FOUND' });
      await expect(repository.executeMutation(mutation, { ...valid, task_id: 'task-demo-closed', expected_entry_count: 0 })).rejects.toMatchObject({ status: 404, code: 'PORTAL_TASK_TIMESHEET_REPORT_TASK_NOT_FOUND' });
      await expect(repository.executeMutation(mutation, { ...valid, expected_entry_count: 99 })).rejects.toMatchObject({ status: 409, code: 'PORTAL_TASK_TIMESHEET_REPORT_STALE' });
      await expect(repository.executeMutation(mutation, { ...valid, expected_task_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'PORTAL_TASK_TIMESHEET_REPORT_TASK_STALE' });
      await expect(repository.executeMutation(mutation, { ...valid, current_user_name: 'Other Portal User' })).rejects.toMatchObject({ status: 404, code: 'PORTAL_TASK_TIMESHEET_REPORT_TASK_NOT_FOUND' });
      await expect(repository.executeMutation(mutation, { ...valid, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'PORTAL_TASK_TIMESHEET_REPORT_TASK_NOT_FOUND' });
      expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_portal_task_report_runs WHERE task_id = 'task-demo-001'")).at(0)?.count).toBe(1);
    } finally {
      database.close();
    }
  });

  test('keeps the portal report fixture deterministic and page/API separated', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260922100000-031-timesheets-portal-task-report.yaml'), 'utf8');
    const page = yaml('pages/portal-task-timesheet-report-preview.yaml');
    const api = yaml('api/portal-task-timesheet-report-preview.yaml');
    expect(migration).toContain("'timesheet-portal-task-report-run-demo-001'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'portal-task-timesheet-report-preview' });
    expect(String(api.datasources[0].query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
