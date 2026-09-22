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
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets My Timesheets Billing Type grouping parity', () => {
  test('maps the Odoo Billing Type group-by to the My Timesheets page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter string="Billing Type" name="groupby_timesheet_invoice_type" domain="[]"');
    expect(odoo).toContain("context=\"{'group_by': 'timesheet_invoice_type'}\"");
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.group_by).toContainEqual({ field: 'billing_type', label: 'Billing Type' });
    expect(source.pivot.fields).toContain('billing_type');
    expect(source.meta.group_by_contracts).toContainEqual({ field: 'billing_type', label: 'Billing Type', source: 'timesheet_entries.billing_type' });
    expect(String(source.query)).toContain('COALESCE(t.billing_type');
  });

  test('groups durable billing types while preserving actor, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_billing_type_group', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    const result = await repository.querySource(source, valid, 0, 50);
    const groups = result.data.reduce((counts: Record<string, number>, row: any) => {
      counts[row.billing_type] = (counts[row.billing_type] ?? 0) + 1;
      return counts;
    }, {});
    expect(groups).toEqual({ billable_time: 7, billable_fixed: 1, billable_milestones: 1, non_billable: 1 });
    expect(result.data.every((row: any) => row.employee_name === 'Admin User' && row.billing_type)).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('reflects a persisted billing-type change in the next grouping read', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_billing_type_group_concurrency', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ billing_type: 'non_billable' });
    await repository.query("UPDATE timesheet_entries SET billing_type = 'billable_time', row_version = row_version + 1 WHERE id = 'timesheet-my-012'");
    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ billing_type: 'billable_time' });
    database.close();
  });

  test('retains Billing Type grouping after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-my-billing-type-group-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_billing_type_group_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_billing_type_group_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      expect(source.permission).toBe('timesheets.read');
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
