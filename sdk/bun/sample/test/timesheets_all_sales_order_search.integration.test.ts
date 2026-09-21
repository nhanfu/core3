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
  q: 'Stakeholder review)',
  employee_id: null,
  project_id: null,
  task_id: null,
  mine: null,
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets Sales Order search parity', () => {
  test('maps Odoo sale_timesheet Sales Order search to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<field name="order_id" string="Sales Order" filter_domain="[\'|\', (\'so_line\', \'ilike\', self), (\'order_id\', \'ilike\', self)]"/>');
    expect(odoo).toContain('<record id="timesheet_view_search" model="ir.ui.view">');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.search).toMatchObject({ label: 'Search all timesheets' });
    expect(list.search.placeholder).toContain('sales order');
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(String(source.query)).toContain('t.sales_order_item ILIKE');
  });

  test('searches the durable Sales Order relation while enforcing company, actor, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_sales_order_search', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
    expect(filtered.data[0]).toMatchObject({ sales_order_item: 'Core3 Implementation (Stakeholder review)' });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('reflects a concurrent durable relation update instead of retaining stale search results', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_sales_order_search_concurrency', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    expect((await repository.querySource(source, valid, 0, 50)).data).toHaveLength(1);
    await repository.query("UPDATE timesheet_entries SET sales_order_item = 'Wave 19 Sales Order', row_version = row_version + 1 WHERE id = 'timesheet-my-009'");
    expect((await repository.querySource(source, valid, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, q: 'Wave 19 Sales Order' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
    database.close();
  });

  test('retains Sales Order search after a file-backed restart and keeps the manager permission', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-sales-order-search-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_sales_order_search_restart', ['schema', 'data']);
      expect(source.permission).toBe('timesheets.manage');
      expect((await repository.querySource(source, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_sales_order_search_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, valid, 0, 50)).data.map((row: any) => row.id)).toEqual(['timesheet-my-009']);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
