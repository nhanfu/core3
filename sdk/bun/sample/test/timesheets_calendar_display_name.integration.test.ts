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

describe('Timesheets calendar display name parity', () => {
  test('maps Odoo calendar_display_name and create_name_field to the separate page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const calendar = page.components.find((item: any) => item.type === 'ListView').views.find((item: any) => item.id === 'calendar');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(source).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toContain('calendar_display_name');
    expect(calendar.card.title).toBe('calendar_display_name');
    expect(odooModel).toContain('def _compute_calendar_display_name');
    expect(odooModel).toContain('line.calendar_display_name');
    expect(odooView).toContain('create_name_field="calendar_display_name"');
  });

  test('renders durable hour and day labels with company and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_calendar_labels', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const hours = await repository.querySource(source, valid, 0, 50);
    expect(hours.data.find((row: any) => row.id === 'timesheet-demo-001')).toMatchObject({ calendar_display_name: 'Core3 Implementation (8h)' });
    expect(hours.data.find((row: any) => row.id === 'timesheet-my-009')).toMatchObject({ calendar_display_name: 'Core3 Implementation (2h30)' });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('follows the persisted company encoding without changing entry ownership', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_calendar_days', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const settingsMutation = yaml('api/settings.yaml').actions.find((item: any) => item.id === 'timesheets_settings_update_server').mutation;
    await repository.executeMutation(settingsMutation, {
      id: 'timesheets-settings-demo', expected_row_version: 1,
      values: { project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: false, reminder_allow: false, time_off_integration: false },
      current_company_name: 'Core3 Demo Company',
    });
    const days = await repository.querySource(source, valid, 0, 50);
    expect(days.data.find((row: any) => row.id === 'timesheet-demo-001')).toMatchObject({ calendar_display_name: 'Core3 Implementation (1d)', time_encoding_method: 'days' });
    expect(days.data.find((row: any) => row.id === 'timesheet-my-009')).toMatchObject({ calendar_display_name: 'Core3 Implementation (0.31d)' });
    expect(days.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    database.close();
  });

  test('preserves the calendar label through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-calendar-label-'));
    const path = join(directory, 'timesheets.duckdb');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_calendar_restart', ['schema', 'data']);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_calendar_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data.map((row: any) => ({ id: row.id, calendar_display_name: row.calendar_display_name }))).toEqual(before.data.map((row: any) => ({ id: row.id, calendar_display_name: row.calendar_display_name })));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
