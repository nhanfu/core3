import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees manager assignment parity', () => {
  test('maps Odoo parent_id to separate page/API relation contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const edit = action(api, 'edit_employee_manager');

    expect(model).toContain("parent_id = fields.Many2one('hr.employee', 'Manager'");
    expect(views).toContain('<field name="parent_id" widget="many2one_avatar_employee"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('manager_id');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_manager_options').query).toContain('e.id <> target.id');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['manager_id']);
    expect(edit.mutation.guards.some((guard: any) => guard.code === 'EMPLOYEES_MANAGER_CYCLE')).toBe(true);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_manager' }));
    expect(work.groups[0].fields).toContainEqual({ field: 'manager_name', label: 'Manager' });
  });

  test('assigns and reads a same-company manager across employee and active Payroll records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_manager_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_manager');
    const options = await repository.querySource(api.datasources.find((entry: any) => entry.id === 'employee_manager_options'), { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 20);
    expect(options.data).toContainEqual({ value: 'employee-demo-002', label: 'Nguyen Minh Anh' });
    expect(options.data.find((row: any) => row.value === 'employee-demo-001')).toBeUndefined();

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', manager_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', manager_id: 'employee-demo-002', manager_name: 'Nguyen Minh Anh', org_parent_name: 'Nguyen Minh Anh', row_version: 2 });
    expect(await repository.query("SELECT manager_id, manager_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2026-01-01'")).toEqual([
      { manager_id: 'employee-demo-002', manager_name: 'Nguyen Minh Anh' },
    ]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, self, and cycle changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_manager_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_manager');
    const base = {
      id: 'employee-demo-001', manager_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_MANAGER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, manager_id: 'missing-manager' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_MANAGER_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, manager_id: 'employee-demo-001' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_MANAGER_INVALID' });
    const assigned = await repository.executeMutation(edit.mutation, base) as any;
    await expect(repository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', manager_id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_MANAGER_CYCLE' });
    expect(await repository.query("SELECT manager_id, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ manager_id: 'employee-demo-002', row_version: 2 }]);
    expect(assigned.manager_id).toBe('employee-demo-002');
    await database.close();
  });

  test('preserves manager relation through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-manager-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_manager_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_manager');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', manager_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_manager_restart');
    expect(await secondRepository.query("SELECT manager_id, manager_name FROM employees WHERE id = 'employee-demo-001'")).toEqual([
      { manager_id: 'employee-demo-002', manager_name: 'Nguyen Minh Anh' },
    ]);
    expect(await secondRepository.query("SELECT manager_id, manager_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2026-01-01'")).toEqual([
      { manager_id: 'employee-demo-002', manager_name: 'Nguyen Minh Anh' },
    ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
