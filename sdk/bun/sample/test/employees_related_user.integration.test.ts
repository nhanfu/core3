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

describe('Employees related user parity', () => {
  test('maps Odoo User relationship to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const edit = action(api, 'edit_employee_related_user');
    const options = api.datasources.find((entry: any) => entry.id === 'employee_related_user_options');

    expect(model).toContain("user_id = fields.Many2one(");
    expect(model).toContain("related='resource_id.user_id'");
    expect(views).toContain('<field name="user_id" string="User"');
    expect(views).toContain('<field name="user_id" string="Related User"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('auth_user_id');
    expect(settings.groups[0].fields).toContainEqual({ field: 'user_name', label: 'Related User' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_related_user', permission: 'auth.users.manage' }));
    expect(options.permission).toBe('auth.users.manage');
    expect(edit.permission).toBe('auth.users.manage');
    expect(edit.mutation.fields).toEqual(['auth_user_id']);
    expect(edit.fields[0]).toMatchObject({ field: 'auth_user_id', label: 'Related User', type: 'select', options_source: 'employee_related_user_options' });
  });

  test('assigns and clears an enabled user with durable company-scoped persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_user_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_related_user');
    const options = api.datasources.find((entry: any) => entry.id === 'employee_related_user_options');

    expect((await repository.querySource(options, { id: 'employee-demo-002', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toContainEqual({ value: 'user-disp', label: 'Dispatcher User · dispatcher@tms.local' });
    const assigned = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { auth_user_id: 'user-disp' },
    }) as any;
    expect(assigned).toMatchObject({ id: 'employee-demo-002', auth_user_id: 'user-disp', user_name: 'Dispatcher User', row_version: 2 });
    expect(await repository.query("SELECT auth_user_id, user_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: 'user-disp', user_name: 'Dispatcher User', row_version: 2 }]);

    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', expected_row_version: 2, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { auth_user_id: null },
    }) as any;
    expect(cleared).toMatchObject({ id: 'employee-demo-002', auth_user_id: null, user_name: null, row_version: 3 });
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, invalid, and duplicate-user changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_user_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_related_user');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { auth_user_id: 'user-disp' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RELATED_USER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { auth_user_id: 'missing-user' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_RELATED_USER_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { auth_user_id: 'user-admin' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_RELATED_USER_ALREADY_LINKED' });
    expect(await repository.query("SELECT auth_user_id, user_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: null, user_name: null, row_version: 1 }]);
    await database.close();
  });

  test('preserves the related-user relationship through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-related-user-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_related_user_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_related_user');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { auth_user_id: 'user-disp' },
    });
    expect(await firstRepository.query("SELECT auth_user_id, user_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: 'user-disp', user_name: 'Dispatcher User', row_version: 2 }]);
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_related_user_restart');
    expect(await secondRepository.query("SELECT auth_user_id, user_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: 'user-disp', user_name: 'Dispatcher User', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
