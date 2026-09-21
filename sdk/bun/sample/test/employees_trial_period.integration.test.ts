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

describe('Employees trial period parity', () => {
  test('maps Odoo trial_date_end to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const trial = payroll.groups.find((entry: any) => entry.title === 'Trial Period');
    const edit = action(api, 'edit_employee_trial_period');

    expect(sourceModel).toContain("trial_date_end = fields.Date('End of Trial Period'");
    expect(sourceViews).toContain('<page name="payroll_information" string="Payroll"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('trial_date_end');
    expect(trial).toMatchObject({ title: 'Trial Period', permission: 'employees.manage' });
    expect(trial.fields).toEqual([{ field: 'trial_date_end', label: 'End of Trial Period', readonly: true }]);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_trial_period', permission: 'employees.manage' }));
    expect(edit.permission).toBe('employees.manage');
    expect(edit.mutation.fields).toEqual(['trial_date_end']);
  });

  test('creates and edits the trial period with active Payroll persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_trial_period_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee_trial_period');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-TRIAL-001', name: 'Trial Period Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', contract_start: '2026-01-15', trial_date_end: '2026-03-31',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Trial Period Test', trial_date_end: '2026-03-31T00:00:00.000Z', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { trial_date_end: '2026-04-30' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', trial_date_end: '2026-04-30T00:00:00.000Z', row_version: 2 });
    expect(await repository.query("SELECT trial_date_end FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ trial_date_end: '2026-04-30T00:00:00.000Z' }]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid ordering, and missing Payroll records atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_trial_period_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_trial_period');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { trial_date_end: '2026-04-30' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TRIAL_PERIOD_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { trial_date_end: '2024-12-31' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TRIAL_DATE_BEFORE_START' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { trial_date_end: '04-30-2026' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TRIAL_DATE_INVALID' });
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam', values: { employee_number: 'EMP-TRIAL-NOVERSION', name: 'No Payroll Trial', hire_date: '2026-01-15', company_name: 'Core3 Vietnam' },
    }) as any;
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', values: { trial_date_end: '2026-03-31' },
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_TRIAL_PERIOD_VERSION_NOT_FOUND' });
    expect(await repository.query("SELECT trial_date_end, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ trial_date_end: '2026-03-31T00:00:00.000Z', row_version: 1 }]);
    await database.close();
  });

  test('preserves trial periods through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-trial-period-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_trial_period_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_trial_period');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager',
      values: { trial_date_end: '2026-05-15' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_trial_period_restart');
    expect(await secondRepository.query("SELECT trial_date_end FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ trial_date_end: '2026-05-15T00:00:00.000Z' }]);
    expect(await secondRepository.query("SELECT trial_date_end FROM employee_versions WHERE id = 'employee-version-admin-current'"))
      .toEqual([{ trial_date_end: '2026-05-15T00:00:00.000Z' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
