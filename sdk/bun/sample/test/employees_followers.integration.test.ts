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

describe('Employees followers parity', () => {
  test('maps Odoo employee follower fields to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];

    expect(sourceModel).toContain('message_follower_ids = fields.One2many');
    expect(sourceModel).toContain('message_partner_ids = fields.Many2many');
    expect(sourceView).toContain('<chatter reload_on_follower="True"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ follower_source: 'employee_followers', follower_candidates_source: 'employee_follower_candidates', follower_add_action: 'add_employee_follower', follower_remove_action: 'remove_employee_follower' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_followers')?.query).toContain('FROM employee_followers');
    expect(action(api, 'add_employee_follower')).toMatchObject({ type: 'server', permission: 'employees.write', handler: 'order_chatter', operation: 'follower_add' });
    expect(action(api, 'remove_employee_follower')).toMatchObject({ type: 'server', permission: 'employees.write', handler: 'order_chatter', operation: 'follower_remove' });
  });

  test('adds and removes company-scoped followers with chatter audit events', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_followers_crud');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_follower');
    const remove = action(api, 'remove_employee_follower');
    const followers = api.datasources.find((entry: any) => entry.id === 'employee_followers');
    const candidates = api.datasources.find((entry: any) => entry.id === 'employee_follower_candidates');

    expect((await repository.querySource(followers, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual([expect.objectContaining({ user_id: 'user-disp', name: 'Dispatcher User' })]);
    expect((await repository.querySource(candidates, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual([expect.objectContaining({ value: 'user-admin', label: 'Admin User · admin@tms.local' })]);
    const added = await repository.executeMutation(add.mutation, {
      id: 'employee-demo-001', user_id: 'user-admin', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-qa', current_user_name: 'QA User',
    }) as any;
    expect(added).toMatchObject({ user_id: 'user-admin', name: 'Admin User', email: 'admin@tms.local', removed: false });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    const removed = await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', user_id: 'user-admin', expected_row_version: 2,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-qa', current_user_name: 'QA User',
    }) as any;
    expect(removed).toMatchObject({ user_id: 'user-admin', name: 'Admin User', removed: true });
    expect((await repository.querySource(followers, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual([expect.objectContaining({ user_id: 'user-disp' })]);
    expect(await repository.query("SELECT action, detail FROM employee_messages WHERE employee_id = 'employee-demo-001' AND action LIKE 'employees.followers.%' ORDER BY created_at, id"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ action: 'employees.followers.add', detail: 'Admin User now follows Admin User' }),
        expect.objectContaining({ action: 'employees.followers.remove', detail: 'Admin User no longer follows Admin User' }),
      ]));
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, duplicate, and missing followers atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_followers_guards');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_follower');
    const remove = action(api, 'remove_employee_follower');
    const base = { id: 'employee-demo-001', user_id: 'user-admin', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User' };

    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_FOLLOWER_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, user_id: 'missing-user' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_FOLLOWER_USER_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, user_id: 'user-disp' })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_FOLLOWER_EXISTS' });
    await expect(repository.executeMutation(remove.mutation, { ...base })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_FOLLOWER_NOT_FOUND' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_followers WHERE employee_id = 'employee-demo-001'"))
      .toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves follower relations and audit events through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-followers-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_followers_restart');
    const add = action(yaml('api/employee-detail.yaml'), 'add_employee_follower');
    await firstRepository.executeMutation(add.mutation, {
      id: 'employee-demo-002', user_id: 'user-admin', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', current_user_name: 'HR Manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_followers_restart');
    expect(await secondRepository.query("SELECT employee_id, user_id, added_by FROM employee_followers WHERE employee_id = 'employee-demo-002' AND user_id = 'user-admin'"))
      .toEqual([{ employee_id: 'employee-demo-002', user_id: 'user-admin', added_by: 'user-hr-manager' }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE employee_id = 'employee-demo-002' AND action = 'employees.followers.add'"))
      .toEqual([{ count: 1 }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
