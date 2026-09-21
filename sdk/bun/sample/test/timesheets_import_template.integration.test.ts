import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { request_key: 'wave27-demo', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets Odoo import-template parity', () => {
  test('maps the Odoo template provider to separate page/API contracts', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const client = api.actions.find((candidate: any) => candidate.id === 'download_timesheet_import_template');
    const record = api.actions.find((candidate: any) => candidate.id === 'record_timesheet_import_template_download');

    expect(odoo).toContain("'label': _('Import Template for Timesheets')");
    expect(odoo).toContain("'/hr_timesheet/static/xls/timesheets_import_template.xlsx'");
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'download_timesheet_import_template', label: 'Download import template', permission: 'timesheets.write', variant: 'secondary' });
    expect(client).toMatchObject({ type: 'client', permission: 'timesheets.write' });
    expect(client.script).toContain('record_import_template_download');
    expect(client.script).toContain('timesheets_import_template.csv');
    expect(record).toMatchObject({ type: 'server', permission: 'timesheets.write', operation: 'create', handler: 'yaml_mutation' });
    expect(api.datasources.find((source: any) => source.id === 'timesheet_import_template_downloads')).toMatchObject({ permission: 'timesheets.read' });
  });

  test('records an idempotent, company-scoped download and preserves it across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-import-template-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_import_template_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_import_template_restart', ['schema', 'data']);
      const action = yaml('api/entries.yaml').actions.find((candidate: any) => candidate.id === 'record_timesheet_import_template_download');

      const created = await repository.executeMutation(action.mutation, valid);
      expect(created).toMatchObject({
        id: 'timesheet-import-template-wave27-demo', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        company_name: 'Core3 Demo Company', source_template: '/hr_timesheet/static/xls/timesheets_import_template.xlsx',
        file_name: 'timesheets_import_template.csv', mime_type: 'text/csv', request_key: 'wave27-demo', row_version: 1,
      });
      expect(await repository.executeMutation(action.mutation, valid)).toMatchObject({ id: created.id, row_version: 1 });
      expect(await repository.query("SELECT COUNT(*) AS count FROM timesheet_import_template_downloads WHERE id = 'timesheet-import-template-wave27-demo'")).toEqual([{ count: 1 }]);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect(await reopened.query("SELECT source_template, file_name, company_name, row_version FROM timesheet_import_template_downloads WHERE id = 'timesheet-import-template-wave27-demo'")).toEqual([{
        source_template: '/hr_timesheet/static/xls/timesheets_import_template.xlsx', file_name: 'timesheets_import_template.csv', company_name: 'Core3 Demo Company', row_version: 1,
      }]);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('enforces active employee/company and stale replay guards without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_import_template_guards', ['schema', 'data']);
    const action = yaml('api/entries.yaml').actions.find((candidate: any) => candidate.id === 'record_timesheet_import_template_download');

    await expect(repository.executeMutation(action.mutation, { ...valid, request_key: '' })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_IMPORT_TEMPLATE_REQUEST_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...valid, request_key: 'wrong-company', current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_IMPORT_TEMPLATE_EMPLOYEE_SCOPE' });
    await expect(repository.executeMutation(action.mutation, { ...valid, request_key: 'stale-request', expected_row_version: 1 })).resolves.toMatchObject({ row_version: 1 });
    await repository.query("UPDATE timesheet_import_template_downloads SET row_version = 2 WHERE id = 'timesheet-import-template-stale-request'");
    await expect(repository.executeMutation(action.mutation, { ...valid, request_key: 'stale-request', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'TIMESHEET_IMPORT_TEMPLATE_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM timesheet_import_template_downloads WHERE request_key = 'wrong-company'")).toEqual([{ count: 0 }]);
    expect(action.permission).toBe('timesheets.write');
    database.close();
  });

  test('keeps the migration fixture-free and deterministic', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921150000-020-timesheets-import-template.yaml'), 'utf8');
    expect(migration).toContain('timesheet_import_template_downloads');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
