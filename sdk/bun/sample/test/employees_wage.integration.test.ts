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

describe('Employees Payroll wage parity', () => {
  test('maps Odoo Payroll Wage to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const wage = payroll.groups.find((entry: any) => entry.title === 'Wage');
    const edit = action(api, 'edit_employee_wage');

    expect(model).toContain('wage = fields.Monetary');
    expect(views).toContain('<field name="wage" class="oe_inline o_hr_narrow_field"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain(', wage,');
    expect(wage).toMatchObject({ title: 'Wage', permission: 'employees.manage' });
    expect(wage.fields).toEqual([{ field: 'wage', label: 'Monthly Wage', readonly: true }]);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_wage', permission: 'employees.manage' }));
    expect(edit.permission).toBe('employees.manage');
    expect(edit.mutation.fields).toEqual(['wage']);
    expect(edit.fields[0]).toMatchObject({ field: 'wage', label: 'Monthly Wage', type: 'number', min: 0 });
  });

  test('updates employee and active Payroll wage durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_wage_crud');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_wage');
    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { wage: 5000 },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', wage: 5000, row_version: 2 });
    expect(await repository.query("SELECT wage, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ wage: 5000, row_version: 2 }]);
    expect(await repository.query("SELECT wage, row_version FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ wage: 5000, row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company wage changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_wage_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_wage');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { wage: 3100 },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WAGE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { wage: -1 } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WAGE_INVALID' });
    expect(await repository.query("SELECT wage, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ wage: 2800, row_version: 1 }]);
    await database.close();
  });

  test('preserves Payroll wage through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-wage-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_wage_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_wage');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { wage: 3150 },
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_wage_restart');
    expect(await secondRepository.query("SELECT wage, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ wage: 3150, row_version: 2 }]);
    expect(await secondRepository.query("SELECT wage, row_version FROM employee_versions WHERE employee_id = 'employee-demo-002' AND active = true ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ wage: 3150, row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
