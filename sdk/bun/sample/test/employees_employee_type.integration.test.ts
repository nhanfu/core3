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

describe('Employees employee type parity', () => {
  test('maps Odoo Payroll employee_type to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const listPage = yaml('pages/employees.yaml');
    const api = yaml('api/employee-detail.yaml');
    const listApi = yaml('api/employees.yaml');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const group = payroll.groups.find((entry: any) => entry.title === 'Employee Type');
    const edit = action(api, 'edit_employee_type');

    expect(sourceModel).toContain("('employee', 'Employee')");
    expect(sourceModel).toContain("('freelance', 'Freelancer')");
    expect(sourceModel).toContain('groups="hr.group_hr_user"');
    expect(sourceViews).toContain('<field name="employee_type"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('employee_type');
    expect(listApi.datasources.find((entry: any) => entry.id === 'employees').query).toContain('e.employee_type');
    expect(listPage.components[0].group_by).toContainEqual({ field: 'employee_type', label: 'Employee Type' });
    expect(group).toMatchObject({ title: 'Employee Type', permission: 'employees.write' });
    expect(group.fields).toEqual([{ field: 'employee_type', label: 'Employee Type', readonly: true }]);
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['employee_type']);
    expect(edit.fields[0].options).toHaveLength(6);
  });

  test('creates and edits the employee type with active Payroll persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_employee_type_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee_type');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-TYPE-001', name: 'Employee Type Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', employee_type: 'student',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Employee Type Test', employee_type: 'student', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { employee_type: 'freelance' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', employee_type: 'freelance', employment_type: 'Freelancer', row_version: 2 });
    expect(await repository.query("SELECT employee_type FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ employee_type: 'freelance' }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, cross-company, and missing-version changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_employee_type_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_type');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { employee_type: 'worker' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_EMPLOYEE_TYPE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { employee_type: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_EMPLOYEE_TYPE_INVALID' });
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam', values: { employee_number: 'EMP-TYPE-NOVERSION', name: 'No Payroll Type', hire_date: '2026-01-15', company_name: 'Core3 Vietnam' },
    }) as any;
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', values: { employee_type: 'worker' },
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_EMPLOYEE_TYPE_VERSION_NOT_FOUND' });
    expect(await repository.query("SELECT employee_type, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ employee_type: 'employee', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic employee types through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-type-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_employee_type_restart');
    const expected = [
      { id: 'employee-demo-001', employee_type: 'employee' },
      { id: 'employee-demo-003', employee_type: 'contractor' },
    ];
    expect(await firstRepository.query("SELECT id, employee_type FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-003') ORDER BY id")).toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_employee_type_restart');
    expect(await secondRepository.query("SELECT id, employee_type FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-003') ORDER BY id")).toEqual(expected);
    expect(await secondRepository.query("SELECT employee_type FROM employee_versions WHERE id = 'employee-version-admin-current'")).toEqual([{ employee_type: 'employee' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
