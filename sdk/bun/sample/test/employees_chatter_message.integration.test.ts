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

describe('Employees chatter message parity', () => {
  test('maps Odoo mail.thread chatter messaging to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const send = action(api, 'send_employee_message');

    expect(sourceModel).toContain("'mail.thread.main.attachment'");
    expect(sourceView).toContain('<chatter reload_on_follower="True"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ message_source: 'employee_messages', message_action: 'send_employee_message', message_label: 'Send message' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_messages')?.query).toContain('FROM employee_messages');
    expect(send).toMatchObject({ type: 'server_form', permission: 'employees.write', handler: 'order_chatter', operation: 'message' });
    expect(send.mutation.concurrency).toEqual({ required: true });
    expect(send.fields).toEqual([expect.objectContaining({ field: 'content', type: 'textarea', required: true })]);
  });

  test('sends a company-scoped message, increments the employee, and stores the audit event', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_chatter_message_crud');
    const api = yaml('api/employee-detail.yaml');
    const send = action(api, 'send_employee_message');
    const messages = api.datasources.find((entry: any) => entry.id === 'employee_messages');

    expect((await repository.querySource(messages, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'employees.message', detail: 'Welcome to the Operations team.' })]));
    const created = await repository.executeMutation(send.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, content: 'Please review the updated team handbook.',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-qa', current_user_name: 'QA User',
    }) as any;

    expect(created).toMatchObject({
      id: 'employee-message-employee-demo-001-1', employee_id: 'employee-demo-001', actor_name: 'QA User',
      action: 'employees.message', action_label: 'Message', detail: 'Please review the updated team handbook.',
    });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 2 }]);
    expect(await database.close()).toBeUndefined();
  });

  test('rejects actor, stale, cross-company, and blank messages atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_chatter_message_guards');
    const send = action(yaml('api/employee-detail.yaml'), 'send_employee_message');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, content: 'A valid employee message',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User',
    };

    await expect(repository.executeMutation(send.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(send.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_MESSAGE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, { ...base, content: '   ' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_MESSAGE_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE employee_id = 'employee-demo-001' AND action = 'employees.message'"))
      .toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves the deterministic and newly-sent messages through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-chatter-message-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_chatter_message_restart');
    const send = action(yaml('api/employee-detail.yaml'), 'send_employee_message');
    await firstRepository.executeMutation(send.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, content: 'Restart-safe employee message',
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', current_user_name: 'HR Manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_chatter_message_restart');
    expect(await secondRepository.query("SELECT id, actor_name, action, detail FROM employee_messages WHERE id = 'employee-message-employee-demo-002-1'"))
      .toEqual([{ id: 'employee-message-employee-demo-002-1', actor_name: 'HR Manager', action: 'employees.message', detail: 'Restart-safe employee message' }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE id = 'employee-message-public-001'"))
      .toEqual([{ count: 1 }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-002'")).toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
