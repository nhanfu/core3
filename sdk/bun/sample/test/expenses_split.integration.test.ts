import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/expense-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Expenses split wizard parity slice', () => {
  test('joins the detail page to split wizard and line-grid datasources', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/expense-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('expense-detail')).toEqual(expect.arrayContaining(['expense_split_wizard', 'expense_split_lines']));
    expect(page.components.find((component: any) => component.type === 'LineItemGrid')).toMatchObject({
      source: 'expense_split_lines', parent_source: 'expense_detail', variant: 'odoo_x2many',
    });
    expect(action('split_expense')).toMatchObject({ type: 'server_form', permission: 'expenses.write', prefill_source: 'expense_split_wizard' });
    expect(action('split_expense').fields.map((field: any) => field.field)).toEqual(['original_amount', 'split_total', 'line_count', 'warning']);
  });

  test('seeds stable Odoo-shaped lines and exposes mismatch or unavailable states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_split_schema', ['schema', 'data']);
    const wizard = api.datasources.find((source: any) => source.id === 'expense_split_wizard');
    const lines = api.datasources.find((source: any) => source.id === 'expense_split_lines');
    expect((await repository.querySource(wizard, { id: 'expense-demo-draft', fixture_state: null }, 0, 1)).data).toMatchObject({
      original_amount: 24.5, split_total: 24.5, line_count: 2, split_possible: true,
    });
    expect((await repository.querySource(lines, { id: 'expense-demo-draft', fixture_state: null }, 0, 20)).data).toHaveLength(2);
    expect((await repository.querySource(wizard, { id: 'expense-demo-draft', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(lines, { id: 'expense-demo-draft', fixture_state: 'transport_error' }, 0, 20))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_SPLIT_LINES_UNAVAILABLE' });
  });

  test('supports permissioned line CRUD and validates split totals before applying', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_split_mutations', ['schema', 'data']);
    for (const id of ['split_expense', 'add_expense_split_line', 'edit_expense_split_line', 'delete_expense_split_line']) {
      expect(action(id).permission, id).toBe('expenses.write');
    }
    const add = action('add_expense_split_line');
    await repository.executeMutation(add.mutation, {
      id: 'expense-demo-draft', name: 'Breakfast with project team', employee_name: 'Admin User', total_amount: 1,
    });
    const remove = action('delete_expense_split_line');
    await repository.executeMutation(remove.mutation, {
      id: 'expense-demo-draft', line_id: 'expense-split-line-draft-1', expected_row_version: 1,
    });
    const split = action('split_expense');
    await expect(repository.executeMutation(split.mutation, { id: 'expense-demo-draft', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_SPLIT_TOTAL_MISMATCH' });
  });

  test('applies a matching split and records a deterministic relation/activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_split_apply', ['schema', 'data']);
    const split = action('split_expense');
    const result = await repository.executeMutation(split.mutation, {
      id: 'expense-demo-draft', expected_row_version: 1, current_user_name: 'Admin User',
    });
    expect(result).toMatchObject({ id: 'expense-demo-draft', amount: 12.25, split_expense_origin_id: 'expense-demo-draft', row_version: 2 });
    expect(await repository.query("SELECT id, amount, split_expense_origin_id FROM expenses WHERE split_expense_origin_id = 'expense-demo-draft' ORDER BY id"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'expense-demo-draft', amount: 12.25 }),
        expect.objectContaining({ id: 'expense-split-expense-split-line-draft-2', amount: 12.25, split_expense_origin_id: 'expense-demo-draft' }),
      ]));
    expect(await repository.query("SELECT action, action_label FROM expense_activity WHERE expense_id = 'expense-demo-draft' AND action = 'expenses.split'"))
      .toEqual([expect.objectContaining({ action: 'expenses.split', action_label: 'Split Expense' })]);
  });
});
