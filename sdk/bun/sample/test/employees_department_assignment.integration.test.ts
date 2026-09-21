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

describe('Employees Department assignment parity', () => {
  test('maps Odoo department_id to separate page/API relation contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const edit = action(api, 'edit_employee_department');

    expect(model).toContain("department_id = fields.Many2one('hr.department', check_company=True");
    expect(views).toContain('<field name="department_id"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('department_id');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_department_options').query).toContain('d.company_name');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['department_id']);
    expect(edit.mutation.guards.some((guard: any) => guard.code === 'EMPLOYEES_DEPARTMENT_INVALID')).toBe(true);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_department' }));
    expect(work.groups[0].fields).toContainEqual({ field: 'department_name', label: 'Department' });
  });

  test('assigns, clears, and reads a same-company Department across employee and active Payroll records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_department_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_department');
    const options = await repository.querySource(api.datasources.find((entry: any) => entry.id === 'employee_department_options'), { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50);
    expect(options.data).toContainEqual({ value: 'department-engineering', label: 'Engineering' });
    expect(options.data.find((row: any) => row.value === 'department-management')).toBeUndefined();

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', department_id: 'department-engineering', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', department_id: 'department-engineering', department_name: 'Engineering', row_version: 2 });
    expect(await repository.query("SELECT department_id, department_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2026-01-01'")).toEqual([
      { department_id: 'department-engineering', department_name: 'Engineering' },
    ]);

    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', department_id: null, expected_row_version: 2,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(cleared).toMatchObject({ id: 'employee-demo-001', department_id: null, department_name: null, row_version: 3 });
    await database.close();
  });

  test('rejects actor, stale, cross-company, and invalid Department changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_department_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_department');
    const base = {
      id: 'employee-demo-001', department_id: 'department-engineering', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTMENT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, department_id: 'department-management' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DEPARTMENT_INVALID' });
    expect(await repository.query("SELECT department_id, department_name, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([
      { department_id: 'department-engineering', department_name: 'Engineering', row_version: 1 },
    ]);
    await database.close();
  });

  test('preserves the Department relation through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-department-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_department_restart');
    expect(await firstRepository.query("SELECT department_id, department_name FROM employees WHERE id = 'employee-demo-002'")).toEqual([
      { department_id: 'department-engineering', department_name: 'Engineering' },
    ]);
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_department');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', department_id: null, expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_department_restart');
    expect(await secondRepository.query("SELECT department_id, department_name FROM employees WHERE id = 'employee-demo-002'")).toEqual([
      { department_id: null, department_name: null },
    ]);
    expect(await secondRepository.query("SELECT department_id, department_name FROM employee_versions WHERE employee_id = 'employee-demo-002' AND date_version = DATE '2025-01-01'")).toEqual([
      { department_id: null, department_name: null },
    ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
