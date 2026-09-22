import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Expenses same-receipt action parity', () => {
  test('maps Odoo same-receipt warning action to page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml', 'utf8');
    const page = yaml('pages/expense-detail.yaml');
    const detailApi = yaml('api/expense-detail.yaml');
    const sameReceiptPage = yaml('pages/same-receipt.yaml');
    const sameReceiptApi = yaml('api/same-receipt.yaml');

    expect(source).toContain('def action_show_same_receipt_expense_ids');
    expect(source).toContain('self.same_receipt_expense_ids._get_records_action');
    expect(view).toContain('name="action_show_same_receipt_expense_ids"');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_same_receipt_expenses', permission: 'expenses.read' }));
    expect(detailApi.page.id).toBe(page.page.id);
    expect(detailApi.datasources.find((item: any) => item.id === 'expense_detail').query).toContain('same_receipt_count');
    expect(detailApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_same_receipt_expenses', type: 'navigate', navigate_to: '/expenses/same-receipt',
      params: { expense_id: '{state.expense_detail.id}' },
    }));
    expect(sameReceiptPage.page.id).toBe('expenses-same-receipt');
    expect(sameReceiptPage.datasources).toBeUndefined();
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('expenses-same-receipt')).toContain('expense_same_receipt');
    expect(sameReceiptApi.page.id).toBe(sameReceiptPage.page.id);
    expect(sameReceiptApi.datasources[0]).toMatchObject({ id: 'expense_same_receipt', permission: 'expenses.read' });
  });

  test('returns only same-receipt expenses within the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_same_receipt_migrations', ['schema', 'data']);
    const api = yaml('api/same-receipt.yaml');
    const source = api.datasources[0];

    const matching = await repository.querySource(source, { expense_id: 'expense-demo-submitted-2', current_company_name: 'Core3 Demo Company', q: null }, 0, 25);
    expect(matching.data).toEqual([expect.objectContaining({ id: 'expense-demo-submitted', name: 'Hotel Expenses', receipt_reference: 'receipt-hotel.pdf' })]);
    expect((await repository.querySource(source, { expense_id: 'expense-demo-submitted-2', current_company_name: 'Core3 Demo Company', q: 'missing' }, 0, 25)).data).toEqual([]);
    expect((await repository.querySource(source, { expense_id: 'expense-demo-submitted-2', current_company_name: 'Other Company', q: null }, 0, 25)).data).toEqual([]);
    expect((await repository.querySource(source, { expense_id: 'expense-demo-draft', current_company_name: 'Core3 Demo Company', q: null }, 0, 25)).data).toEqual([]);
    await expect(repository.querySource(source, { expense_id: 'expense-demo-submitted-2', current_company_name: 'Core3 Demo Company', q: null, fixture_state: 'transport_error' }, 0, 25))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_SAME_RECEIPT_UNAVAILABLE' });
    await database.close();
  });

  test('projects the warning count and preserves the source action as read-only', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_same_receipt_detail', ['schema', 'data']);
    const detail = yaml('api/expense-detail.yaml').datasources.find((item: any) => item.id === 'expense_detail');
    const row = await repository.querySource(detail, { id: 'expense-demo-submitted-2', fixture_state: null }, 0, 1);
    expect(row.data).toMatchObject({ id: 'expense-demo-submitted-2', same_receipt_count: 1 });
    expect(yaml('api/same-receipt.yaml').actions.some((action: any) => action.mutation)).toBe(false);
    await database.close();
  });
});
