import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const processAction = () => yaml('api/expense-detail.yaml').actions.find((candidate: any) => candidate.id === 'process_expense_receipt');

const migrated = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};

const input = (overrides: Record<string, unknown> = {}) => ({
  id: 'expense-demo-draft',
  current_company_name: 'Core3 Demo Company',
  current_user_name: 'Admin User',
  current_user_id: 'user-admin',
  request_key: 'receipt-request-001',
  receipt_reference: 'receipt-ocr.pdf',
  provider_code: 'expense_ocr',
  provider_result: 'success',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  ...overrides,
});

describe('Expenses receipt processing contract', () => {
  test('declares a readable processing status and permissioned process form', () => {
    const api = yaml('api/expense-detail.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'expense_receipt_processing');
    expect(source).toMatchObject({ single: true, permission: 'expenses.read' });
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'EXPENSE_RECEIPT_PROCESSING_UNAVAILABLE' });
    expect(processAction()).toMatchObject({ type: 'server_form', permission: 'expenses.write', handler: 'yaml_mutation', operation: 'receipt_process' });
  });

  test('persists successful processing exactly once with an attachment and activity', async () => {
    const { database, repository } = await migrated('expenses_receipt_success');
    const action = processAction();
    const first = await repository.executeMutation(action.mutation, input());
    expect(first).toMatchObject({ expense_id: 'expense-demo-draft', state: 'Succeeded', attempt_count: 1, attachment_id: 'receipt-processed-expense-demo-draft' });
    expect(await repository.query("SELECT receipt_reference, receipt_label, receipt_checksum FROM expenses WHERE id = 'expense-demo-draft'"))
      .toEqual([{ receipt_reference: 'receipt-ocr.pdf', receipt_label: 'Receipt processed', receipt_checksum: 'processed:expense-demo-draft' }]);
    const replay = await repository.executeMutation(action.mutation, input());
    expect(replay).toMatchObject({ state: 'Succeeded', attempt_count: 1, attachment_id: 'receipt-processed-expense-demo-draft' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_attachments WHERE expense_id = 'expense-demo-draft'"))
      .toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_activity WHERE expense_id = 'expense-demo-draft' AND action = 'expenses.receipt.processed'"))
      .toEqual([{ count: 1 }]);
    database.close();
  });

  test('persists provider failure and allows a successful retry without partial attachment state', async () => {
    const { database, repository } = await migrated('expenses_receipt_retry');
    const action = processAction();
    const failed = await repository.executeMutation(action.mutation, input({ provider_result: 'failure', failure_reason: 'OCR provider timeout' }));
    expect(failed).toMatchObject({ state: 'Failed', attempt_count: 1, failure_reason: 'OCR provider timeout', attachment_id: null });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_attachments WHERE expense_id = 'expense-demo-draft'"))
      .toEqual([{ count: 0 }]);
    const retried = await repository.executeMutation(action.mutation, input({ request_key: 'receipt-request-002' }));
    expect(retried).toMatchObject({ state: 'Succeeded', attempt_count: 2, failure_reason: null });
    expect(await repository.query("SELECT COUNT(*) AS count FROM expense_attachments WHERE expense_id = 'expense-demo-draft'"))
      .toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT action, detail FROM expense_activity WHERE expense_id = 'expense-demo-draft' AND action LIKE 'expenses.receipt.%' ORDER BY id"))
      .toEqual([
        { action: 'expenses.receipt.failed', detail: 'OCR provider timeout' },
        { action: 'expenses.receipt.processed', detail: 'Receipt processed by expense_ocr' },
      ]);
    database.close();
  });

  test('rejects wrong-company, invalid, and conflicting replay requests', async () => {
    const { database, repository } = await migrated('expenses_receipt_guards');
    const action = processAction();
    await expect(repository.executeMutation(action.mutation, input({ current_company_name: 'Core3 Vietnam' })))
      .rejects.toMatchObject({ status: 403, code: 'EXPENSE_RECEIPT_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, input({ request_key: '', receipt_reference: '' })))
      .rejects.toMatchObject({ status: 422, code: 'EXPENSE_RECEIPT_INPUT_INVALID' });
    await repository.executeMutation(action.mutation, input());
    await expect(repository.executeMutation(action.mutation, input({ request_key: 'another-request' })))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_RECEIPT_IDEMPOTENCY_CONFLICT' });
    database.close();
  });

  test('keeps processing status empty/error states explicit and preserves module isolation', async () => {
    const { database, repository } = await migrated('expenses_receipt_status');
    const source = yaml('api/expense-detail.yaml').datasources.find((candidate: any) => candidate.id === 'expense_receipt_processing');
    expect((await repository.querySource(source, { id: 'expense-demo-draft', fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Pending', attempt_count: 0 });
    expect((await repository.querySource(source, { id: 'expense-demo-draft', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'expense-demo-draft', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_RECEIPT_PROCESSING_UNAVAILABLE' });
    database.close();
  });
});
