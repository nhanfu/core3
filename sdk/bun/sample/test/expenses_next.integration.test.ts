import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Expenses approval-state parity batch', () => {
  test('keeps the detail and queue presentation separated from page-ID APIs', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, sourceId] of [
      ['pages/expense-detail.yaml', 'expense-detail', 'expense_detail'],
      ['pages/to-process.yaml', 'expenses-to-process', 'expenses_to_process'],
    ] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.actions, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
    }

    expect(action('expense-detail.yaml', 'refuse_expense_detail')).toMatchObject({
      type: 'server_form', handler: 'yaml_mutation', operation: 'refuse',
    });
    expect(action('expense-detail.yaml', 'refuse_expense_detail').fields[0]).toMatchObject({ field: 'reason', required: true });
    expect(action('to-process.yaml', 'refuse_expense').type).toBe('server_form');
  });

  test('seeds a duplicate receipt candidate and exposes stable error state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_next_schema_migrations', ['schema', 'data']);

    const detail = yaml('api/expense-detail.yaml').datasources.find((source: any) => source.id === 'expense_detail');
    const row = await repository.querySource(detail, { id: 'expense-demo-submitted-2', fixture_state: null }, 0, 1);
    expect(row.data).toMatchObject({
      name: 'Travel by Air',
      status: 'Submitted',
      receipt_label: 'Possible duplicate receipt',
      duplicate_candidate: 'Similar submitted expense: Travel by car (expense-demo-submitted)',
    });

    const empty = await repository.querySource(detail, { id: 'expense-demo-submitted-2', fixture_state: 'empty' }, 0, 1);
    expect(empty.data).toEqual({});
    await expect(repository.querySource(detail, { id: 'expense-demo-submitted-2', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_DETAIL_UNAVAILABLE' });
  });

  test('rejects missing receipts and persists refusal reasons with activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_next_mutation_schema_migrations', ['schema', 'data']);

    const submit = action('expense-detail.yaml', 'submit_expense_detail');
    await expect(repository.executeMutation(submit.mutation, { id: 'expense-demo-no-receipt', current_user_name: 'Admin User' }))
      .rejects.toMatchObject({ status: 409, message: 'Attach a receipt before submitting this expense' });

    const refuse = action('expense-detail.yaml', 'refuse_expense_detail');
    const result = await repository.executeMutation(refuse.mutation, {
      id: 'expense-demo-submitted', current_user_name: 'Operations Lead', reason: 'Receipt is not legible',
    });
    expect(result).toMatchObject({ state: 'Refused', refusal_reason: 'Receipt is not legible' });
    const activity = await repository.query('SELECT action, detail FROM expense_activity WHERE expense_id = ? ORDER BY created_at DESC LIMIT 1', ['expense-demo-submitted']);
    expect(activity[0]).toMatchObject({ action: 'expenses.refuse', detail: 'Receipt is not legible' });
  });

  test('requires a receipt before approval and preserves permission metadata', () => {
    const approve = action('expense-detail.yaml', 'approve_expense_detail');
    expect(approve.permission).toBe('expenses.manage');
    expect(approve.mutation.guards[0].message).toBe('Attach a receipt before approving this expense');
    expect(action('to-process.yaml', 'approve_expense').permission).toBe('expenses.manage');
  });
});
