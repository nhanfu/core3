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

describe('Employees contract period parity', () => {
  test('maps Odoo Payroll contract dates to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const dates = payroll.groups.find((entry: any) => entry.title === 'Contract Dates');
    const edit = action(api, 'edit_employee_contract_period');

    expect(sourceModel).toContain("contract_date_start = fields.Date('Contract Start Date'");
    expect(sourceModel).toContain("contract_date_end = fields.Date(");
    expect(sourceViews).toContain('<field name="contract_date_start" string="Start Date"');
    expect(sourceViews).toContain('<field name="contract_date_end" string="End Date"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('contract_start');
    expect(dates).toMatchObject({ title: 'Contract Dates', permission: 'employees.manage' });
    expect(dates.fields).toEqual([
      { field: 'contract_start', label: 'Contract Start Date', readonly: true },
      { field: 'contract_end', label: 'Contract End Date', readonly: true },
    ]);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_contract_period', permission: 'employees.manage' }));
    expect(edit.permission).toBe('employees.manage');
    expect(edit.mutation.fields).toEqual(['contract_start', 'contract_end']);
  });

  test('creates and edits Contract Dates with active Payroll persistence', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_contract_period_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee_contract_period');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-PERIOD-001', name: 'Contract Period Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', contract_start: '2026-01-15', contract_end: '2026-12-31',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Contract Period Test', contract_start: '2026-01-15T00:00:00.000Z', contract_end: '2026-12-31T00:00:00.000Z', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { contract_start: '2026-02-01', contract_end: '2026-11-30' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', contract_start: '2026-02-01T00:00:00.000Z', contract_end: '2026-11-30T00:00:00.000Z', row_version: 2 });
    expect(await repository.query("SELECT contract_date_start, contract_date_end FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2026-01-01'"))
      .toEqual([{ contract_date_start: '2026-02-01T00:00:00.000Z', contract_date_end: '2026-11-30T00:00:00.000Z' }]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid-order, invalid-format, and missing-version changes atomically', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_contract_period_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_contract_period');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { contract_start: '2026-02-01', contract_end: '2026-11-30' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_CONTRACT_PERIOD_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { contract_start: '2026-12-01', contract_end: '2026-11-30' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CONTRACT_PERIOD_ORDER_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { contract_start: '02/01/2026', contract_end: '2026-11-30' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CONTRACT_PERIOD_START_INVALID' });
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam', values: { employee_number: 'EMP-PERIOD-NOVERSION', name: 'No Payroll Period', hire_date: '2026-01-15', company_name: 'Core3 Vietnam' },
    }) as any;
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', values: { contract_start: '2026-02-01', contract_end: '2026-11-30' },
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_CONTRACT_PERIOD_VERSION_NOT_FOUND' });
    expect(await repository.query("SELECT contract_start, contract_end, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ contract_start: '2025-01-15T00:00:00.000Z', contract_end: null, row_version: 1 }]);
    await database.close();
  });

  test('preserves contract dates through migration replay and restart', { timeout: 15000 }, async () => {
    const databasePath = `/tmp/core3-employees-contract-period-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_contract_period_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_contract_period');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { contract_start: '2026-02-01', contract_end: '2026-11-30' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_contract_period_restart');
    expect(await secondRepository.query("SELECT contract_start, contract_end FROM employees WHERE id = 'employee-demo-001'")).toEqual([
      { contract_start: '2026-02-01T00:00:00.000Z', contract_end: '2026-11-30T00:00:00.000Z' },
    ]);
    expect(await secondRepository.query("SELECT contract_date_start, contract_date_end FROM employee_versions WHERE id = 'employee-version-admin-current'")).toEqual([
      { contract_date_start: '2026-02-01T00:00:00.000Z', contract_date_end: '2026-11-30T00:00:00.000Z' },
    ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
