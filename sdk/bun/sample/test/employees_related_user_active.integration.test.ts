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
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, `${name}_employees`, ['schema', 'data']);
}

describe('Employees related user active parity', () => {
  test('maps Odoo is_user_active to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const edit = action(api, 'edit_employee_user_active');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');

    expect(model).toContain('is_user_active = fields.Boolean(related=\'user_id.active\', string="User\'s active"');
    expect(views).toContain('<span invisible="not user_id or is_user_active">');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('AS is_user_active');
    expect(settings.groups[0].fields).toContainEqual({ field: 'is_user_active', label: 'User is Active', type: 'checkbox', show_if: '!!state.employee_detail.auth_user_id' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_user_active', permission: 'auth.users.manage' }));
    expect(edit).toMatchObject({ permission: 'auth.users.manage', action: 'employees.records.related_user.active.update', handler: 'yaml_mutation', operation: 'update' });
    expect(edit.mutation.fields).toEqual(['is_user_active']);
    expect(edit.mutation.boolean_fields).toEqual(['is_user_active']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_USER_ACTIVE_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_USER_ACTIVE_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_USER_ACTIVE_USER_NOT_FOUND' }),
    ]));
  });

  test('activates and deactivates the related user with durable guarded persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_user_active_crud');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_user_active');
    const deactivated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { is_user_active: false },
    }) as any;
    expect(deactivated).toMatchObject({ id: 'employee-demo-001', is_user_active: false, row_version: 2 });
    expect(await repository.query("SELECT enabled FROM employee_related_user_catalog WHERE id = 'user-admin'"))
      .toEqual([{ enabled: false }]);
    const reactivated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 2, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { is_user_active: true },
    }) as any;
    expect(reactivated).toMatchObject({ id: 'employee-demo-001', is_user_active: true, row_version: 3 });
    expect(await repository.query("SELECT enabled FROM employee_related_user_catalog WHERE id = 'user-admin'"))
      .toEqual([{ enabled: true }]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and missing-user changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_related_user_active_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_user_active');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { is_user_active: false },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_USER_ACTIVE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_USER_ACTIVE_EMPLOYEE_NOT_FOUND' });
    await repository.query("UPDATE employees SET auth_user_id = 'missing-user' WHERE id = 'employee-demo-001'");
    await expect(repository.executeMutation(edit.mutation, base))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_USER_ACTIVE_USER_NOT_FOUND' });
    expect(await repository.query("SELECT enabled FROM employee_related_user_catalog WHERE id = 'user-admin'"))
      .toEqual([{ enabled: true }]);
    await database.close();
  });

  test('preserves related-user active status through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-related-user-active-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_related_user_active_restart');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_user_active');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { is_user_active: false },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_related_user_active_restart');
    expect(await secondRepository.query("SELECT enabled FROM employee_related_user_catalog WHERE id = 'user-admin'"))
      .toEqual([{ enabled: false }]);
    expect(await secondRepository.query("SELECT CASE WHEN auth_user_id IS NULL THEN NULL ELSE (SELECT enabled FROM employee_related_user_catalog WHERE id = employees.auth_user_id) END AS is_user_active FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ is_user_active: false }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
