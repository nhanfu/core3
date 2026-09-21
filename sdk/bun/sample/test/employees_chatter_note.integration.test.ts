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

describe('Employees chatter internal note parity', () => {
  test('maps the Odoo employee chatter to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const note = action(api, 'log_employee_note');

    expect(sourceModel).toContain("_inherit = ['mail.thread.main.attachment'");
    expect(sourceView).toContain('<chatter reload_on_follower="True"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ message_source: 'employee_messages', note_action: 'log_employee_note', note_label: 'Log note' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_messages')?.query).toContain('FROM employee_messages');
    expect(note).toMatchObject({ type: 'server_form', permission: 'employees.write', handler: 'order_chatter', operation: 'note' });
  });

  test('logs a company-scoped internal note and persists the employee row version', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_chatter_note_crud');
    const api = yaml('api/employee-detail.yaml');
    const note = action(api, 'log_employee_note');
    const messages = api.datasources.find((entry: any) => entry.id === 'employee_messages');

    expect((await repository.querySource(messages, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'employee-message-note-001', action: 'employees.note', action_label: 'Internal note' })]));
    const created = await repository.executeMutation(note.mutation, {
      note_id: 'employee-message-crud-001', id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-qa', current_user_name: 'QA User',
      content: 'Review the employee record before the next payroll run.',
    }) as any;
    expect(created).toMatchObject({ id: 'employee-message-crud-001', employee_id: 'employee-demo-001', actor_name: 'QA User', action: 'employees.note', detail: 'Review the employee record before the next payroll run.' });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    expect((await repository.querySource(messages, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'employee-message-crud-001', detail: 'Review the employee record before the next payroll run.' })]));
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, and missing employee notes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_chatter_note_guards');
    const note = action(yaml('api/employee-detail.yaml'), 'log_employee_note');
    const base = {
      note_id: 'employee-message-guard-001', id: 'employee-demo-001', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User', content: 'Guarded note',
    };

    await expect(repository.executeMutation(note.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(note.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(note.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_NOTE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(note.mutation, { ...base, content: '   ' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_NOTE_INVALID' });
    await expect(repository.executeMutation(note.mutation, { ...base, id: 'missing-employee' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_NOTE_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE id = 'employee-message-guard-001'"))
      .toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves employee notes through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-chatter-note-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_chatter_note_restart');
    const note = action(yaml('api/employee-detail.yaml'), 'log_employee_note');
    await firstRepository.executeMutation(note.mutation, {
      note_id: 'employee-message-restart-001', id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', current_user_name: 'HR Manager', content: 'Restart-proof employee note.',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_chatter_note_restart');
    expect(await secondRepository.query("SELECT employee_id, actor_name, action, detail FROM employee_messages WHERE id = 'employee-message-restart-001'"))
      .toEqual([{ employee_id: 'employee-demo-002', actor_name: 'HR Manager', action: 'employees.note', detail: 'Restart-proof employee note.' }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
