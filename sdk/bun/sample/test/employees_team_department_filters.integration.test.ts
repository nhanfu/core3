import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const source = () => yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

const defaults = {
  q: null,
  active: 'true',
  state: null,
  department_name: null,
  coach_name: null,
  my_team: null,
  my_department: null,
  newly_hired: null,
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-admin',
};

describe('Employees My Team and My Department filters', () => {
  test('maps the Odoo filters to the matching page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const sourceVersion = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');

    expect(sourceView).toContain('<filter name="my_team" string="My Team" domain="[(\'parent_id.user_id\', \'=\', uid)]"/>');
    expect(sourceView).toContain('<filter name="my_department" string="My Department" domain="[(\'member_of_department\', \'=\', True)]"/>');
    expect(sourceVersion).toContain('def _search_part_of_department(self, operator, value):');
    expect(page.page.id).toBe(api.page.id);
    expect(page.components[0].filters).toContainEqual({ field: 'my_team', label: 'My Team', options: [{ id: 'true', label: 'My Team' }] });
    expect(page.components[0].filters).toContainEqual({ field: 'my_department', label: 'My Department', options: [{ id: 'true', label: 'My Department' }] });
    expect(source().query).toContain('AS my_team');
    expect(source().query).toContain('AS my_department');
    expect(source().query).toContain(':current_user_id');
    expect(source().query).toContain(':my_team');
    expect(source().query).toContain(':my_department');
  });

  test('returns the current user team and department within the current company', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_team_department_filters');

    const team = await repository.querySource(source(), { ...defaults, my_team: 'true' }, 0, 50);
    expect(team.data.map((row: any) => row.id)).toEqual(['employee-demo-002', 'employee-demo-003']);
    expect(team.data.every((row: any) => row.my_team === true)).toBe(true);

    const department = await repository.querySource(source(), { ...defaults, my_department: 'true' }, 0, 50);
    expect(department.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect(department.data.every((row: any) => row.my_department === true)).toBe(true);

    const scoped = await repository.querySource(source(), { ...defaults, current_company_name: 'Other Company', my_department: 'true' }, 0, 50);
    expect(scoped.data).toEqual([]);
    await database.close();
  });

  test('returns an empty result for an actor without a same-company employee and survives restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-team-department-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_team_department_restart');

    const empty = await firstRepository.querySource(source(), { ...defaults, current_user_id: 'user-unknown', my_team: 'true' }, 0, 50);
    expect(empty.data).toEqual([]);
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'employees_scope_filter_idx'")).toEqual([{ count: 1 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_team_department_restart');
    const department = await secondRepository.querySource(source(), { ...defaults, my_department: 'true' }, 0, 50);
    expect(department.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
