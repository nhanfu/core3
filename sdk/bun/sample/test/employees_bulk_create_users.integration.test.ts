import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const employeesRoot = join(import.meta.dir, '../services/employees');
const authRoot = join(import.meta.dir, '../services/auth');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(authRoot, 'migrations'), undefined, `${name}_auth`, ['schema', 'data']);
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, `${name}_employees`, ['schema', 'data']);
}

async function openRepository(name: string, databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const result = new YamlRepository(database);
  await migrate(result, name);
  return { database, repository: result };
}

describe('Employees bulk Create Users parity', () => {
  test('maps Odoo action_create_users to a permissioned selectable Employees list action', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const create = action(api, 'create_employee_users_bulk');

    expect(sourceModel).toContain('def action_create_users(self):');
    expect(sourceModel).toContain('if employee.user_id:');
    expect(sourceViews).toContain('id="action_hr_employee_create_users"');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ selectable: true });
    expect(list.bulk_actions).toEqual([
      { id: 'create_employee_users_bulk', label: 'Create Users', permission: 'auth.users.manage' },
    ]);
    expect(create).toMatchObject({
      type: 'server', permission: 'auth.users.manage', operation: 'bulk_create',
      action: 'employees.records.create_users',
    });
    expect(create.mutation.steps[1].for_each.input).toBe('selectedIds');
    expect(create.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'EMPLOYEES_BULK_USER_SELECTION_REQUIRED',
      'EMPLOYEES_BULK_USER_ACTOR_REQUIRED',
      'EMPLOYEES_BULK_USER_COMPANY_REQUIRED',
      'EMPLOYEES_BULK_USER_COMPANY_FORBIDDEN',
      'EMPLOYEES_BULK_USER_EMPLOYEE_NOT_FOUND',
      'STALE_RECORD',
    ]);
  });

  test('creates and links selected users atomically while recording durable outcomes', async () => {
    const { database, repository } = await openRepository('employees_bulk_create_users');
    const create = action(yaml('api/employees.yaml'), 'create_employee_users_bulk');
    const params = {
      selectedIds: ['employee-demo-001', 'employee-demo-002'],
      current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Vietnam',
    };

    const result = await repository.executeMutation(create.mutation, params) as any;
    expect(result).toMatchObject({
      id: 'employee-bulk-user-0001', company_name: 'Core3 Vietnam', requested_by: 'Admin User',
      selected_count: 2, created_count: 1, skipped_count: 1,
    });
    expect(await repository.query("SELECT id, email, enabled FROM users WHERE id = 'employee-user-employee-demo-002'"))
      .toEqual([{ id: 'employee-user-employee-demo-002', email: 'anh.nguyen@core3.local', enabled: false }]);
    expect(await repository.query("SELECT auth_user_id, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ auth_user_id: 'employee-user-employee-demo-002', row_version: 2 }]);
    expect(await repository.query("SELECT employee_id, outcome, user_id FROM employee_bulk_user_creation_lines WHERE run_id = 'employee-bulk-user-0001' ORDER BY employee_id"))
      .toEqual([
        { employee_id: 'employee-demo-001', outcome: 'already_linked', user_id: 'user-admin' },
        { employee_id: 'employee-demo-002', outcome: 'created', user_id: 'employee-user-employee-demo-002' },
      ]);
    const runs = yaml('api/employees.yaml').datasources.find((source: any) => source.id === 'employee_bulk_user_creation_runs');
    expect((await repository.querySource(runs, { current_company_name: 'Core3 Vietnam' }, 0, 10)).data[0]).toMatchObject({
      id: 'employee-bulk-user-0001', created_count: 1, skipped_count: 1,
    });
    await database.close();
  });

  test('enforces actor, company, missing, stale, and login conflict boundaries without partial writes', async () => {
    const { database, repository } = await openRepository('employees_bulk_create_users_guards');
    const create = action(yaml('api/employees.yaml'), 'create_employee_users_bulk');
    const base = {
      selectedIds: ['employee-demo-002'], current_user_id: 'user-admin', current_user_name: 'Admin User',
      current_company_name: 'Core3 Vietnam', expected_row_version: 1,
    };

    await expect(repository.executeMutation(create.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_BULK_USER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { ...base, current_company_name: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_BULK_USER_COMPANY_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { ...base, selectedIds: ['missing-employee'] }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_BULK_USER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.run("UPDATE employees SET row_version = 2 WHERE id = 'employee-demo-003'");
    await expect(repository.executeMutation(create.mutation, { ...base, selectedIds: ['employee-demo-003'], expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.run("UPDATE employees SET row_version = 1 WHERE id = 'employee-demo-003'");
    await repository.run("UPDATE employees SET work_email = 'admin@tms.local' WHERE id = 'employee-demo-003'");
    const conflict = await repository.executeMutation(create.mutation, { ...base, selectedIds: ['employee-demo-003'] }) as any;
    expect(conflict).toMatchObject({ created_count: 0, skipped_count: 1 });
    expect(await repository.query("SELECT auth_user_id FROM employees WHERE id = 'employee-demo-003'"))
      .toEqual([{ auth_user_id: null }]);
    expect(await repository.query("SELECT outcome FROM employee_bulk_user_creation_lines WHERE employee_id = 'employee-demo-003' ORDER BY created_at DESC LIMIT 1"))
      .toEqual([{ outcome: 'login_exists' }]);
    await database.close();
  });

  test('persists the run across restart and keeps retries idempotent', async () => {
    const databasePath = `/tmp/core3-employees-bulk-users-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository('employees_bulk_create_users_restart', databasePath);
    const create = action(yaml('api/employees.yaml'), 'create_employee_users_bulk');
    const params = {
      selectedIds: ['employee-demo-003'], current_user_id: 'user-admin', current_user_name: 'Admin User',
      current_company_name: 'Core3 Vietnam', expected_row_version: 1,
    };
    await first.repository.executeMutation(create.mutation, params);
    await first.database.close();

    const second = await openRepository('employees_bulk_create_users_restart', databasePath);
    expect(await second.repository.query("SELECT created_count, skipped_count FROM employee_bulk_user_creation_runs WHERE id = 'employee-bulk-user-0001'"))
      .toEqual([{ created_count: 1, skipped_count: 0 }]);
    const retry = await second.repository.executeMutation(create.mutation, { ...params, expected_row_version: undefined }) as any;
    expect(retry).toMatchObject({ created_count: 0, skipped_count: 1 });
    expect(await second.repository.query("SELECT COUNT(*) AS count FROM users WHERE id = 'employee-user-employee-demo-003'"))
      .toEqual([{ count: 1 }]);
    await second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces the auth.users.manage boundary at the action route', async () => {
    const { database, repository } = await openRepository('employees_bulk_create_users_permission');
    const api = yaml('api/employees.yaml');
    const page = yaml('pages/employees.yaml');
    const user = { sub: 'employee-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['employees.read'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([['employees', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['employees', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['employees.read', 'employees.write', 'employees.manage', 'employees.settings', 'auth.users.manage'], tables: {}, endpoints: {} },
      uploadRoot: '/tmp/core3-employees-bulk-users-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://employees.test/api/actions/employees.records.create_users', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selectedIds: ['employee-demo-002'] }),
    }), new URL('http://employees.test/api/actions/employees.records.create_users'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: auth.users.manage' });
    await database.close();
  });
});
