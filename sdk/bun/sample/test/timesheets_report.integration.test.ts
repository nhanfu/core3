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

describe('Timesheets Odoo report binding parity', () => {
  test('keeps the analytic-line report action page/API-owned and personal-scope bound', () => {
    const page = yaml('pages/timesheet-detail.yaml');
    const api = yaml('api/entry-detail.yaml');
    const reportAction = api.actions.find((action: any) => action.action === 'timesheets.entries.print_report');

    expect(page.datasources).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({ id: 'print_timesheet_detail', label: 'Print', permission: 'timesheets.read', variant: 'secondary' });
    expect(api.page).toEqual({ id: 'timesheet-detail' });
    expect(page.page.id).toBe('timesheet-detail');
    expect(api.datasources.map((source: any) => source.id)).toContain('timesheet_report_runs');
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'print_timesheet_detail', type: 'client', permission: 'timesheets.read' }));
    expect(reportAction).toMatchObject({ type: 'server', permission: 'timesheets.read', operation: 'report', handler: 'yaml_mutation' });
    expect(reportAction.mutation).toMatchObject({ operation: 'insert', table: 'timesheet_report_runs' });
    expect(reportAction.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 403, code: 'TIMESHEET_REPORT_SCOPE' }),
      expect.objectContaining({ status: 409, code: 'STALE_RECORD' }),
    ]));
  });

  test('records a deterministic print run and preserves it across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-report-'));
    const path = join(directory, 'timesheets.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'timesheets_report_runs', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_report_runs', ['schema', 'data']);

    const api = yaml('api/entry-detail.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_report_runs');
    const reportAction = api.actions.find((action: any) => action.action === 'timesheets.entries.print_report');
    const initial = await repository.querySource(source, {
      id: 'timesheet-demo-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(initial.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'timesheet-report-run-demo-001', report_name: 'Timesheets', requested_by: 'Admin User' }),
    ]));

    const printed = await repository.executeMutation(reportAction.mutation, {
      entry_id: 'timesheet-demo-001', expected_row_version: 1,
      entry_row_version: 1, requested_by: 'Admin User', company_name: 'Core3 Demo Company',
      current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', report_name: 'Timesheets',
    });
    expect(printed).toMatchObject({
      id: 'timesheet-report-run-timesheet-demo-001-2', entry_id: 'timesheet-demo-001',
      entry_name: 'TS/2026/0001', report_name: 'Timesheets', work_date: '2026-01-15', hours: 8,
    });
    expect((await repository.querySource(source, {
      id: 'timesheet-demo-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
    }, 0, 50)).data).toHaveLength(2);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const rows = await reopened.querySource(source, {
      id: 'timesheet-demo-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual([
      'timesheet-report-run-timesheet-demo-001-2', 'timesheet-report-run-demo-001',
    ]);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects missing, cross-employee, stale, and invalid report requests without a partial run', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_report_guards', ['schema', 'data']);
    const mutation = yaml('api/entry-detail.yaml').actions.find((action: any) => action.action === 'timesheets.entries.print_report').mutation;
    const valid = { entry_id: 'timesheet-demo-001', expected_row_version: 1, entry_row_version: 1, requested_by: 'Admin User', company_name: 'Core3 Demo Company', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', report_name: 'Timesheets' };

    await expect(repository.executeMutation(mutation, { ...valid, entry_id: 'missing-timesheet' })).rejects.toMatchObject({ status: 404, code: 'TIMESHEET_REPORT_ENTRY_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { ...valid, current_user_name: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_REPORT_SCOPE' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_REPORT_ACTOR' });
    await expect(repository.executeMutation(mutation, { ...valid, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_REPORT_COMPANY' });
    await expect(repository.executeMutation(mutation, { ...valid, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(mutation, { ...valid, report_name: ' ' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_REPORT_INVALID' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM timesheet_report_runs WHERE entry_id = 'timesheet-demo-001'")).at(0)?.count).toBe(1);
    database.close();
  });

  test('keeps report fixtures fixed and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260920120000-009-timesheet-report-runs.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
