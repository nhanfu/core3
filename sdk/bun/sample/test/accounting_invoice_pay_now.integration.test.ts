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

describe('Accounting invoice Pay Now parity', () => {
  test('maps Odoo payment_pay to a page/API-bound invoice payment form', () => {
    const previewPage = yaml('pages/invoice-preview.yaml');
    const previewApi = yaml('api/invoice-preview.yaml');
    const paymentPage = yaml('pages/invoice-payment.yaml');
    const paymentApi = yaml('api/invoice-payment.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/payment/controllers/portal.py', 'utf8');

    expect(previewApi.page.id).toBe(previewPage.page.id);
    expect(paymentApi.page.id).toBe(paymentPage.page.id);
    expect(previewPage.components[1].header_actions).toContainEqual(expect.objectContaining({ id: 'pay_now_accounting_invoice', label: 'Pay Now' }));
    expect(action(previewApi, 'pay_now_accounting_invoice')).toMatchObject({ type: 'navigate', navigate_to: '/accounting/invoice-payment', permission: 'accounting.read' });
    expect(() => validatePageDefinition(paymentApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...paymentPage, actions: paymentApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(action(paymentApi, 'submit_accounting_invoice_payment')).toMatchObject({ type: 'server_form', permission: 'accounting.write', action: 'accounting.invoices.pay_online', operation: 'create_payment_transaction' });
    expect(action(paymentApi, 'submit_accounting_invoice_payment').mutation.concurrency).toEqual({ required: true });
    expect(source).toContain("@http.route(");
    expect(source).toContain("'/payment/pay'");
    expect(source).toContain("transaction_route': '/payment/transaction'");
  });

  test('creates one durable pending payment transaction and rejects stale or duplicate requests', async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-pay-now-')), 'accounting.duckdb');
    const migrationName = `accounting_invoice_pay_now_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/invoice-payment.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'accounting_invoice_payment');
    const pay = action(api, 'submit_accounting_invoice_payment');

    try {
      expect(await repository.querySource(source, { id: 'accounting-invoice-demo-001' }, 0, 1)).toMatchObject({
        data: expect.objectContaining({ name: 'INV/2026/0001', amount: 1650, transaction_state: '', payment_status: 'Ready to pay' }),
      });

      const created = await repository.executeMutation(pay.mutation, {
        id: 'accounting-invoice-demo-001',
        expected_row_version: 1,
        current_user_name: 'Accounting QA',
        values: { provider: 'Demo', payment_method: 'Card' },
      }) as any;
      expect(created).toMatchObject({
        invoice_id: 'accounting-invoice-demo-001',
        amount: 1650,
        provider: 'Demo',
        payment_method: 'Card',
        state: 'pending',
        state_label: 'Pending',
        payment_state: 'pending',
        payment_state_label: 'Pending',
      });
      expect((await repository.querySource(source, { id: 'accounting-invoice-demo-001' }, 0, 1)).data).toMatchObject({
        payment_transaction_id: created.id,
        transaction_state: 'pending',
        payment_reference: 'PAY-INV-2026-0001-1',
      });
      await expect(repository.executeMutation(pay.mutation, {
        id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA', values: { provider: 'Demo', payment_method: 'Card' },
      })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PAYMENT_PENDING' });
      await expect(repository.executeMutation(pay.mutation, {
        id: 'accounting-invoice-demo-001', expected_row_version: 99, current_user_name: 'Accounting QA', values: { provider: 'Demo', payment_method: 'Card' },
      })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_PAYMENT_UNAVAILABLE' });
      await expect(repository.executeMutation(pay.mutation, {
        id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA', values: { provider: 'Invalid', payment_method: 'Card' },
      })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_INVOICE_PAYMENT_METHOD_INVALID' });
    } finally {
      await database.close();
      rmSync(join(databasePath, '..'), { recursive: true, force: true });
    }
  });

  test('keeps the payment relation across a DuckDB restart and protects the read boundary', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-invoice-pay-now-restart-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_invoice_pay_now_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const pay = action(yaml('api/invoice-payment.yaml'), 'submit_accounting_invoice_payment');
      await firstRepository.executeMutation(pay.mutation, {
        id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Restart Operator', values: { provider: 'Wire Transfer', payment_method: 'Bank Transfer' },
      });
      await firstDatabase.close();

      const restartedDatabase = await DuckDbDatabase.open(databasePath);
      const restartedRepository = new YamlRepository(restartedDatabase);
      await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await restartedRepository.query('SELECT invoice_id, provider, payment_method, state FROM accounting_payment_transactions WHERE invoice_id = ?', ['accounting-invoice-demo-001'])).toEqual([
        { invoice_id: 'accounting-invoice-demo-001', provider: 'Wire Transfer', payment_method: 'Bank Transfer', state: 'pending' },
      ]);
      await restartedDatabase.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
