import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting invoice send workflow parity', () => {
  test('keeps the source-backed Send composer in the page/API boundary', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const action = api.actions.find((candidate: any) => candidate.id === 'send_accounting_invoice');

    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'invoice-detail' });
    expect(form.header_actions.map((candidate: any) => candidate.id)).toContain('send_accounting_invoice');
    expect(form.message_source).toBe('accounting_invoice_messages');
    expect(action).toMatchObject({ type: 'server_form', permission: 'accounting.write', action: 'accounting.invoices.send', operation: 'send' });
    expect(action.mutation.concurrency).toEqual({ required: true });
    expect(action.mutation.steps[0].query).toContain('accounting_invoice_messages');
  });

  test('queues a durable send record, updates the invoice, and enforces workflow guards after restart', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-send-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_send_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const api = yaml('api/invoice-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'accounting_invoice_detail');
    const messages = api.datasources.find((source: any) => source.id === 'accounting_invoice_messages');
    const action = api.actions.find((candidate: any) => candidate.id === 'send_accounting_invoice');
    const before = await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1);
    expect(before.data).toMatchObject({ state: 'Posted', send_count: 0, row_version: 1, recipient_email: 'gemini@example.com' });

    const queued = await repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001',
      expected_row_version: 1,
      current_user_name: 'Accounting QA',
      values: {
        delivery_method: 'Email',
        recipient_email: 'billing@example.com',
        subject: 'Invoice INV/2026/0001',
        body: 'Please find your invoice attached.',
      },
    }) as any;
    expect(queued).toMatchObject({ id: 'accounting-invoice-demo-001', send_count: 1, row_version: 2 });
    expect((await repository.querySource(messages, { id: 'accounting-invoice-demo-001' }, 0, 10)).data[0]).toMatchObject({
      action: 'send', action_label: 'Sent by Email', detail: 'Please find your invoice attached.',
    });

    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001', expected_row_version: 1, current_user_name: 'Accounting QA', values: {
        delivery_method: 'Email', recipient_email: 'billing@example.com', subject: 'Duplicate', body: 'Duplicate',
      },
    })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_SEND_UNAVAILABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-002', expected_row_version: 1, current_user_name: 'Accounting QA', values: {
        delivery_method: 'Email', recipient_email: 'billing@example.com', subject: 'Paid bill', body: 'Paid bill',
      },
    })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_SEND_UNAVAILABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001', expected_row_version: 2, current_user_name: 'Accounting QA', values: {
        delivery_method: 'Email', recipient_email: 'not-an-email', subject: 'Invalid', body: 'Invalid',
      },
    })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_INVOICE_SEND_RECIPIENT_INVALID' });

    database.close();
    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await restartedRepository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ send_count: 1, row_version: 2 });
    expect((await restartedRepository.querySource(messages, { id: 'accounting-invoice-demo-001' }, 0, 10)).data[0]).toMatchObject({ action: 'send', recipient: 'billing@example.com', status: 'Queued' });
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
