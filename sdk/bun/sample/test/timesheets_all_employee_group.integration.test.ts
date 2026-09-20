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

describe('Timesheets All Timesheets Employee grouping parity', () => {
  test('maps the Odoo All Timesheets Employee group-by to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<record id="timesheet_action_all" model="ir.actions.act_window">');
    expect(odoo).toContain('<filter string="Employee" name="groupby_employee" domain="[]" context="{\'group_by\': \'employee_id\'}"/>');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.group_by).toContainEqual({ field: 'employee_name', label: 'Employee' });
    expect(list.views.find((view: any) => view.id === 'pivot').pivot.fields).toContainEqual({ field: 'employee_id', column: 'Employee ID' });
    expect(list.columns).toContainEqual({ field: 'employee_id', label: 'Employee ID', optional: 'hide' });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toContain('employee_id');
    expect(String(source.query)).toContain('t.employee_id');
  });

  test('returns durable employee relation context for the active company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_all_employee_group_values', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const result = await repository.querySource(source, valid, 0, 50);
    expect(result.meta.total).toBe(15);
    expect(result.data[0]).toMatchObject({ employee_id: 'employee-demo-001', employee_name: 'Admin User' });
    expect([...new Set(result.data.map((row: any) => row.employee_id))]).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains manager permission, company guard, and stale approver concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_all_employee_group_guards', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const page = yaml('pages/all-timesheets.yaml');
    const update = yaml('api/all-timesheets-detail.yaml').actions.find((action: any) => action.id === 'edit_all_timesheet_detail').mutation;
    expect(source.permission).toBe('timesheets.manage');
    expect(page.page.auth.require).toEqual(['timesheets.manage']);
    expect(update.concurrency).toEqual({ required: true });
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(update, {
      id: 'timesheet-report-003', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-13', project_name: 'Core3 Implementation', description: 'Stale employee grouping edit', hours: 4 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('preserves employee relation grouping across migration replay and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-employee-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = serviceRoot + '/migrations';
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_employee_group_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_employee_group_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 50)).data[0]).toMatchObject({ employee_id: 'employee-demo-001' });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_employee_group_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, valid, 0, 50)).data[4]).toMatchObject({ employee_id: 'employee-demo-002', employee_name: 'Morgan Taylor' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
