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

describe('Employees bank-account trust toggle parity', () => {
  test('maps Odoo trust action and binds the row action through the separate page/API contracts', () => {
    const model = readFileSync(join(odooRoot, 'models/hr_employee.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const toggle = action(api, 'toggle_employee_bank_account_trust');
    const grid = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal').component;
    const rowActions = grid.children.find((child: any) => child.type === 'LineItemActions');

    expect(model).toContain('def action_toggle_primary_bank_account_trust(self):');
    expect(model).toContain('self.primary_bank_account_id.allow_out_payment = not current_val');
    expect(views).toContain('name="action_toggle_primary_bank_account_trust"');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.datasources.map((source: any) => source.id)).toContain('employee_bank_accounts');
    expect(toggle).toMatchObject({
      type: 'server',
      permission: 'employees.write',
      action: 'employees.records.bank_account.toggle_trust',
      operation: 'toggle_primary_bank_account_trust',
      domain: 'employee_bank_account',
    });
    expect(toggle.params).toEqual({
      id: '{state.id}',
      line_id: '{row.id}',
      expected_row_version: '{row.row_version}',
      parent_expected_row_version: '{state.employee_detail.row_version}',
    });
    expect(rowActions.actions).toContainEqual(expect.objectContaining({ id: 'toggle_employee_bank_account_trust', permission: 'employees.write' }));
  });

  test('toggles the durable trusted state and protects actor, company, parent, and line versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_bank_account_trust');
    const api = yaml('api/employee-detail.yaml');
    const toggle = action(api, 'toggle_employee_bank_account_trust');

    const toggled = await repository.executeMutation(toggle.mutation, {
      ...base,
      line_id: 'employee-bank-admin-primary',
      expected_row_version: 1,
      parent_expected_row_version: 1,
    });
    expect(toggled).toMatchObject({ id: 'employee-bank-admin-primary', trusted: false, row_version: 2 });
    expect(await repository.query("SELECT trusted, row_version FROM employee_bank_accounts WHERE id = 'employee-bank-admin-primary'"))
      .toEqual([{ trusted: false, row_version: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);

    await expect(repository.executeMutation(toggle.mutation, {
      ...base, current_user_id: '', line_id: 'employee-bank-admin-secondary', expected_row_version: 1, parent_expected_row_version: 2,
    })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(toggle.mutation, {
      ...base, current_company_name: 'Other Company', line_id: 'employee-bank-admin-secondary', expected_row_version: 1, parent_expected_row_version: 2,
    })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BANK_ACCOUNT_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(toggle.mutation, {
      ...base, line_id: 'employee-bank-admin-secondary', expected_row_version: 1, parent_expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(toggle.mutation, {
      ...base, line_id: 'employee-bank-admin-secondary', expected_row_version: 99, parent_expected_row_version: 2,
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_BANK_ACCOUNT_STALE' });
    expect(await repository.query("SELECT trusted, row_version FROM employee_bank_accounts WHERE id = 'employee-bank-admin-secondary'"))
      .toEqual([{ trusted: false, row_version: 1 }]);
    await database.close();
  });

  test('preserves the trust state and row versions through file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-bank-trust-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_bank_account_trust_restart');
    const toggle = action(yaml('api/employee-detail.yaml'), 'toggle_employee_bank_account_trust');
    await firstRepository.executeMutation(toggle.mutation, {
      ...base,
      line_id: 'employee-bank-admin-secondary',
      expected_row_version: 1,
      parent_expected_row_version: 1,
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_bank_account_trust_restart');
    expect(await secondRepository.query("SELECT trusted, row_version FROM employee_bank_accounts WHERE id = 'employee-bank-admin-secondary'"))
      .toEqual([{ trusted: true, row_version: 2 }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
