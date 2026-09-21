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

describe('Employees activity completion parity', () => {
  test('maps Odoo activity_ids and Mark done to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const complete = action(api, 'complete_employee_activity');

    expect(sourceModel).toContain("'mail.activity.mixin'");
    expect(sourceView).toContain('<field name="activity_ids"');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ activity_action: 'schedule_employee_activity', activity_complete_action: 'complete_employee_activity', activity_complete_label: 'Mark done' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_messages')?.query).toContain('m.activity_id');
    expect(complete).toMatchObject({ type: 'server', permission: 'employees.write', handler: 'yaml_mutation', operation: 'complete_activity' });
    expect(complete.mutation.concurrency).toEqual({ required: true });
  });

  test('marks a planned activity done, updates row versions, and records completion audit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_activity_completion_crud');
    const api = yaml('api/employee-detail.yaml');
    const complete = action(api, 'complete_employee_activity');
    const messages = api.datasources.find((entry: any) => entry.id === 'employee_messages');

    expect((await repository.querySource(messages, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'employee-activity-message-adhoc-001', state: 'planned', activity_id: 'employee-activity-adhoc-001', row_version: 1 })]));
    const completed = await repository.executeMutation(complete.mutation, {
      id: 'employee-activity-message-adhoc-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-qa', current_user_name: 'QA User',
    }) as any;

    expect(completed).toMatchObject({ id: 'employee-activity-adhoc-001', activity_state: 'done', timing: 'Done', row_version: 2 });
    expect(await repository.query("SELECT state, row_version FROM employee_messages WHERE id = 'employee-activity-message-adhoc-001'"))
      .toEqual([{ state: 'done', row_version: 2 }]);
    expect(await repository.query("SELECT action, detail FROM employee_messages WHERE employee_id = 'employee-demo-001' AND action = 'employees.activity.complete'"))
      .toEqual([{ action: 'employees.activity.complete', detail: 'Confirm employee review' }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, missing, and already-completed activity transitions atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_activity_completion_guards');
    const complete = action(yaml('api/employee-detail.yaml'), 'complete_employee_activity');
    const base = {
      id: 'employee-activity-message-adhoc-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User',
    };

    await expect(repository.executeMutation(complete.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(complete.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(complete.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_ACTIVITY_MESSAGE_NOT_FOUND' });
    await expect(repository.executeMutation(complete.mutation, { ...base, id: 'missing-activity-message' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_ACTIVITY_MESSAGE_NOT_FOUND' });
    await repository.executeMutation(complete.mutation, base);
    await expect(repository.executeMutation(complete.mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_ACTIVITY_ALREADY_DONE' });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    await database.close();
  });

  test('preserves completed activity state, audit, and row versions through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-activity-completion-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_activity_completion_restart');
    const complete = action(yaml('api/employee-detail.yaml'), 'complete_employee_activity');
    await firstRepository.executeMutation(complete.mutation, {
      id: 'employee-activity-message-adhoc-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', current_user_name: 'HR Manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_activity_completion_restart');
    expect(await secondRepository.query("SELECT activity_state, timing, row_version FROM employee_activities WHERE id = 'employee-activity-adhoc-001'"))
      .toEqual([{ activity_state: 'done', timing: 'Done', row_version: 2 }]);
    expect(await secondRepository.query("SELECT state, row_version FROM employee_messages WHERE id = 'employee-activity-message-adhoc-001'"))
      .toEqual([{ state: 'done', row_version: 2 }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE id = 'employee-activity-message-adhoc-001'"))
      .toEqual([{ count: 1 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
