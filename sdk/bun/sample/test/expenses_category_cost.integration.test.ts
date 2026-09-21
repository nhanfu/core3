import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = () => yaml('api/categories.yaml').actions.find((candidate: any) => candidate.id === 'edit_expense_category');

const migrated = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};

describe('Expenses category cost propagation parity', () => {
  test('keeps the category page/API split and declares the Odoo warning contract', () => {
    const page = yaml('pages/categories.yaml');
    const api = yaml('api/categories.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('expense-categories');
    expect(api.page.id).toBe('expense-categories');
    expect(api.datasources[0].query).toContain('draft_expense_count');
    expect(api.datasources[0].query).toContain('unsubmitted expenses linked to this category');
    expect(action()).toMatchObject({ permission: 'expenses.manage', operation: 'update' });
    expect(action().fields.map((field: any) => field.field)).toEqual(expect.arrayContaining(['unit_cost', 'draft_expense_count', 'cost_update_warning']));
    expect(action().mutation.steps).toHaveLength(2);
  });

  test('updates only current-company draft expenses and recalculates the sheet total', async () => {
    const { database, repository } = await migrated('expenses_category_cost_propagation');
    const edit = action();
    const changed = await repository.executeMutation(edit.mutation, {
      id: 'expense-category-mileage',
      expected_row_version: 1,
      current_company_name: 'Core3 Demo Company',
      values: { name: 'Mileage', cost_method: 'quantity', unit_cost: 1.25, reference: 'MILE', guideline: 'Mileage reimbursed per kilometer' },
    });
    expect(changed).toMatchObject({ name: 'Mileage', unit_cost: 1.25, row_version: 2 });
    expect(await repository.query("SELECT amount, quantity, state, row_version FROM expenses WHERE id = 'expense-demo-no-receipt'"))
      .toEqual([{ amount: 107.14, quantity: 85.714, state: 'Draft', row_version: 2 }]);
    expect(await repository.query("SELECT amount FROM expenses WHERE id = 'expense-demo-draft'"))
      .toEqual([{ amount: 24.50 }]);
    expect(await repository.query("SELECT amount_total FROM expense_sheets WHERE id = 'expense-sheet-demo-001'"))
      .toEqual([{ amount_total: 131.64 }]);
    database.close();
  });

  test('renames the linked draft category, preserves non-draft amounts, and supports zero-cost reset', async () => {
    const { database, repository } = await migrated('expenses_category_cost_rename');
    const edit = action();
    await repository.executeMutation(edit.mutation, {
      id: 'expense-category-meals',
      expected_row_version: 1,
      current_company_name: 'Core3 Demo Company',
      values: { name: 'Client Meals', cost_method: 'fixed', unit_cost: 2, reference: 'MEAL', guideline: 'Business meals and refreshments' },
    });
    expect(await repository.query("SELECT category, product_name, amount, state FROM expenses WHERE category = 'Client Meals' ORDER BY id"))
      .toEqual([
        { category: 'Client Meals', product_name: 'Client Meals', amount: 95, state: 'Approved' },
        { category: 'Client Meals', product_name: 'Client Meals', amount: 2, state: 'Draft' },
        { category: 'Client Meals', product_name: 'Client Meals', amount: 48, state: 'Paid' },
      ]);
    await repository.executeMutation(edit.mutation, {
      id: 'expense-category-meals',
      expected_row_version: 2,
      current_company_name: 'Core3 Demo Company',
      values: { name: 'Client Meals', cost_method: 'fixed', unit_cost: 0, reference: 'MEAL', guideline: 'Business meals and refreshments' },
    });
    expect(await repository.query("SELECT amount, quantity FROM expenses WHERE id = 'expense-demo-draft'"))
      .toEqual([{ amount: 2, quantity: 1 }]);
    database.close();
  });

  test('rejects negative costs, stale edits, and manager-less access without mutation', async () => {
    const { database, repository } = await migrated('expenses_category_cost_guards');
    const edit = action();
    await expect(repository.executeMutation(edit.mutation, {
      id: 'expense-category-meals', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { name: 'Meals', cost_method: 'fixed', unit_cost: -1 },
    })).rejects.toMatchObject({ status: 422, code: 'EXPENSE_CATEGORY_COST_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'expense-category-meals', expected_row_version: 99, current_company_name: 'Core3 Demo Company',
      values: { name: 'Meals', cost_method: 'fixed', unit_cost: 1 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.query("SELECT amount, row_version FROM expenses WHERE id = 'expense-demo-draft'"))
      .toEqual([{ amount: 24.50, row_version: 1 }]);
    database.close();
  });
});
