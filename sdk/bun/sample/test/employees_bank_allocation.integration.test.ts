import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const odooRoot = '/home/nhanjs/projects/odoo/addons/hr';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

const base = {
  id: 'employee-demo-001',
  current_company_name: 'Core3 Vietnam',
  current_user_id: 'user-admin',
  current_user_name: 'Admin User',
};

describe('Employees bank-account allocation wizard parity', () => {
  test('maps the Odoo wizard and preserves page/API separation and navigation', () => {
    const wizard = readFileSync(join(odooRoot, 'wizard/hr_bank_account_wizard.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const employeePage = yaml('pages/employee-detail.yaml');
    const employeeApi = yaml('api/employee-detail.yaml');
    const page = yaml('pages/bank-allocation.yaml');
    const api = yaml('api/bank-allocation.yaml');
    const save = action(api, 'save_employee_bank_allocation');
    const edit = action(api, 'edit_employee_bank_allocation_line');
    const bankGrid = employeePage.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal').component;

    expect(wizard).toContain("_name = 'hr.bank.account.allocation.wizard'");
    expect(wizard).toContain('Total percentage allocation must equal 100%');
    expect(views).toContain('name="action_open_allocation_wizard"');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.datasources.map((source: any) => source.id)).toEqual(['employee_bank_allocation', 'employee_bank_allocation_lines']);
    expect(action(employeeApi, 'open_employee_bank_allocation')).toMatchObject({ type: 'navigate', permission: 'employees.write', navigate_to: '/employees/bank-allocations' });
    expect(bankGrid.actions).toContainEqual(expect.objectContaining({ id: 'open_employee_bank_allocation', permission: 'employees.write' }));
    expect(edit).toMatchObject({ type: 'server_form', permission: 'employees.write', handler: 'line_item', domain: 'employee_bank_allocation' });
    expect(save).toMatchObject({ type: 'server', permission: 'employees.write', operation: 'save_allocation' });
    expect(save.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'EMPLOYEES_BANK_ALLOCATION_TOTAL_INVALID' }), expect.objectContaining({ code: 'STALE_RECORD' })]));
  });

  test('edits allocation lines and saves an exact 100 percent distribution', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_bank_allocation_crud');
    const api = yaml('api/bank-allocation.yaml');
    const edit = action(api, 'edit_employee_bank_allocation_line');
    const save = action(api, 'save_employee_bank_allocation');

    expect((await repository.querySource(api.datasources[0], { ...base }, 0, 1)).data)
      .toMatchObject({ id: base.id, employee_name: 'Admin User', bank_account_count: 2, total_percentage: 100, allocation_status: 'Ready' });
    const edited = await repository.executeMutation(edit.mutation, {
      ...base, line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1,
      values: { amount: 60, amount_type: 'percentage', trusted: true },
    });
    expect(edited).toMatchObject({ id: 'employee-bank-admin-primary', amount: 60, row_version: 2 });
    const companion = await repository.executeMutation(edit.mutation, {
      ...base, line_id: 'employee-bank-admin-secondary', expected_row_version: 1, parent_expected_row_version: 2,
      values: { amount: 40, amount_type: 'percentage', trusted: false },
    });
    expect(companion).toMatchObject({ id: 'employee-bank-admin-secondary', amount: 40, row_version: 2 });
    const run = await repository.executeMutation(save.mutation, { ...base, expected_row_version: 3 });
    expect(run).toMatchObject({ employee_id: base.id, total_percentage: 100, percentage_line_count: 2, actor_id: 'user-admin' });
    expect(await repository.query("SELECT total_percentage, percentage_line_count FROM employee_bank_allocation_runs WHERE employee_id = 'employee-demo-001'"))
      .toEqual([{ total_percentage: 100, percentage_line_count: 2 }]);
    await database.close();
  });

  test('enforces actor, company, exact-total, and optimistic concurrency guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_bank_allocation_guards');
    const api = yaml('api/bank-allocation.yaml');
    const edit = action(api, 'edit_employee_bank_allocation_line');
    const save = action(api, 'save_employee_bank_allocation');
    const values = { amount: 80, amount_type: 'percentage', trusted: false };

    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '', line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company', line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BANK_ALLOCATION_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1, values: { ...values, amount: 71 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_BANK_ALLOCATION_OVER_100' });
    await expect(repository.executeMutation(save.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const edited = await repository.executeMutation(edit.mutation, { ...base, line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1, values: { ...values, amount: 60 } });
    expect(edited).toMatchObject({ amount: 60, row_version: 2 });
    await expect(repository.executeMutation(save.mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_BANK_ALLOCATION_TOTAL_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_bank_allocation_runs WHERE employee_id = 'employee-demo-001'"))
      .toEqual([{ count: 0 }]);
    await database.close();
  });

  test('keeps saved allocations and audit history through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-bank-allocation-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_bank_allocation_restart');
    const api = yaml('api/bank-allocation.yaml');
    const edit = action(api, 'edit_employee_bank_allocation_line');
    const save = action(api, 'save_employee_bank_allocation');
    await firstRepository.executeMutation(edit.mutation, { ...base, line_id: 'employee-bank-admin-primary', expected_row_version: 1, parent_expected_row_version: 1, values: { amount: 65, amount_type: 'percentage', trusted: true } });
    await firstRepository.executeMutation(edit.mutation, { ...base, line_id: 'employee-bank-admin-secondary', expected_row_version: 1, parent_expected_row_version: 2, values: { amount: 35, amount_type: 'percentage', trusted: false } });
    await firstRepository.executeMutation(save.mutation, { ...base, expected_row_version: 3 });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_bank_allocation_restart');
    expect(await secondRepository.query("SELECT amount, row_version FROM employee_bank_accounts WHERE id = 'employee-bank-admin-secondary'"))
      .toEqual([{ amount: 35, row_version: 2 }]);
    expect(await secondRepository.query("SELECT total_percentage, percentage_line_count FROM employee_bank_allocation_runs WHERE employee_id = 'employee-demo-001'"))
      .toEqual([{ total_percentage: 100, percentage_line_count: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
