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
  sales_order_item: 'Core3 Implementation (Stakeholder review)',
  q: null,
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets Sales Order Item action parity', () => {
  test('maps the Odoo Sales Order Item action to separate page/API contracts', () => {
    const page = yaml('pages/sales-order-item-timesheets.yaml');
    const api = yaml('api/sales-order-item-timesheets.yaml');
    const allPage = yaml('pages/all-timesheets.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const list = page.components.find((item: any) => item.type === 'ListView');

    expect(odoo).toContain('<record id="timesheet_action_from_sales_order_item" model="ir.actions.act_window">');
    expect(odoo).toContain("[('project_id', '!=', False), ('so_line', '=', active_id)]");
    expect(odoo).toContain("'search_default_billable_timesheet': True");
    expect(odoo).toContain("'search_default_week': 1");
    expect(page.page).toMatchObject({ id: 'sales-order-item-timesheets', route: '/timesheets/sales-order-item', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'sales-order-item-timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list).toMatchObject({ source: 'sales_order_item_timesheet_entries', default_filters: { work_date: 'this_week' }, row_open_action: 'view_sales_order_item_timesheet_entry' });
    expect(allPage.actions).toContainEqual({ id: 'view_sales_order_item_timesheets', type: 'navigate', permission: 'timesheets.manage', navigate_to: '/timesheets/sales-order-item', params: { sales_order_item: '{row.sales_order_item}' } });
    expect(api.datasources.find((source: any) => source.id === 'sales_order_item_timesheet_entries')).toMatchObject({ permission: 'timesheets.manage', workflow: 'timesheet_entries' });
  });

  test('reads durable billable rows while enforcing relation, company, empty, and current-week guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_sales_order_item_action', ['schema', 'data']);
    const source = yaml('api/sales-order-item-timesheets.yaml').datasources.find((item: any) => item.id === 'sales_order_item_timesheet_entries');
    const context = yaml('api/sales-order-item-timesheets.yaml').datasources.find((item: any) => item.id === 'sales_order_item_timesheet_context');

    const rows = await repository.querySource(source, valid, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
    expect(rows.data[0]).toMatchObject({ sales_order_item: valid.sales_order_item, billing_type: 'billable_time', work_date: '2026-01-14' });
    expect((await repository.querySource(source, { ...valid, work_date: 'this_week' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, sales_order_item: 'missing sales item' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, valid, 0, 1)).data).toMatchObject({ sales_order_item: valid.sales_order_item, entry_count: 1, total_hours: 2.5 });
    database.close();
  });

  test('reflects a concurrent sales-order relation change without stale rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_sales_order_item_action_concurrency', ['schema', 'data']);
    const source = yaml('api/sales-order-item-timesheets.yaml').datasources.find((item: any) => item.id === 'sales_order_item_timesheet_entries');

    expect((await repository.querySource(source, valid, 0, 50)).data).toHaveLength(1);
    await repository.query("UPDATE timesheet_entries SET sales_order_item = 'Wave 25 Sales Item', row_version = row_version + 1 WHERE id = 'timesheet-my-009'");
    expect((await repository.querySource(source, valid, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, sales_order_item: 'Wave 25 Sales Item' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
    database.close();
  });

  test('retains the scoped action after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-sales-order-item-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/sales-order-item-timesheets.yaml').datasources.find((item: any) => item.id === 'sales_order_item_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_sales_order_item_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_sales_order_item_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
