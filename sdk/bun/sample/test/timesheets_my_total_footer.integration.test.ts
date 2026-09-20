import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, state: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets My Timesheets total footer parity', () => {
  test('maps Odoo unit amount Total to separate page/API footer contracts', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const summary = api.datasources.find((item: any) => item.id === 'timesheet_entries_summary');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<field name="unit_amount" string="Time Spent" optional="show" widget="timesheet_uom" sum="Total"');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(list.footer).toEqual({ source: 'timesheet_entries_summary', stats: [{ label: 'Total', field: 'total_time_spent_display' }] });
    expect(summary).toMatchObject({ id: 'timesheet_entries_summary', single: true, permission: 'timesheets.read' });
    expect(String(summary.query)).toContain('SUM(t.hours)');
    expect(String(summary.query)).toContain('t.company_name');
    expect(String(summary.query)).toContain('t.employee_name');
    expect(String(summary.query)).toContain(':work_date');
  });

  test('totals durable personal rows with the same date/search scope and guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_total_footer_values', ['schema', 'data']);
    const summary = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries_summary');
    expect((await repository.querySource(summary, valid, 0, 1)).data).toMatchObject({ entry_count: 10, total_hours: 42.75, total_time_spent_display: '42:45', time_encoding_method: 'hours' });
    expect((await repository.querySource(summary, { ...valid, work_date: 'this_week' }, 0, 1)).data).toMatchObject({ entry_count: 4, total_hours: 17.75, total_time_spent_display: '17:45' });
    expect((await repository.querySource(summary, { ...valid, q: 'Stakeholder' }, 0, 1)).data).toMatchObject({ entry_count: 1, total_hours: 2.5, total_time_spent_display: '02:30' });
    expect((await repository.querySource(summary, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 1)).data).toMatchObject({ entry_count: 3, total_hours: 13.5, total_time_spent_display: '13:30' });
    expect((await repository.querySource(summary, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toMatchObject({ entry_count: 0, total_hours: 0, total_time_spent_display: '00:00' });
    expect((await repository.querySource(summary, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toMatchObject({ entry_count: 0, total_hours: 0, total_time_spent_display: '00:00' });
    await expect(repository.querySource(summary, { ...valid, fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'TIMESHEETS_ENTRIES_SUMMARY_UNAVAILABLE' });
    database.close();
  });

  test('retains read permission and existing optimistic concurrency boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_total_footer_guards', ['schema', 'data']);
    const summary = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries_summary');
    const page = yaml('pages/entries.yaml');
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    expect(summary.permission).toBe('timesheets.read');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect(update.concurrency).toEqual({ required: true });
    await expect(repository.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-14', project_name: 'Core3 Implementation', description: 'Stale total footer edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('preserves the filtered total through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-total-footer-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const summary = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries_summary');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_total_footer_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_total_footer_restart', ['schema', 'data']);
      expect((await repository.querySource(summary, { ...valid, work_date: 'this_week' }, 0, 1)).data).toMatchObject({ total_hours: 17.75, total_time_spent_display: '17:45' });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_total_footer_restart', ['schema', 'data']);
      expect((await reopened.querySource(summary, { ...valid, work_date: 'this_week' }, 0, 1)).data).toMatchObject({ total_hours: 17.75, total_time_spent_display: '17:45' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
