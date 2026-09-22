import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `accounting_payment_receipt_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting payment receipt email action parity', () => {
  test('maps the Odoo form-bound receipt composer to a page/API action', () => {
    const page = yaml('pages/payment-detail.yaml');
    const api = yaml('api/payment-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_payment_view.xml', 'utf8');
    const sourceTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/account/data/mail_template_data.xml', 'utf8');
    const sourceComposer = readFileSync('/home/nhanjs/projects/odoo/addons/mail/wizard/mail_compose_message_views.xml', 'utf8');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const receipt = action(api, 'send_accounting_payment_receipt');

    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('payment-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'send_accounting_payment_receipt', label: 'Send receipt by email', permission: 'accounting.write' }));
    expect(receipt).toMatchObject({ type: 'server_form', permission: 'accounting.write', operation: 'send_receipt', action: 'accounting.payments.send_receipt', handler: 'yaml_mutation' });
    expect(receipt.mutation.concurrency).toEqual({ required: true });
    expect(receipt.mutation.steps[0].query).toContain('accounting_payment_receipts');
    expect(sourceView).toContain('id="account_send_payment_receipt_by_email_action"');
    expect(sourceView).toContain('<field name="name">Send receipt by email</field>');
    expect(sourceView).toContain('<field name="res_model">mail.compose.message</field>');
    expect(sourceTemplate).toContain('mail_template_data_payment_receipt');
    expect(sourceTemplate).toContain('account.action_report_payment_receipt');
    expect(sourceComposer).toContain('string="Send" name="action_send_mail"');
    expect(sourceComposer).toContain('string="Discard"');
  });

  test('queues one receipt, persists its history, and rejects invalid or stale sends atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const api = yaml('api/payment-detail.yaml');
      const detail = api.datasources.find((source: any) => source.id === 'accounting_payment_detail');
      const receipts = api.datasources.find((source: any) => source.id === 'accounting_payment_receipts');
      const send = action(api, 'send_accounting_payment_receipt');
      expect((await repository.querySource(detail, { id: 'accounting-payment-demo-001' }, 0, 1)).data).toMatchObject({ state: 'Paid', receipt_count: 0, row_version: 1 });

      const result = await repository.executeMutation(send.mutation, {
        id: 'accounting-payment-demo-001',
        expected_row_version: 1,
        recipient_email: 'billing@example.com',
        subject: 'Payment Receipt PAY/2026/0001',
        body: 'Thank you for your payment.',
        current_user_name: 'Administrator',
      });
      expect(result).toMatchObject({ id: 'accounting-payment-demo-001', receipt_count: 1, row_version: 2 });
      expect(await repository.querySource(receipts, { id: 'accounting-payment-demo-001' }, 0, 10)).toMatchObject({ data: [{ action_label: 'Send receipt by email', detail: 'Queued to billing@example.com: Payment Receipt PAY/2026/0001' }] });
      expect(await repository.query('SELECT recipient, status, attachment_name FROM accounting_payment_receipts WHERE payment_id = ?', ['accounting-payment-demo-001'])).toEqual([{ recipient: 'billing@example.com', status: 'Queued', attachment_name: 'PAY_2026_0001.pdf' }]);

      await expect(repository.executeMutation(send.mutation, {
        id: 'accounting-payment-demo-001', expected_row_version: 2, recipient_email: 'bad-address', subject: 'Receipt', body: 'Body', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PAYMENT_RECEIPT_RECIPIENT_INVALID' });
      await expect(repository.executeMutation(send.mutation, {
        id: 'accounting-payment-demo-001', expected_row_version: 1, recipient_email: 'billing@example.com', subject: 'Receipt', body: 'Body', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_RECEIPT_UNAVAILABLE' });
      await expect(repository.executeMutation(send.mutation, {
        id: 'accounting-customer-payment-003', expected_row_version: 1, recipient_email: 'billing@example.com', subject: 'Receipt', body: 'Body', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_RECEIPT_UNAVAILABLE' });
      await expect(repository.executeMutation(send.mutation, {
        id: 'accounting-payment-demo-001', expected_row_version: 2, recipient_email: 'billing@example.com', subject: 'Receipt', body: 'Body', current_user_name: '',
      })).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_PAYMENT_RECEIPT_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(send.mutation, {
        id: 'missing-payment', expected_row_version: 1, recipient_email: 'billing@example.com', subject: 'Receipt', body: 'Body', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_PAYMENT_RECEIPT_NOT_FOUND' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM accounting_payment_receipts WHERE payment_id = ?', ['accounting-payment-demo-001'])).toEqual([{ count: 1 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves the queued receipt and counters through restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-payment-receipt-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_payment_receipt_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      const send = action(yaml('api/payment-detail.yaml'), 'send_accounting_payment_receipt');
      await first.repository.executeMutation(send.mutation, { id: 'accounting-payment-demo-001', expected_row_version: 1, recipient_email: 'billing@example.com', subject: 'Receipt', body: 'Body', current_user_name: 'Administrator' });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT receipt_count, row_version FROM accounting_payments WHERE id = ?', ['accounting-payment-demo-001'])).toEqual([{ receipt_count: 1, row_version: 2 }]);
      expect(await second.repository.query('SELECT status, recipient FROM accounting_payment_receipts WHERE payment_id = ?', ['accounting-payment-demo-001'])).toEqual([{ status: 'Queued', recipient: 'billing@example.com' }]);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM accounting_payment_receipts WHERE payment_id = ?', ['accounting-payment-demo-001'])).toEqual([{ count: 1 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
