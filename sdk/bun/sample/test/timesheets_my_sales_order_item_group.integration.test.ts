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

describe('Timesheets My Timesheets Sales Order Item grouping parity', () => {
  test('maps the Odoo Sales Order Item group-by to the My Timesheets page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter string="Sales Order Item" name="groupby_sale_order_item" domain="[]"');
    expect(odoo).toContain("context=\"{'group_by': 'so_line'}\"");
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.group_by).toContainEqual({ field: 'sales_order_item', label: 'Sales Order Item' });
    expect(source.pivot.fields).toContain('sales_order_item');
    expect(source.meta.group_by_contracts).toContainEqual({ field: 'sales_order_item', label: 'Sales Order Item', source: 'timesheet_entries.sales_order_item' });
    expect(String(source.query)).toContain('t.sales_order_item');
  });

  test('groups durable Sales Order Items while preserving actor, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_sales_order_item_group', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    const result = await repository.querySource(source, valid, 0, 50);
    const groups = result.data.reduce((counts: Record<string, number>, row: any) => {
      const key = row.sales_order_item ?? '(No Sales Order Item)';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    expect(groups).toEqual({
      'Core3 Implementation (Stakeholder review)': 1,
      'Core3 Implementation (Design QA)': 1,
      'Delivery Enablement (Customer workshop)': 1,
      '(No Sales Order Item)': 1,
      'Core3 Implementation (Release planning)': 1,
      'Delivery Enablement (Sprint retrospective)': 1,
      'Core3 Implementation (Acceptance review)': 1,
      'Core3 Implementation (Module Migration)': 1,
      'Delivery Enablement (Delivery)': 1,
      'Delivery Enablement (Sprint)': 1,
    });
    expect(result.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('reflects a concurrent durable Sales Order Item update in the next grouping read', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_sales_order_item_group_concurrency', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ sales_order_item: null });
    await repository.query("UPDATE timesheet_entries SET sales_order_item = 'Core3 Delivery (Documentation)', row_version = row_version + 1 WHERE id = 'timesheet-my-012'");
    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ sales_order_item: 'Core3 Delivery (Documentation)' });
    database.close();
  });

  test('retains Sales Order Item grouping after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-my-sales-order-item-group-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_sales_order_item_group_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_sales_order_item_group_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      expect(source.permission).toBe('timesheets.read');
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data.map((row: any) => [row.id, row.sales_order_item])).toEqual(before.data.map((row: any) => [row.id, row.sales_order_item]));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
