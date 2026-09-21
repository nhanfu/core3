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
  employee_id: null,
  project_id: null,
  task_id: null,
  mine: null,
  billing_type: 'billable_manual',
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets Billed Manually filter parity', () => {
  test('maps Odoo sale_timesheet Billed Manually to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter name="billable_manual" string="Billed Manually" domain="[(\'timesheet_invoice_type\', \'=\', \'billable_manual\')]"');
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.filters).toContainEqual({ field: 'billing_type', label: 'Billed Manually', options: [{ id: 'billable_manual', label: 'Billed Manually' }] });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(source.meta.filter_contracts).toContainEqual({ field: 'billing_type', value: 'billable_manual', label: 'Billed Manually', source: 'timesheet_entries.billing_type' });
    expect(source.pivot.fields).toContain('billing_type');
    expect(String(source.query)).toContain(':billing_type');
  });

  test('filters durable rows by manual billing while preserving company, permission, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_billed_manually_filter', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((row: any) => row.billing_type === 'billable_manual')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('timesheets.manage');
    database.close();
  });

  test('reflects a concurrent billing-type change instead of retaining stale filtered rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_billed_manually_filter_concurrency', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const before = await repository.querySource(source, valid, 0, 50);
    expect(before.data.length).toBeGreaterThan(0);
    const changedId = before.data[0].id;
    await repository.query("UPDATE timesheet_entries SET billing_type = 'billable_time', billable = TRUE, row_version = row_version + 1 WHERE id = ?", [changedId]);
    expect((await repository.querySource(source, valid, 0, 50)).data.some((row: any) => row.id === changedId)).toBe(false);
    expect((await repository.querySource(source, { ...valid, billing_type: 'billable_time' }, 0, 50)).data.some((row: any) => row.id === changedId)).toBe(true);
    database.close();
  });

  test('retains Billed Manually filtering after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-billed-manually-filter-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_billed_manually_filter_restart', ['schema', 'data']);
      const initial = await repository.querySource(source, valid, 0, 50);
      expect(initial.data.length).toBeGreaterThan(0);
      expect(initial.data.every((row: any) => row.billing_type === 'billable_manual')).toBe(true);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_billed_manually_filter_restart', ['schema', 'data']);
      const filtered = await reopened.querySource(source, valid, 0, 50);
      expect(filtered.data.map((row: any) => row.id)).toEqual(initial.data.map((row: any) => row.id));
      expect(filtered.data.every((row: any) => row.billing_type === 'billable_manual')).toBe(true);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
