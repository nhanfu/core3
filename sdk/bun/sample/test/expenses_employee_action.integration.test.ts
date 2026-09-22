import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Expenses Employee Expenses action parity', () => {
  test('keeps the Odoo action presentation separate from its page-ID API', () => {
    const page = yaml('pages/employee-expenses.yaml');
    const api = yaml('api/employee-expenses.yaml');
    const list = page.components[0];

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'expenses-employee', route: '/expenses/employee' });
    expect(list).toMatchObject({
      source: 'expenses_employee',
      view_navigation: 'tabs',
      default_filters: { employee_expense_scope: 'approved_to_pay' },
      form_view: { page: 'pages/expense-detail.yaml', side_panel: false },
    });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'pivot').pivot.default).toEqual({
      rows: ['employee_name'],
      columns: ['expense_date'],
      measures: [
        { field: 'total_amount', aggregate: 'sum', column: 'Total Amount' },
        { field: 'tax_amount', aggregate: 'sum', column: 'Total Taxes' },
      ],
    });
    expect(api.datasources.find((source: any) => source.id === 'expenses_employee')).toMatchObject({ permission: 'expenses.read' });
  });

  test('applies approved/to-pay defaults, supports filters, and preserves empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_employee_action', ['schema', 'data']);
    const source = yaml('api/employee-expenses.yaml').datasources.find((candidate: any) => candidate.id === 'expenses_employee');

    const scoped = await repository.querySource(source, { employee_expense_scope: 'approved_to_pay', q: null, status: null, payment_mode: null }, 0, 25);
    expect(scoped.data).toEqual([expect.objectContaining({ id: 'expense-demo-approved', status: 'Approved', total_amount: 95 })]);

    const all = await repository.querySource(source, { employee_expense_scope: 'all', q: null, status: 'Posted', payment_mode: 'Company' }, 0, 25);
    expect(all.data).toEqual([expect.objectContaining({ id: 'expense-demo-posted', payment_mode_label: 'Paid by Company', tax_amount: 0 })]);

    const empty = await repository.querySource(source, { employee_expense_scope: 'approved_to_pay', q: 'does-not-exist', status: null, payment_mode: null }, 0, 25);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 25))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_EMPLOYEE_UNAVAILABLE' });
    await database.close();
  });
});
