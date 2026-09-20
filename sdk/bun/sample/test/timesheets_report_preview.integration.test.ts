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
  entry_id: 'timesheet-demo-001', expected_row_version: 1, entry_row_version: 1,
  requested_by: 'Admin User', company_name: 'Core3 Demo Company',
  current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', report_name: 'Timesheets',
};

describe('Timesheets report preview renderer parity', () => {
  test('maps Odoo report_timesheet template to a page/API-owned authenticated preview', () => {
    const page = yaml('pages/report-preview.yaml');
    const api = yaml('api/report-preview.yaml');
    const entryApi = yaml('api/entry-detail.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/report_timesheet_templates.xml', 'utf8');
    expect(odoo).toContain('<template id="report_timesheet">');
    expect(odoo).toContain('<span>Timesheets');
    expect(odoo).toContain('<span>Date</span>');
    expect(odoo).toContain('<span>Time Spent</span>');
    expect(page.page).toMatchObject({ id: 'timesheet-report-preview', route: '/timesheets/report-preview', auth: { require: ['timesheets.read'] } });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'timesheet_report_preview', editable: false });
    expect(api.page).toEqual({ id: 'timesheet-report-preview' });
    expect(api.datasources[0]).toMatchObject({ id: 'timesheet_report_preview', single: true, permission: 'timesheets.read' });
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'print_timesheet_report_preview', type: 'client', permission: 'timesheets.read' }));
    const entryPrintScript = entryApi.actions.find((action: any) => action.id === 'print_timesheet_detail').script;
    expect(entryPrintScript).toContain('body: { values:');
    expect(entryPrintScript).toContain('/timesheets/report-preview?id=');
  });

  test('renders a persisted report run through the preview datasource after report creation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_report_preview_create', ['schema', 'data']);
    const entryApi = yaml('api/entry-detail.yaml');
    const preview = yaml('api/report-preview.yaml').datasources[0];
    const mutation = entryApi.actions.find((action: any) => action.action === 'timesheets.entries.print_report').mutation;
    const created = await repository.executeMutation(mutation, valid);
    const rendered = await repository.querySource(preview, { id: valid.entry_id, ...valid }, 0, 1);
    expect(created).toMatchObject({ report_name: 'Timesheets', entry_id: valid.entry_id, entry_name: 'TS/2026/0001' });
    expect(rendered.data).toMatchObject({ report_run_id: created.id, report_name: 'Timesheets', entry_name: 'TS/2026/0001', employee_name: 'Admin User', project_name: 'Core3 Implementation', work_date: '2026-01-15', time_spent_display: '08:00', hours: 8, description: 'Migration work' });
    database.close();
  });

  test('preserves the rendered report through a file-backed restart and replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-report-preview-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_report_preview_restart', ['schema', 'data']);
    const entryApi = yaml('api/entry-detail.yaml');
    const preview = yaml('api/report-preview.yaml').datasources[0];
    const mutation = entryApi.actions.find((action: any) => action.action === 'timesheets.entries.print_report').mutation;
    await repository.executeMutation(mutation, valid);
    const firstPreview = await repository.querySource(preview, { id: valid.entry_id, ...valid }, 0, 1);
    expect(firstPreview.data).toMatchObject({ report_run_id: 'timesheet-report-run-timesheet-demo-001-2', entry_row_version: 1 });
    first.close();
    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const afterRestart = await reopened.querySource(preview, { id: valid.entry_id, ...valid }, 0, 1);
    expect(afterRestart.data).toMatchObject({ report_run_id: 'timesheet-report-run-timesheet-demo-001-2', report_name: 'Timesheets', requested_by: 'Admin User' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps actor, company, stale, and missing-entry guards closed without partial report runs', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_report_preview_guards', ['schema', 'data']);
    const mutation = yaml('api/entry-detail.yaml').actions.find((action: any) => action.action === 'timesheets.entries.print_report').mutation;
    await expect(repository.executeMutation(mutation, { ...valid, entry_id: 'missing-timesheet' })).rejects.toMatchObject({ status: 404, code: 'TIMESHEET_REPORT_ENTRY_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_REPORT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_REPORT_COMPANY' });
    await expect(repository.executeMutation(mutation, { ...valid, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_report_runs WHERE entry_id = 'timesheet-demo-001'")).at(0)?.count).toBe(1);
    database.close();
  });
});
