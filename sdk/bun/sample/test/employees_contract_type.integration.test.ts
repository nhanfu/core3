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

describe('Employees contract type parity', () => {
  test('maps Odoo Payroll Contract Type to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const overview = payroll.groups.find((group: any) => group.title === 'Contract Overview');
    const datasource = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_contract_type');

    expect(source).toContain("contract_type_id = fields.Many2one('hr.contract.type'");
    expect(views).toContain('<field name="contract_type_id" string="Contract Type"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(overview.permission).toBe('employees.manage');
    expect(overview.fields).toEqual([{ field: 'contract_type_name', label: 'Contract Type', readonly: true }]);
    expect(datasource.query).toContain('contract_type_name');
    expect(edit.permission).toBe('employees.manage');
    expect(edit.mutation.fields).toEqual(['contract_type_name']);
    expect(edit.fields[0]).toMatchObject({ field: 'contract_type_name', label: 'Contract Type', required: true });
  });

  test('creates and edits contract type with current-version persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_contract_type_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_contract_type');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-CONTRACT-TYPE-001', name: 'Contract Type Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', contract_type_name: 'Temporary',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Contract Type Test', contract_type_name: 'Temporary', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { contract_type_name: 'Contractor' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', contract_type_name: 'Contractor', row_version: 2 });
    expect(await repository.query("SELECT contract_type_name, row_version FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ contract_type_name: 'Contractor', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company contract type changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_contract_type_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_contract_type');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { contract_type_name: 'Permanent' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_CONTRACT_TYPE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { contract_type_name: 'Seasonal' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CONTRACT_TYPE_INVALID' });
    expect(await repository.query("SELECT contract_type_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ contract_type_name: 'Temporary', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic contract types through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-contract-type-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_contract_type_restart');
    const expected = [
      { id: 'employee-demo-001', contract_type_name: 'Permanent' },
      { id: 'employee-demo-002', contract_type_name: 'Temporary' },
    ];
    expect(await firstRepository.query("SELECT id, contract_type_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_contract_type_restart');
    expect(await secondRepository.query("SELECT id, contract_type_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
