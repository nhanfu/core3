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
  billing_type: null,
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets Billing Type grouping parity', () => {
  test('maps Odoo Billing Type group-by to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter string="Billing Type" name="groupby_timesheet_invoice_type" domain="[]"');
    expect(odoo).toContain("context=\"{'group_by': 'timesheet_invoice_type'}\"");
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.group_by).toContainEqual({ field: 'billing_type', label: 'Billing Type' });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toContain('billing_type');
    expect(source.meta.group_by_contracts).toContainEqual({ field: 'billing_type', label: 'Billing Type', source: 'timesheet_entries.billing_type' });
  });

  test('groups durable billing types while enforcing manager, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_billing_type_group', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const rows = await repository.querySource(source, valid, 0, 100);
    const groups = rows.data.reduce((counts: Record<string, number>, row: any) => {
      counts[row.billing_type] = (counts[row.billing_type] ?? 0) + 1;
      return counts;
    }, {});
    expect(groups).toEqual({ billable_time: 8, billable_fixed: 2, billable_manual: 1, non_billable: 3, billable_milestones: 1 });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    expect(source.permission).toBe('timesheets.manage');
    database.close();
  });

  test('reflects a concurrent billing-type change in the next grouping read', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_billing_type_group_concurrency', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const before = await repository.querySource(source, valid, 0, 100);
    expect(before.data.find((row: any) => row.id === 'timesheet-report-003')).toMatchObject({ billing_type: 'billable_manual' });
    await repository.query("UPDATE timesheet_entries SET billing_type = 'billable_fixed', row_version = row_version + 1 WHERE id = 'timesheet-report-003'");
    const after = await repository.querySource(source, valid, 0, 100);
    expect(after.data.find((row: any) => row.id === 'timesheet-report-003')).toMatchObject({ billing_type: 'billable_fixed' });
    database.close();
  });

  test('retains Billing Type grouping after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-billing-type-group-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_billing_type_group_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 100)).data.find((row: any) => row.id === 'timesheet-report-003')).toMatchObject({ billing_type: 'billable_manual' });
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_billing_type_group_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, valid, 0, 100)).data.find((row: any) => row.id === 'timesheet-report-003')).toMatchObject({ billing_type: 'billable_manual' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
