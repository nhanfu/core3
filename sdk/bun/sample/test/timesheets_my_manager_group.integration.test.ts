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

describe('Timesheets My Timesheets Manager grouping parity', () => {
  test('maps Odoo Manager grouping to separate page/API contracts', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921140000-019-timesheets-manager-group.yaml'), 'utf8');

    expect(odooModel).toContain("manager_id = fields.Many2one('hr.employee', \"Manager\", related='employee_id.parent_id', store=True)");
    expect(odooView).toContain('<field name="manager_id"/>');
    expect(odooView).toContain("context=\"{'group_by': 'manager_id'}\"");
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(list.group_by).toContainEqual({ field: 'manager_name', label: 'Manager' });
    expect(source).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['manager_id', 'manager_name']));
    expect(String(source.query)).toContain('e.manager_name');
    expect(migration).toContain('timesheet_employees_manager_idx');
    expect(migration).toContain("'Admin User'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });

  test('returns durable manager context only for the active actor and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_manager_values', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const result = await repository.querySource(source, valid, 0, 50);
    expect(result.meta.total).toBe(10);
    expect(result.data[0]).toMatchObject({ employee_id: 'employee-demo-001', manager_id: 'employee-demo-003', manager_name: 'Priya Shah' });
    expect([...new Set(result.data.map((row: any) => row.manager_name))]).toEqual(['Priya Shah']);
    const morgan = await repository.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50);
    expect(morgan.data).toHaveLength(3);
    expect(morgan.data.every((row: any) => row.manager_name === 'Admin User')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains read permission, company guard, and stale-write concurrency boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_manager_guards', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const page = yaml('pages/entries.yaml');
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    expect(source.permission).toBe('timesheets.read');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect(update.concurrency).toEqual({ required: true });
    expect(update.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 403 })]));
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-14', project_name: 'Core3 Implementation', description: 'Stale manager grouping edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('preserves manager grouping through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-manager-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = serviceRoot + '/migrations';
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_manager_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_manager_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 50)).data[0]).toMatchObject({ manager_name: 'Priya Shah' });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_manager_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50)).data[0]).toMatchObject({ manager_id: 'employee-demo-001', manager_name: 'Admin User' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
