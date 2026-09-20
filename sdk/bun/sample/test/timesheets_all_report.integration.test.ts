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

describe('Timesheets all-entry report action parity', () => {
  test('maps the Odoo analytic-line report binding to an approver-only page/API pair', () => {
    const page = yaml('pages/all-report-preview.yaml');
    const api = yaml('api/all-report-preview.yaml');
    const detailPage = yaml('pages/all-timesheets-detail.yaml');
    const detailApi = yaml('api/all-timesheets-detail.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/report/report_timesheet_templates.xml', 'utf8');
    expect(odoo).toContain('<field name="binding_model_id" ref="model_account_analytic_line"/>');
    expect(page.page).toMatchObject({ id: 'all-timesheet-report-preview', route: '/timesheets/all-report-preview', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheet-report-preview' });
    expect(api.datasources[0]).toMatchObject({ id: 'all_timesheet_report_preview', permission: 'timesheets.manage' });
    expect(detailPage.components[0].header_actions).toContainEqual({ id: 'print_all_timesheet_detail', label: 'Print', variant: 'secondary', permission: 'timesheets.manage' });
    expect(detailApi.actions.find((action: any) => action.id === 'print_all_timesheet_detail')).toMatchObject({ type: 'client', permission: 'timesheets.manage' });
    expect(detailApi.actions.find((action: any) => action.id === 'print_all_timesheet_detail').script).toContain('/api/actions/timesheets.all_entries.print_report');
    expect(detailApi.actions.find((action: any) => action.id === 'record_all_timesheet_report_run')).toMatchObject({ type: 'server', operation: 'report', handler: 'yaml_mutation', permission: 'timesheets.manage' });
  });

  test('creates and renders an all-entry report after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_all_report_restart', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_all_report_restart', ['schema', 'data']);
    const api = yaml('api/all-timesheets-detail.yaml');
    const preview = yaml('api/all-report-preview.yaml').datasources[0];
    const mutation = api.actions.find((action: any) => action.id === 'record_all_timesheet_report_run').mutation;
    const created = await repository.executeMutation(mutation, valid);
    expect(created).toMatchObject({ id: 'timesheet-all-report-run-timesheet-demo-001-2', entry_id: valid.entry_id, entry_name: 'TS/2026/0001', requested_by: 'Admin User' });
    expect((await repository.querySource(preview, { id: valid.entry_id, ...valid }, 0, 1)).data).toMatchObject({ report_run_id: created.id, employee_name: 'Admin User', project_name: 'Core3 Implementation', time_spent_display: '08:00', hours: 8 });
    first.close();
    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    expect((await reopened.querySource(preview, { id: valid.entry_id, ...valid }, 0, 1)).data).toMatchObject({ report_run_id: created.id, report_name: 'Timesheets' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects actor, company, stale, and missing-entry requests without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_report_guards', ['schema', 'data']);
    const mutation = yaml('api/all-timesheets-detail.yaml').actions.find((action: any) => action.id === 'record_all_timesheet_report_run').mutation;
    await expect(repository.executeMutation(mutation, { ...valid, entry_id: 'missing-timesheet' })).rejects.toMatchObject({ status: 404, code: 'TIMESHEET_ALL_REPORT_ENTRY_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_ALL_REPORT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_ALL_REPORT_COMPANY' });
    await expect(repository.executeMutation(mutation, { ...valid, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'TIMESHEET_ALL_REPORT_STALE' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_report_runs WHERE id LIKE 'timesheet-all-report-run-%'")).at(0)?.count).toBe(0);
    database.close();
  });
});
