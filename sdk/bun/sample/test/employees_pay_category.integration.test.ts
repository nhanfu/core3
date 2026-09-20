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

describe('Employees Pay Category parity', () => {
  test('maps Odoo Payroll Pay Category to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_pay_category');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const payCategory = payroll.groups.find((group: any) => group.title === 'Pay Category');

    expect(sourceModel).toContain('structure_type_id = fields.Many2one');
    expect(sourceModel).toContain('groups="hr.group_hr_manager"');
    expect(sourceViews).toContain('<field name="structure_type_id" string="Pay Category"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_pay_category', permission: 'employees.manage' }));
    expect(payCategory).toMatchObject({ title: 'Pay Category', permission: 'employees.manage' });
    expect(payCategory.fields.map((field: any) => field.field)).toEqual(['pay_category_name']);
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('pay_category_name');
    expect(edit.mutation.fields).toEqual(['pay_category_name']);
    expect(edit.permission).toBe('employees.manage');
  });

  test('updates the employee and active Payroll record durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_pay_category_crud');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_pay_category');
    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { pay_category_name: 'Contractor' },
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', pay_category_name: 'Contractor', row_version: 2 });
    expect(await repository.query("SELECT pay_category_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ pay_category_name: 'Contractor' }]);
    await database.close();
  });

  test('rejects actor, invalid, stale, and cross-company Pay Category changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_pay_category_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_pay_category');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { pay_category_name: 'Worker' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { pay_category_name: 'Invalid' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PAY_CATEGORY_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PAY_CATEGORY_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT pay_category_name, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ pay_category_name: 'Employee', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Pay Category fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-pay-category-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_pay_category_restart');
    expect(await firstRepository.query("SELECT pay_category_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ pay_category_name: 'Employee' }]);
    expect(await firstRepository.query("SELECT pay_category_name FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ pay_category_name: 'Employee' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_pay_category_restart');
    expect(await secondRepository.query("SELECT pay_category_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ pay_category_name: 'Employee' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
