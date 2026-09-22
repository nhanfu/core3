import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/expenses.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Expenses import, export, and print parity slice', () => {
  test('keeps the list page presentation-only and exposes permissioned utility actions', () => {
    const page = yaml('pages/expenses.yaml');
    const api = yaml('api/expenses.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.actions).toBeUndefined();
    expect(list.header_actions.map((item: any) => item.id)).toEqual(['import_expenses', 'export_expenses', 'print_expenses']);
    expect(action('import_expenses')).toMatchObject({ type: 'server_form', permission: 'expenses.write', handler: 'yaml_mutation' });
    expect(action('export_expenses')).toMatchObject({ type: 'client', permission: 'expenses.read' });
    expect(action('print_expenses')).toMatchObject({ type: 'client', permission: 'expenses.read' });
    expect(api.datasources.find((source: any) => source.id === 'expenses_my')).toBeDefined();
    expect(action('export_expenses').script).toContain('state.expenses_my');
    expect(action('print_expenses').script).toContain('window.print');
  });

  test('imports deterministic expenses, updates the owning sheet, and is replay-safe', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_import_test_migrations', ['schema', 'data']);
    const importAction = action('import_expenses');
    const values = {
      expense_list: 'Team breakfast|Admin User|Meals|2026-09-13|24.50|Employee\nAirport taxi|Operations Lead|Travel & Accommodation|2026-09-12|18.00|Company',
      company_name: 'Core3 Vietnam',
    };
    const first = await repository.executeMutation(importAction.mutation, { values, current_company_name: 'Core3 Vietnam' });
    expect(first).toEqual({ imported: 2 });
    expect(await repository.query("SELECT id, name, amount, payment_method FROM expenses WHERE id LIKE 'expense-import-%' ORDER BY id")).toEqual([
      { id: 'expense-import-admin-user-team-breakfast', name: 'Team breakfast', amount: 24.5, payment_method: 'Employee' },
      { id: 'expense-import-operations-lead-airport-taxi', name: 'Airport taxi', amount: 18, payment_method: 'Company' },
    ]);
    expect(await repository.query("SELECT id, amount_total FROM expense_sheets WHERE id LIKE 'expense-sheet-import-%' ORDER BY id")).toEqual([
      { id: 'expense-sheet-import-admin-user', amount_total: 24.5 },
      { id: 'expense-sheet-import-operations-lead', amount_total: 18 },
    ]);
    const second = await repository.executeMutation(importAction.mutation, { values, current_company_name: 'Core3 Vietnam' });
    expect(second).toEqual({ imported: 2 });
    expect((await repository.query("SELECT COUNT(*) AS count FROM expenses WHERE id LIKE 'expense-import-%'"))[0].count).toBe(2);
  });

  test('rejects malformed rows and cross-company imports without changing data', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_import_guard_test_migrations', ['schema', 'data']);
    const importAction = action('import_expenses');
    await expect(repository.executeMutation(importAction.mutation, { values: { expense_list: 'Bad row', company_name: 'Core3 Vietnam' }, current_company_name: 'Core3 Vietnam' }))
      .rejects.toMatchObject({ status: 422, code: 'EXPENSE_IMPORT_INVALID' });
    await expect(repository.executeMutation(importAction.mutation, { values: { expense_list: 'Taxi|Admin User|Travel|2026-09-13|10.00|Company', company_name: 'Other Company' }, current_company_name: 'Core3 Vietnam' }))
      .rejects.toMatchObject({ status: 403, code: 'EXPENSE_COMPANY_SCOPE_REQUIRED' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM expenses WHERE id LIKE 'expense-import-%'"))[0].count).toBe(0);
  });
});
