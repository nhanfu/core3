import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Child departments action parity', () => {
  test('maps Odoo child_of action to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_department.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_department_views.xml', 'utf8');
    const page = yaml('pages/department-children.yaml');
    const api = yaml('api/department-children.yaml');
    const listApi = yaml('api/departments.yaml');

    expect(source).toContain('def action_open_view_child_departments');
    expect(source).toContain('"name": "Child departments"');
    expect(source).toContain("['id', 'in', self.get_children_department_ids().ids]");
    expect(view).toContain('name="action_open_view_child_departments"');
    expect(view).toContain('>Child departments</a>');
    expect(page.page.id).toBe('employee-department-children');
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'employee_department_children', view_navigation: 'tabs' });
    expect(page.components[0].views.map((entry: any) => entry.id)).toEqual(['kanban', 'list', 'form']);
    expect(listApi.actions).toContainEqual(expect.objectContaining({
      id: 'open_department_children',
      navigate_to: '/employees/departments/children',
      permission: 'employees.read',
    }));
    expect(api.datasources[0].query).toContain('WITH RECURSIVE department_tree');
    expect(api.datasources[0].query).toContain('parent_id');
  });

  test('returns the selected department and all descendants with empty and stale-root guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_department_children', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_department_children', ['schema', 'data']);
    const source = yaml('api/department-children.yaml').datasources[0];

    const management = await repository.querySource(source, { root_department_id: 'department-management', active: null, q: null, fixture_state: null }, 0, 50);
    expect(management.data.map((row: any) => row.name)).toEqual([
      'Administration', 'Long Term Projects', 'Management', 'Professional Services', 'R&D USA', 'Research & Development', 'Sales',
    ]);
    const research = await repository.querySource(source, { root_department_id: 'department-research-development', active: null, q: null, fixture_state: null }, 0, 50);
    expect(research.data.map((row: any) => row.name)).toEqual(['Long Term Projects', 'R&D USA', 'Research & Development']);
    expect((await repository.querySource(source, { root_department_id: 'department-research-development', active: null, q: 'does-not-exist', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { root_department_id: 'missing-department', active: null, q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { root_department_id: 'department-management', active: null, q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DEPARTMENT_CHILDREN_UNAVAILABLE' });
    await database.close();
  });

  test('preserves parent relations through file-backed migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-department-children-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'employees_department_children_restart', ['schema', 'data']);
    expect(await firstRepository.query("SELECT parent_id FROM employee_departments WHERE id = 'department-long-term-projects'")).toEqual([{ parent_id: 'department-rnd-usa' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'employees_department_children_restart', ['schema', 'data']);
    expect(await secondRepository.query("SELECT parent_id FROM employee_departments WHERE id = 'department-long-term-projects'")).toEqual([{ parent_id: 'department-rnd-usa' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
