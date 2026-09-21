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

describe('Employees company assignment parity', () => {
  test('maps Odoo company_id to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const edit = action(api, 'edit_employee_company');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const options = api.datasources.find((entry: any) => entry.id === 'employee_company_options');

    expect(sourceModel).toContain("company_id = fields.Many2one('res.company', required=True");
    expect(sourceView).toContain('<field name="company_id" groups="base.group_multi_company"');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('company_id');
    expect(options.query).toContain('employee_companies');
    expect(work.groups[0].fields).toContainEqual({ field: 'company_name', label: 'Company' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'employees.manage' });
    expect(edit.mutation.fields).toEqual(['company_id']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_COMPANY_INVALID' }),
      expect.objectContaining({ code: 'EMPLOYEES_COMPANY_VERSION_NOT_FOUND' }),
    ]));
  });

  test('assigns and reads the company across employee and active Payroll records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_company_assignment_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_company');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const options = api.datasources.find((entry: any) => entry.id === 'employee_company_options');

    expect((await repository.querySource(options, {}, 0, 20)).data).toEqual(expect.arrayContaining([
      { value: 'company-demo', label: 'Core3 Demo Company' },
      { value: 'company-vietnam', label: 'Core3 Vietnam' },
    ]));
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { company_id: 'company-vietnam', company_name: 'Core3 Vietnam', row_version: 1 } });
    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { company_id: 'company-demo' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', company_id: 'company-demo', company_name: 'Core3 Demo Company', row_version: 2 });
    expect(await repository.query("SELECT company_id, company_name, row_version FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1")).toEqual([{ company_id: 'company-demo', company_name: 'Core3 Demo Company', row_version: 2 }]);
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { company_id: 'company-demo', company_name: 'Core3 Demo Company', row_version: 2 } });
    await database.close();
  });

  test('rejects actor, stale, wrong-company, invalid, and missing Payroll records atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_company_assignment_guards');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_company');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { company_id: 'company-demo' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_COMPANY_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { company_id: 'missing-company' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_COMPANY_INVALID' });
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam', values: { employee_number: 'EMP-COMPANY-NOVERSION', name: 'No Payroll Company', hire_date: '2026-01-15', company_name: 'Core3 Vietnam' },
    }) as any;
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', values: { company_id: 'company-demo' },
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_COMPANY_VERSION_NOT_FOUND' });
    expect(await repository.query("SELECT company_id, company_name, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ company_id: 'company-vietnam', company_name: 'Core3 Vietnam', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic company relations through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-company-assignment-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_company_assignment_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_company');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', values: { company_id: 'company-demo' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_company_assignment_restart');
    expect(await secondRepository.query("SELECT company_id, company_name FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ company_id: 'company-demo', company_name: 'Core3 Demo Company' }]);
    expect(await secondRepository.query("SELECT company_id, company_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1")).toEqual([{ company_id: 'company-demo', company_name: 'Core3 Demo Company' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
