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

describe('Timesheets My Timesheets search scope parity', () => {
  test('matches Odoo primary search visibility and keeps page/API contracts separate', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<record id="hr_timesheet_line_my_timesheet_search"');
    expect(odoo).toContain('<field name="employee_id" position="replace"/>');
    expect(odoo).toContain('<field name="department_id" position="replace"/>');
    expect(odoo).toContain('<field name="manager_id" position="replace"/>');
    expect(odoo).toContain('<filter name="groupby_department" position="replace"/>');
    expect(odoo).toContain('<filter name="groupby_manager" position="replace"/>');
    expect(odoo).toContain('<filter name="groupby_employee" position="replace"/>');

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.group_by).toEqual([
      { field: 'project_name', label: 'Project' },
      { field: 'task_name', label: 'Task' },
      { field: 'parent_task_name', label: 'Parent Task' },
      { field: 'sales_order_item', label: 'Sales Order Item' },
      { field: 'invoice_name', label: 'Invoice' },
      { field: 'billing_type', label: 'Billing Type' },
      { field: 'state', label: 'Status' },
    ]);
    expect(source.pivot.fields).toEqual(expect.arrayContaining([
      'employee_name',
      'department_name',
      'manager_name',
    ]));
    expect(source.permission).toBe('timesheets.read');
  });

  test('reads durable scoped rows while preserving actor, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_search_scope', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    const result = await repository.querySource(source, valid, 0, 50);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    expect(result.data.every((row: any) => 'department_name' in row && 'manager_name' in row)).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains My Timesheets search scope after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-my-search-scope-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_search_scope_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_search_scope_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data.map((row: any) => [row.id, row.employee_name, row.department_name, row.manager_name])).toEqual(
        before.data.map((row: any) => [row.id, row.employee_name, row.department_name, row.manager_name]),
      );
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
