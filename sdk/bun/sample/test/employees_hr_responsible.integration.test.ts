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

describe('Employees HR responsible parity', () => {
  test('maps Odoo Settings Approvers to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const approvers = settings.groups.find((group: any) => group.title === 'Approvers');
    const datasource = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_hr_responsible');

    expect(source).toContain("hr_responsible_id = fields.Many2one(");
    expect(views).toContain('<field name="hr_responsible_id" widget="many2one_avatar_user"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(approvers.permission).toBe('employees.write');
    expect(approvers.fields).toEqual([{ field: 'hr_responsible_name', label: 'HR Responsible', readonly: true }]);
    expect(datasource.query).toContain('hr_responsible_name');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['hr_responsible_name']);
    expect(edit.fields[0]).toMatchObject({ field: 'hr_responsible_name', label: 'HR Responsible', required: true });
  });

  test('creates and edits HR responsible with current-version persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_hr_responsible_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_hr_responsible');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-HR-RESPONSIBLE-001', name: 'HR Responsible Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', hr_responsible_name: 'People Operations',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'HR Responsible Test', hr_responsible_name: 'People Operations', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { hr_responsible_name: 'Admin User' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', hr_responsible_name: 'Admin User', row_version: 2 });
    expect(await repository.query("SELECT hr_responsible_name, row_version FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ hr_responsible_name: 'Admin User', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company HR responsible changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_hr_responsible_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_hr_responsible');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { hr_responsible_name: 'HR Manager' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_HR_RESPONSIBLE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { hr_responsible_name: 'Payroll Clerk' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_HR_RESPONSIBLE_INVALID' });
    expect(await repository.query("SELECT hr_responsible_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ hr_responsible_name: 'People Operations', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic HR responsible values through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-hr-responsible-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_hr_responsible_restart');
    const expected = [
      { id: 'employee-demo-001', hr_responsible_name: 'HR Manager' },
      { id: 'employee-demo-002', hr_responsible_name: 'People Operations' },
    ];
    expect(await firstRepository.query("SELECT id, hr_responsible_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_hr_responsible_restart');
    expect(await secondRepository.query("SELECT id, hr_responsible_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
