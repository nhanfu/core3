import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const migrated = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};
const values = (overrides: Record<string, unknown> = {}) => ({
  message_id: '<mail-001@example.com>', sender_email: 'admin@core3.local', sender_name: 'Admin User',
  recipient: 'expenses@core3.local', subject: 'MEAL $42.50 Team lunch', body: 'Lunch with the project team',
  expense_date: '2026-09-21', attachment_file_name: 'team-lunch.pdf', attachment_mime_type: 'application/pdf',
  attachment_size_bytes: 2048, company_name: 'Core3 Demo Company', ...overrides,
});

describe('Expenses incoming email gateway parity slice', () => {
  test('keeps settings presentation-only and joins the alias contract by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('expenses-settings');
    expect(api.datasources.find((source: any) => source.id === 'expenses_settings')).toBeDefined();
    expect(api.datasources[0].query).toContain('incoming_email_alias');
    expect(api.actions.find((candidate: any) => candidate.id === 'save_expenses_settings').mutation.fields)
      .toEqual(expect.arrayContaining(['incoming_email_alias', 'incoming_email_domain']));
    expect(api.actions.find((candidate: any) => candidate.id === 'receive_expense_email'))
      .toMatchObject({ type: 'server_form', permission: 'expenses.write', handler: 'yaml_mutation' });
  });

  test('persists alias settings and creates an idempotent draft expense with receipt/activity', async () => {
    const { database, repository } = await migrated('expenses_email_gateway_success');
    const api = yaml('api/settings.yaml');
    const save = api.actions.find((candidate: any) => candidate.id === 'save_expenses_settings');
    await repository.executeMutation(save.mutation, { values: { id: 'expenses-settings', incoming_email: true, incoming_email_alias: 'receipts', incoming_email_domain: 'core3.local' } });
    expect(await repository.query("SELECT incoming_email, incoming_email_alias, incoming_email_domain FROM expense_settings WHERE id = 'expenses-settings'"))
      .toEqual([{ incoming_email: true, incoming_email_alias: 'receipts', incoming_email_domain: 'core3.local' }]);

    const receive = api.actions.find((candidate: any) => candidate.id === 'receive_expense_email');
    const first = await repository.executeMutation(receive.mutation, { values: values({ recipient: 'receipts@core3.local' }), current_company_name: 'Core3 Demo Company' });
    expect(first).toMatchObject({ id: 'expense-email-mail-001-example-com', employee_name: 'Admin User', category: 'Meals', amount: 42.5, state: 'Draft', receipt_reference: 'team-lunch.pdf' });
    expect(await repository.query("SELECT message_id, expense_id, state FROM expense_inbound_messages WHERE message_id = '<mail-001@example.com>'"))
      .toEqual([{ message_id: '<mail-001@example.com>', expense_id: 'expense-email-mail-001-example-com', state: 'received' }]);
    expect(await repository.query("SELECT file_name, mime_type, size_bytes FROM expense_attachments WHERE expense_id = 'expense-email-mail-001-example-com'"))
      .toEqual([{ file_name: 'team-lunch.pdf', mime_type: 'application/pdf', size_bytes: 2048 }]);
    expect(await repository.query("SELECT action, action_label FROM expense_activity WHERE expense_id = 'expense-email-mail-001-example-com'"))
      .toEqual([{ action: 'expenses.email_received', action_label: 'Received by email' }]);
    expect(await repository.query("SELECT amount_total FROM expense_sheets WHERE id = 'expense-sheet-email-admin-user'"))
      .toEqual([{ amount_total: 42.5 }]);

    const replay = await repository.executeMutation(receive.mutation, { values: values({ recipient: 'receipts@core3.local' }), current_company_name: 'Core3 Demo Company' });
    expect(replay).toMatchObject({ id: 'expense-email-mail-001-example-com', amount: 42.5 });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expenses WHERE id = 'expense-email-mail-001-example-com'"))
      .toEqual([{ count: 1 }]);
    database.close();
  });

  test('guards disabled gateway, alias/company boundaries, invalid settings, and conflicting replay', async () => {
    const { database, repository } = await migrated('expenses_email_gateway_guards');
    const api = yaml('api/settings.yaml');
    const save = api.actions.find((candidate: any) => candidate.id === 'save_expenses_settings');
    const receive = api.actions.find((candidate: any) => candidate.id === 'receive_expense_email');
    await expect(repository.executeMutation(save.mutation, { values: { id: 'expenses-settings', incoming_email: true, incoming_email_alias: 'bad alias', incoming_email_domain: 'core3.local' } }))
      .rejects.toMatchObject({ status: 422, code: 'EXPENSE_EMAIL_ALIAS_INVALID' });
    await expect(repository.executeMutation(receive.mutation, { values: values({ recipient: 'other@core3.local' }), current_company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 422, code: 'EXPENSE_EMAIL_ALIAS_MISMATCH' });
    await expect(repository.executeMutation(receive.mutation, { values: values({ recipient: 'expenses@core3.local', company_name: 'Other Company' }), current_company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 403, code: 'EXPENSE_EMAIL_COMPANY_FORBIDDEN' });
    await repository.executeMutation(receive.mutation, { values: values(), current_company_name: 'Core3 Demo Company' });
    await expect(repository.executeMutation(receive.mutation, { values: values({ subject: 'MEAL $99.00 Changed subject' }), current_company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_EMAIL_IDEMPOTENCY_CONFLICT' });
    await repository.executeMutation(save.mutation, { values: { id: 'expenses-settings', incoming_email: false, incoming_email_alias: 'expenses', incoming_email_domain: 'core3.local' } });
    await expect(repository.executeMutation(receive.mutation, { values: values({ message_id: '<mail-002@example.com>' }), current_company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_EMAIL_GATEWAY_DISABLED' });
    database.close();
  });
});
