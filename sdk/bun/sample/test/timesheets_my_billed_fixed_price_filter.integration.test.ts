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
  q: null,
  billing_type: 'billable_fixed',
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets My Timesheets Billed at a Fixed Price filter parity', () => {
  test('maps the Odoo sale_timesheet filter to paired page/API contracts', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter name="billable_fixed" string="Billed at a Fixed Price" domain="[(\'timesheet_invoice_type\', \'=\', \'billable_fixed\')]"');
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.filters).toContainEqual({ field: 'billing_type', label: 'Billed at a Fixed Price', options: [{ id: 'billable_fixed', label: 'Billed at a Fixed Price' }] });
    expect(source).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.meta.filter_contracts).toContainEqual({ field: 'billing_type', value: 'billable_fixed', label: 'Billed at a Fixed Price', source: 'timesheet_entries.billing_type' });
    expect(String(source.query)).toContain(':billing_type');
    expect(String(source.query)).toContain('COALESCE(t.billing_type');
  });

  test('filters durable personal rows while preserving actor, company, permission, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_billed_fixed_price_filter', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const summary = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries_summary');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((row: any) => row.billing_type === 'billable_fixed' && row.employee_name === 'Admin User')).toBe(true);
    expect((await repository.querySource(summary, valid, 0, 1)).data).toMatchObject({ entry_count: filtered.data.length, total_hours: 6, total_time_spent_display: '06:00' });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('timesheets.read');
    database.close();
  });

  test('reflects a persisted billing-type change in the next filtered read', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_billed_fixed_price_filter_concurrency', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    const before = await repository.querySource(source, valid, 0, 50);
    expect(before.data.length).toBeGreaterThan(0);
    const changedId = before.data[0].id;
    await repository.query("UPDATE timesheet_entries SET billing_type = 'billable_manual', row_version = row_version + 1 WHERE id = ?", [changedId]);
    expect((await repository.querySource(source, valid, 0, 50)).data.some((row: any) => row.id === changedId)).toBe(false);
    expect((await repository.querySource(source, { ...valid, billing_type: 'billable_manual' }, 0, 50)).data.some((row: any) => row.id === changedId)).toBe(true);
    database.close();
  });

  test('retains My Timesheets filtering after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-my-billed-fixed-price-filter-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_billed_fixed_price_filter_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_billed_fixed_price_filter_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      expect(before.data.length).toBeGreaterThan(0);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data.map((row: any) => [row.id, row.billing_type])).toEqual(before.data.map((row: any) => [row.id, row.billing_type]));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
