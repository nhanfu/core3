import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', q: null, state: null, work_date: null, fixture_state: null };

describe('Timesheets UoM encoding parity', () => {
  test('maps Odoo company encoding and the timesheet UoM widget to the page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const settings = yaml('api/settings.yaml');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921110000-016-timesheets-uom-company.yaml'), 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/res_config_settings.py', 'utf8');
    const odooLine = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const list = page.components.find((item: any) => item.type === 'ListView');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(source).toMatchObject({ permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(list.columns).toContainEqual({ field: 'hours', label: 'Time Spent', align: 'right' });
    expect(String(source.query)).toContain('timesheet_settings');
    expect(String(source.query)).toContain("s.timesheet_encode_method");
    expect(String(source.query)).toContain("printf('%g d'");
    expect(settings.datasources[0].permission).toBe('timesheets.settings');
    expect(odooModel).toContain("('hours', 'Hours / Minutes')");
    expect(odooModel).toContain("('days', 'Days / Half-Days')");
    expect(odooModel).toContain('company_id.timesheet_encode_uom_id');
    expect(odooLine).toContain('analytic_line.company_id.timesheet_encode_uom_id');
    expect(odooLine).toContain('line._get_timesheet_time_day()');
    expect(migration).toContain("company_name = 'Core3 Demo Company'");
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });

  test('renders hours and days from the durable company setting with permission and company guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_uom_values', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    expect((await repository.querySource(source, valid, 0, 10)).data[0]).toMatchObject({ hours: 8, time_spent_display: '08:00', time_encoding_method: 'hours' });
    const settingsMutation = yaml('api/settings.yaml').actions.find((item: any) => item.id === 'timesheets_settings_update_server').mutation;
    await repository.executeMutation(settingsMutation, { id: 'timesheets-settings-demo', expected_row_version: 1, values: { project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: false, reminder_allow: false, time_off_integration: false }, current_company_name: 'Core3 Demo Company' });
    expect((await repository.querySource(source, valid, 0, 10)).data[0]).toMatchObject({ hours: 8, time_spent_display: '1 d', time_encoding_method: 'days' });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 10)).data).toEqual([]);
    await expect(repository.querySource(source, { ...valid, fixture_state: 'transport_error' }, 0, 10)).rejects.toMatchObject({ status: 503, code: 'TIMESHEETS_ENTRIES_UNAVAILABLE' });
    database.close();
  });

  test('rejects stale settings writes without changing the persisted display method', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_uom_stale', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const settingsMutation = yaml('api/settings.yaml').actions.find((item: any) => item.id === 'timesheets_settings_update_server').mutation;
    const values = { project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: false, reminder_allow: false, time_off_integration: false };
    await repository.executeMutation(settingsMutation, { id: 'timesheets-settings-demo', expected_row_version: 1, values, current_company_name: 'Core3 Demo Company' });
    await expect(repository.executeMutation(settingsMutation, { id: 'timesheets-settings-demo', expected_row_version: 1, values: { ...values, timesheet_encode_method: 'hours' }, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect((await repository.querySource(source, valid, 0, 10)).data[0]).toMatchObject({ time_spent_display: '1 d', time_encoding_method: 'days' });
    database.close();
  });

  test('preserves the company encoding across migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-uom-'));
    const path = join(directory, 'timesheets.duckdb');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const settingsMutation = yaml('api/settings.yaml').actions.find((item: any) => item.id === 'timesheets_settings_update_server').mutation;
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_uom_restart', ['schema', 'data']);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_uom_restart', ['schema', 'data']);
      await repository.executeMutation(settingsMutation, { id: 'timesheets-settings-demo', expected_row_version: 1, values: { project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: false, reminder_allow: false, time_off_integration: false }, current_company_name: 'Core3 Demo Company' });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect((await reopened.querySource(source, valid, 0, 10)).data[0]).toMatchObject({ time_spent_display: '1 d', time_encoding_method: 'days' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
