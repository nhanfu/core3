import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees activity filter parity', () => {
  test('maps Odoo stable filter IDs and keeps the page/API contracts separate', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const filters = page.components[0].filters;

    expect(source).toContain('name="filter_activities_my"');
    expect(source).toContain('name="activities_overdue"');
    expect(source).toContain('name="activities_today"');
    expect(source).toContain('name="activities_upcoming_all"');
    expect(page.page.id).toBe('employees');
    expect(api.page.id).toBe(page.page.id);
    expect(filters).toEqual(expect.arrayContaining([
      { field: 'my_activities', label: 'My Activities', options: [{ id: 'true', label: 'My Activities' }] },
      { field: 'activities_overdue', label: 'Late Activities', options: [{ id: 'true', label: 'Late Activities' }] },
      { field: 'activities_today', label: 'Today Activities', options: [{ id: 'true', label: 'Today Activities' }] },
      { field: 'activities_upcoming_all', label: 'Future Activities', options: [{ id: 'true', label: 'Future Activities' }] },
    ]));
    const list = api.datasources.find((entry: any) => entry.id === 'employees');
    expect(list.query).toContain('activity_user_id = :current_user_id');
    expect(list.query).toContain(':activities_overdue');
    expect(list.query).toContain(':activities_today');
    expect(list.query).toContain(':activities_upcoming_all');
    expect(discoverPages(join(import.meta.dir, '..')).pages.get('employees')).toBeTruthy();
  });

  test('returns current-user overdue/today/future scopes with company and read permission boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_activity_filters_query');
    const source = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const base = { active: 'true', q: null, state: null, department_name: null, coach_name: null, my_team: null, my_department: null, newly_hired: null, in_contract: null, out_of_contract: null, my_activities: null, activities_overdue: null, activities_today: null, activities_upcoming_all: null, current_user_id: 'user-admin', current_company_name: 'Core3 Vietnam' };

    expect((await repository.querySource(source, { ...base, my_activities: 'true' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-demo-001']);
    expect((await repository.querySource(source, { ...base, activities_overdue: 'true' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-demo-001']);
    expect((await repository.querySource(source, { ...base, current_user_id: 'user-hr-manager', activities_today: 'true' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002']);
    expect((await repository.querySource(source, { ...base, current_user_id: 'user-hr-manager', activities_upcoming_all: 'true' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-demo-001']);
    expect((await repository.querySource(source, { ...base, current_user_id: 'user-disp', my_activities: 'true' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...base, current_company_name: 'Other Company', my_activities: 'true' }, 0, 50)).data).toEqual([]);
    await database.close();
  }, 30000);

  test('replays the stable assignee projection and keeps it through file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-activity-filters-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_activity_filters_restart');
    expect(await firstRepository.query("SELECT activity_user_id FROM employee_activities WHERE id = 'employee-activity-001'"))
      .toEqual([{ activity_user_id: 'user-admin' }]);
    await migrate(firstRepository, 'employees_activity_filters_restart');
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM employee_activities WHERE activity_user_id = 'user-admin'"))
      .toEqual([{ count: 1 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_activity_filters_restart');
    expect(await secondRepository.query("SELECT activity_user_id FROM employee_activities WHERE id = 'employee-activity-adhoc-001'"))
      .toEqual([{ activity_user_id: 'user-hr-manager' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  }, 30000);
});
