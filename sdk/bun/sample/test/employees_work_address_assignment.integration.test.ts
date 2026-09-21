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

describe('Employees Work Address assignment parity', () => {
  test('maps Odoo employee Work Address to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_work_address');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const location = work.groups.find((group: any) => group.title === 'Location');

    expect(sourceModel).toContain("address_id = fields.Many2one(");
    expect(sourceModel).toContain("string='Work Address'");
    expect(sourceViews).toContain('<field name="address_id"');
    expect(sourceViews).toContain('<field name="work_location_id"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_work_address', permission: 'employees.write' }));
    expect(location.fields.map((field: any) => field.field)).toEqual(['address_name', 'work_location']);
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('work_address_id');
    expect(api.datasources.find((source: any) => source.id === 'employee_work_addresses_for_employee').query).toContain('employee_work_addresses');
    expect(edit.mutation.fields).toEqual(['work_address_id']);
    expect(edit.permission).toBe('employees.write');
  });

  test('assigns a Work Address to the employee and active Payroll record durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_address_assignment_crud');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_address');
    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { work_address_id: 'work-address-danang' },
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', work_address_id: 'work-address-danang', address_name: 'Da Nang Engineering Office', row_version: 2 });
    expect(await repository.query("SELECT work_address_id, work_address_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ work_address_id: 'work-address-danang', work_address_name: 'Da Nang Engineering Office' }]);
    await database.close();
  });

  test('rejects actor, invalid, stale, and cross-company Work Address changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_address_assignment_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_address');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { work_address_id: 'work-address-danang' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { work_address_id: 'work-address-legacy' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WORK_ADDRESS_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { work_address_id: 'work-address-sf' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WORK_ADDRESS_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_ADDRESS_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT work_address_id, address_name, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_address_id: 'work-address-core3-hq', address_name: 'Core3 Vietnam HQ, District 1', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Work Address assignments through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-address-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_address_assignment_restart');
    expect(await firstRepository.query("SELECT work_address_id, address_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_address_id: 'work-address-core3-hq', address_name: 'Core3 Vietnam HQ, District 1' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_address_assignment_restart');
    expect(await secondRepository.query("SELECT work_address_id, address_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_address_id: 'work-address-core3-hq', address_name: 'Core3 Vietnam HQ, District 1' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
