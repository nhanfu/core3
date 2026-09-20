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

describe('Employees bank accounts and salary allocation parity', () => {
  test('maps the Odoo Personal bank-account relation and keeps page/API contracts separate', () => {
    const model = readFileSync(join(odooRoot, 'models/hr_employee.py'), 'utf8');
    const wizard = readFileSync(join(odooRoot, 'wizard/hr_bank_account_wizard.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_bank_account');
    const edit = action(api, 'edit_employee_bank_account');
    const remove = action(api, 'delete_employee_bank_account');
    const grid = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal').component;

    expect(model).toMatch(/bank_account_ids = fields\.Many2many\(\s*'res\.partner\.bank'/);
    expect(model).toContain('salary_distribution = fields.Json');
    expect(wizard).toContain("_name = 'hr.bank.account.allocation.wizard'");
    expect(wizard).toContain('Total percentage allocation must equal 100%');
    expect(views).toContain('name="action_open_allocation_wizard"');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(grid).toMatchObject({ type: 'LineItemGrid', source: 'employee_bank_accounts', parent_source: 'employee_detail', variant: 'odoo_x2many' });
    expect(grid.children).toContainEqual(expect.objectContaining({ field: 'amount', input_type: 'number' }));
    expect(api.datasources.map((source: any) => source.id)).toContain('employee_bank_accounts');
    expect(add).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'employees.write', domain: 'employee_bank_account' });
    expect(edit).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'employees.write', domain: 'employee_bank_account' });
    expect(remove).toMatchObject({ type: 'server', handler: 'line_item', permission: 'employees.write', domain: 'employee_bank_account' });
  });

  test('seeds deterministic accounts and supports durable create, edit, and delete', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_bank_accounts_crud');
    const api = yaml('api/employee-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'employee_bank_accounts');
    const add = action(api, 'add_employee_bank_account');
    const edit = action(api, 'edit_employee_bank_account');
    const remove = action(api, 'delete_employee_bank_account');

    expect((await repository.querySource(source, { employee_id: base.id, current_company_name: base.current_company_name }, 0, 20)).data)
      .toMatchObject([{ id: 'employee-bank-admin-primary', amount: 70, amount_type: 'percentage', trusted: true }, { id: 'employee-bank-admin-secondary', amount: 30, amount_type: 'percentage', trusted: false }]);
    const created = await repository.executeMutation(add.mutation, {
      ...base,
      parent_expected_row_version: 1,
      values: { acc_number: 'VN-001-0003', bank_name: 'Techcombank', acc_holder_name: 'Admin User', currency_code: 'VND', amount: 0, amount_type: 'percentage', trusted: false },
    });
    expect(typeof created.id).toBe('string');
    expect(created).toMatchObject({ employee_id: base.id, acc_number: 'VN-001-0003', amount: 0, row_version: 1 });
    expect((await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).at(0)).toEqual({ row_version: 2 });
    const edited = await repository.executeMutation(edit.mutation, {
      ...base,
      line_id: created.id,
      parent_expected_row_version: 2,
      expected_row_version: 1,
      values: { acc_number: 'VN-001-0003', bank_name: 'Techcombank', acc_holder_name: 'Admin User', currency_code: 'VND', amount: 10, amount_type: 'fixed', trusted: true },
    });
    expect(edited).toMatchObject({ id: created.id, amount: 10, amount_type: 'fixed', trusted: true, row_version: 2 });
    await repository.executeMutation(remove.mutation, { ...base, line_id: created.id, parent_expected_row_version: 3, expected_row_version: 2 });
    expect(await repository.query(`SELECT id FROM employee_bank_accounts WHERE id = '${created.id}'`)).toEqual([]);
    expect((await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).at(0)).toEqual({ row_version: 4 });
    await database.close();
  });

  test('enforces actor, company, active, stale, duplicate, and allocation guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_bank_accounts_guards');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_bank_account');
    const edit = action(api, 'edit_employee_bank_account');
    const remove = action(api, 'delete_employee_bank_account');
    const values = { acc_number: 'VN-001-0003', bank_name: 'Techcombank', acc_holder_name: 'Admin User', currency_code: 'VND', amount: 10, amount_type: 'percentage', trusted: false };

    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, current_user_id: '', values })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BANK_ACCOUNT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, acc_number: 'VN-001-0001' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BANK_ACCOUNT_EXISTS' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, acc_number: 'VN-001-0003', amount: 31 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_BANK_ACCOUNT_ALLOCATION_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, line_id: 'employee-bank-admin-primary', parent_expected_row_version: 1, expected_row_version: 99, values: { ...values, acc_number: 'VN-001-0001', amount: 70 } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BANK_ACCOUNT_STALE' });
    await expect(repository.executeMutation(remove.mutation, { ...base, line_id: 'missing-bank', parent_expected_row_version: 1, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BANK_ACCOUNT_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_bank_accounts WHERE employee_id = 'employee-demo-001'")).toEqual([{ count: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves allocation rows through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-bank-accounts-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_bank_accounts_restart');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_bank_account');
    await firstRepository.executeMutation(edit.mutation, {
      ...base,
      line_id: 'employee-bank-admin-primary',
      parent_expected_row_version: 1,
      expected_row_version: 1,
      values: { acc_number: 'VN-001-0001', bank_name: 'Vietcombank', acc_holder_name: 'Admin User', currency_code: 'VND', amount: 65, amount_type: 'percentage', trusted: true },
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_bank_accounts_restart');
    expect(await secondRepository.query("SELECT row_version, acc_number, amount, trusted FROM employee_bank_accounts WHERE id = 'employee-bank-admin-primary'"))
      .toEqual([{ row_version: 2, acc_number: 'VN-001-0001', amount: 65, trusted: true }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
