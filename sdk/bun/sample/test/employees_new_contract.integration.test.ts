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

const baseInput = {
  id: 'employee-demo-001',
  expected_row_version: 1,
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-hr-manager',
  values: { new_contract_date: '2027-01-01' },
};

describe('Employees New Contract parity', () => {
  test('maps Odoo New Contract to separate matching page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceButton = readFileSync('/home/nhanjs/projects/odoo/addons/hr/static/src/components/button_new_contract/button_new_contract.js', 'utf8');
    const sourceTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/hr/static/src/components/button_new_contract/button_new_contract.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const newContract = action(api, 'create_employee_new_contract');

    expect(sourceModel).toContain('def check_no_existing_contract(self, date):');
    expect(sourceModel).toContain('def create_contract(self, date):');
    expect(sourceButton).toContain('check_contract_finished');
    expect(sourceButton).toContain('check_no_existing_contract');
    expect(sourceButton).toContain('create_contract');
    expect(sourceTemplate).toContain('New Contract');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'create_employee_new_contract', label: 'New Contract', permission: 'employees.manage' }));
    expect(newContract).toMatchObject({ type: 'server_form', permission: 'employees.manage', action: 'employees.records.contract.new', operation: 'create' });
    expect(newContract.mutation.fields).toEqual(['new_contract_date']);
    expect(newContract.mutation.concurrency).toEqual({ required: true });
    expect(newContract.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'EMPLOYEES_ACTOR_REQUIRED', 'EMPLOYEES_NEW_CONTRACT_EMPLOYEE_NOT_FOUND', 'STALE_RECORD',
      'EMPLOYEES_NEW_CONTRACT_DATE_INVALID', 'EMPLOYEES_NEW_CONTRACT_DATE_INVALID',
      'EMPLOYEES_NEW_CONTRACT_CURRENT_OPEN', 'EMPLOYEES_NEW_CONTRACT_DATE_EXISTS',
      'EMPLOYEES_NEW_CONTRACT_OVERLAP', 'EMPLOYEES_NEW_CONTRACT_VERSION_NOT_FOUND',
    ]);
    expect(newContract.mutation.steps).toHaveLength(3);
    expect(newContract.mutation.result.query).toContain('employee_versions');
  });

  test('creates a copied Payroll version and preserves it after restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-new-contract-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_new_contract_crud');
    await firstRepository.query("UPDATE employee_versions SET contract_date_end = DATE '2026-12-31' WHERE id = 'employee-version-admin-current'");
    await firstRepository.query("UPDATE employee_versions SET contract_date_end = DATE '2026-12-31' WHERE id = 'employee-version-admin-future'");

    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_new_contract');
    const created = await firstRepository.executeMutation(create.mutation, baseInput) as any;
    expect(created).toMatchObject({
      id: 'employee-contract-employee-demo-001-2027-01-01',
      employee_id: 'employee-demo-001',
      contract_date_start: '2027-01-01T00:00:00.000Z',
      contract_date_end: null,
      wage: 7200,
      contract_type_name: 'Permanent',
    });
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2027-01-01'")).toEqual([{ count: 1 }]);
    expect(await firstRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 2 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_new_contract_crud');
    expect(await secondRepository.query("SELECT id, contract_date_start, contract_date_end, wage FROM employee_versions WHERE id = 'employee-contract-employee-demo-001-2027-01-01'")).toEqual([{
      id: 'employee-contract-employee-demo-001-2027-01-01',
      contract_date_start: '2027-01-01T00:00:00.000Z',
      contract_date_end: null,
      wage: 7200,
    }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });

  test('rejects unauthorized, stale, invalid, open-current, overlap, and duplicate transitions atomically', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_new_contract_guards');
    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_new_contract');

    await expect(repository.executeMutation(create.mutation, { ...baseInput, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { ...baseInput, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(create.mutation, { ...baseInput, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_NEW_CONTRACT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { ...baseInput, values: { new_contract_date: '01/01/2027' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_NEW_CONTRACT_DATE_INVALID' });
    await expect(repository.executeMutation(create.mutation, baseInput)).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_NEW_CONTRACT_CURRENT_OPEN' });

    await repository.query("UPDATE employee_versions SET contract_date_end = DATE '2026-12-31' WHERE id = 'employee-version-admin-current'");
    await expect(repository.executeMutation(create.mutation, { ...baseInput, values: { new_contract_date: '2026-02-15' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_NEW_CONTRACT_OVERLAP' });
    await repository.query("UPDATE employee_versions SET contract_date_end = DATE '2026-12-31' WHERE id = 'employee-version-admin-future'");
    await repository.executeMutation(create.mutation, baseInput);
    await expect(repository.executeMutation(create.mutation, { ...baseInput, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_NEW_CONTRACT_DATE_EXISTS' });
    expect(await repository.query("SELECT contract_date_end, row_version FROM employee_versions WHERE id = 'employee-version-admin-current'")).toEqual([{ contract_date_end: '2026-12-31T00:00:00.000Z', row_version: 1 }]);
    await database.close();
  });
});
