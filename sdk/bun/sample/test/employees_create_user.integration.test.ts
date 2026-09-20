import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const authRoot = join(import.meta.dir, '../services/auth');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(authRoot, 'migrations'), undefined, `${name}_auth`, ['schema', 'data']);
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, `${name}_employees`, ['schema', 'data']);
}

describe('Employees Create User parity', () => {
  test('maps Odoo action_create_user and the ERP-manager modal contract', () => {
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const create = action(api, 'create_employee_user');

    expect(sourceViews).toContain('button string="Create User" name="action_create_user"');
    expect(sourceViews).toContain('groups="base.group_erp_manager"');
    expect(sourceModel).toContain("'default_name': self.name");
    expect(sourceModel).toContain("'default_login': self.work_email");
    expect(sourceModel).toContain("'default_phone': self.work_phone");
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({
      id: 'create_employee_user', label: 'Create User', variant: 'primary', permission: 'auth.users.manage', show_if: '!state.employee_detail.auth_user_id',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'employee_user_wizard')).toMatchObject({ single: true, permission: 'employees.read' });
    expect(create).toMatchObject({
      type: 'server_form', permission: 'auth.users.manage', handler: 'yaml_mutation',
      action: 'employees.records.create_user', prefill: 'state.employee_user_wizard',
    });
    expect(create.fields.map((field: any) => field.label)).toEqual(['Name', 'Login', 'Phone']);
    expect(create.mutation.steps).toHaveLength(2);
    expect(create.mutation.steps[0].query).toContain('INSERT INTO users');
    expect(create.mutation.steps[1].query).toContain('auth_user_id = :new_user_id');
    expect(create.permission).toBe('auth.users.manage');
    expect(yaml('permissions.yaml').permissions).toContain('auth.users.manage');
  });

  test('creates a durable invited user from employee defaults and links it atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_create_user');
    const api = yaml('api/employee-detail.yaml');
    const wizard = api.datasources.find((source: any) => source.id === 'employee_user_wizard');
    const create = action(api, 'create_employee_user');

    const prefill = await repository.querySource(wizard, { id: 'employee-demo-002', current_company_name: 'Core3 Vietnam' }, 0, 1);
    expect(prefill.data).toMatchObject({
      id: 'employee-demo-002', row_version: 1, name: 'Nguyen Minh Anh',
      login: 'anh.nguyen@core3.local', phone: '+84 901 000 002', auth_user_id: null,
    });
    const linked = await repository.executeMutation(create.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', login: 'anh.nguyen@core3.local', phone: '+84 901 000 002' },
    });
    expect(linked).toMatchObject({
      id: 'employee-demo-002', row_version: 2, auth_user_id: 'employee-user-employee-demo-002',
      user_name: 'Nguyen Minh Anh', work_email: 'anh.nguyen@core3.local', work_phone: '+84 901 000 002',
    });
    expect(await repository.query("SELECT id, email, name, password_hash, enabled FROM users WHERE id = 'employee-user-employee-demo-002'"))
      .toEqual([{ id: 'employee-user-employee-demo-002', email: 'anh.nguyen@core3.local', name: 'Nguyen Minh Anh', password_hash: 'invite-pending', enabled: false }]);
    await expect(repository.executeMutation(create.mutation, {
      id: 'employee-demo-002', expected_row_version: 2, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', login: 'anh.nguyen@core3.local', phone: '+84 901 000 002' },
    })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_USER_ALREADY_LINKED' });
    await database.close();
  });

  test('enforces permission, login, company, missing, and stale boundaries without partial users', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_create_user_guards');
    const api = yaml('api/employee-detail.yaml');
    const create = action(api, 'create_employee_user');
    const base = { id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', values: { name: 'Nguyen Minh Anh', login: 'new.anh@core3.local', phone: '+84 901 000 002' } };

    await expect(repository.executeMutation(create.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_USER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { ...base, id: 'missing-employee' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_USER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(create.mutation, { ...base, values: { ...base.values, login: 'not-an-email' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_USER_VALUES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { ...base, values: { ...base.values, login: 'admin@tms.local' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_USER_LOGIN_EXISTS' });
    expect(await repository.query("SELECT id FROM users WHERE id = 'employee-user-employee-demo-002'"))
      .toEqual([]);
    expect((await repository.query("SELECT auth_user_id, row_version FROM employees WHERE id = 'employee-demo-002'"))[0] ?? {})
      .toEqual({ auth_user_id: null, row_version: 1 });
    await database.close();
  });

  test('survives migration replay and a file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-create-user-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_create_user_restart');
    const create = action(yaml('api/employee-detail.yaml'), 'create_employee_user');
    await firstRepository.executeMutation(create.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', login: 'restart.anh@core3.local', phone: '+84 901 000 002' },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_create_user_restart');
    expect(await secondRepository.query("SELECT id, email, enabled FROM users WHERE id = 'employee-user-employee-demo-002'"))
      .toEqual([{ id: 'employee-user-employee-demo-002', email: 'restart.anh@core3.local', enabled: false }]);
    expect(await secondRepository.query("SELECT auth_user_id, work_email, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: 'employee-user-employee-demo-002', work_email: 'restart.anh@core3.local', row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
