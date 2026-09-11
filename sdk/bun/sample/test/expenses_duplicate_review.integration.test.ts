import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/expense-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Expenses duplicate receipt review parity slice', () => {
  test('joins the shared detail page to a page-scoped duplicate review datasource', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/expense-detail.yaml');
    const api = yaml('api/expense-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('expense-detail');
    expect(discovered.pageDatasources.get('expense-detail')).toContain('expense_duplicate_review');
    expect(api.datasources.find((source: any) => source.id === 'expense_duplicate_review')).toMatchObject({ single: true, permission: 'expenses.read' });
    expect(action('review_duplicate_expense')).toMatchObject({ type: 'server_form', permission: 'expenses.manage', prefill: 'source', prefill_source: 'expense_duplicate_review' });
    expect(action('review_duplicate_expense').fields.map((field: any) => field.field)).toEqual(['review_message', 'candidate_summary', 'decision']);
    expect(action('review_duplicate_expense').fields[0].readonly).toBe(true);
  });

  test('exposes deterministic candidates and empty or transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_duplicate_review_migrations', ['schema', 'data']);
    const source = yaml('api/expense-detail.yaml').datasources.find((candidate: any) => candidate.id === 'expense_duplicate_review');
    const result = await repository.querySource(source, { id: 'expense-demo-submitted-2', fixture_state: null }, 0, 1);
    expect(result.data.id).toBe('expense-demo-submitted-2');
    expect(result.data.candidate_summary).toBe('Hotel Expenses | Brandon Freeman | Travel & accommodation | $180.00 | 2026-09-07 | Manager: Operations Lead');
    expect(result.data.candidate_summary).toMatch(/Brandon Freeman/);
    expect((await repository.querySource(source, { id: 'expense-demo-submitted-2', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'expense-demo-submitted-2', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_DUPLICATE_REVIEW_UNAVAILABLE' });
    expect((await repository.querySource(source, { id: 'missing-expense', fixture_state: null }, 0, 1)).data).toEqual({});
  });

  test('guards stale, missing-candidate, invalid-decision, and permission boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_duplicate_review_mutations', ['schema', 'data']);
    const review = action('review_duplicate_expense');
    expect(review.permission).toBe('expenses.manage');
    await expect(repository.executeMutation(review.mutation, { id: 'expense-demo-submitted-2', expected_row_version: 99, decision: 'approve' }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_DUPLICATE_REVIEW_STALE' });
    await expect(repository.executeMutation(review.mutation, { id: 'expense-demo-submitted', expected_row_version: 1, decision: 'approve' }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_DUPLICATE_REVIEW_EMPTY' });
    await expect(repository.executeMutation(review.mutation, { id: 'expense-demo-submitted-2', expected_row_version: 1, decision: 'later' }))
      .rejects.toMatchObject({ status: 400, code: 'EXPENSE_DUPLICATE_DECISION_INVALID' });
  });

  test('applies approve and refuse decisions with optimistic concurrency and activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_duplicate_review_apply', ['schema', 'data']);
    const review = action('review_duplicate_expense');
    const approved = await repository.executeMutation(review.mutation, { id: 'expense-demo-submitted-2', expected_row_version: 1, decision: 'approve', current_user_name: 'Operations Lead' });
    expect(approved).toMatchObject({ id: 'expense-demo-submitted-2', state: 'Approved', row_version: 2, refusal_reason: null });
    const activity = await repository.query("SELECT action, action_label, detail FROM expense_activity WHERE expense_id = 'expense-demo-submitted-2' ORDER BY created_at DESC, id DESC LIMIT 1");
    expect(activity[0]).toMatchObject({ action: 'expenses.duplicate_approve', action_label: 'Approved after duplicate review' });
    await expect(repository.executeMutation(review.mutation, { id: 'expense-demo-submitted-2', expected_row_version: 1, decision: 'approve' }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_DUPLICATE_REVIEW_STALE' });
  });
});
