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
  mine: 'mine',
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets My filter parity', () => {
  test('maps the Odoo mine search filter to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter name="mine" string="My Timesheets" domain="[(\'user_id\', \'=\', uid)]"/>');
    expect(odoo).toContain('<record id="timesheet_action_all" model="ir.actions.act_window">');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.filters).toContainEqual({ field: 'mine', label: 'My Timesheets', options: [{ id: 'mine', label: 'My Timesheets' }] });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(String(source.query)).toContain("COALESCE(:mine, '') <> 'mine' OR t.employee_name = COALESCE(NULLIF(:current_user_name, ''), 'Admin User')");
  });

  test('filters durable rows by actor and preserves the company and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_my_filter', ['schema', 'data']);
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50)).data.every((row: any) => row.employee_name === 'Morgan Taylor')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Unauthorized User' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, mine: null, current_user_name: 'Unauthorized User' }, 0, 50)).data.length).toBeGreaterThan(0);
    database.close();
  });

  test('retains the actor filter after a file-backed restart and keeps the manager permission', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-my-filter-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_my_filter_restart', ['schema', 'data']);
      expect(source.permission).toBe('timesheets.manage');
      expect((await repository.querySource(source, valid, 0, 50)).data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_my_filter_restart', ['schema', 'data']);
      const filtered = await reopened.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50);
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(filtered.data.every((row: any) => row.employee_name === 'Morgan Taylor')).toBe(true);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
