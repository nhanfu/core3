import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting Employee Expenses parity', () => {
  test('joins the installed action pages and APIs through page.id', () => {
    const page = yaml('pages/employee-expenses.yaml');
    const api = yaml('api/employee-expenses.yaml');
    const detail = yaml('pages/employee-expense-detail.yaml');
    const detailApi = yaml('api/employee-expense-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'invoicing').items.find((item: any) => item.path === '/accounting/employee-expenses');
    expect(page.page).toMatchObject({ id: 'accounting-employee-expenses', route: '/accounting/employee-expenses' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(menu).toMatchObject({ label: 'Employee Expenses', permission: 'accounting.read' });
  });

  test('matches Odoo list and responsive Kanban controls', () => {
    const page = yaml('pages/employee-expenses.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const stats = page.components.find((component: any) => component.type === 'StatRow');
    expect(stats).toMatchObject({ source: 'accounting_employee_expense_totals' });
    expect(stats.stats.map((stat: any) => stat.label)).toEqual(['To Submit', 'Waiting Approval', 'Waiting Reimbursement']);
    expect(list).toMatchObject({ source: 'accounting_employee_expenses', create_action: 'create_accounting_employee_expense', create_label: 'New', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.views.find((view: any) => view.id === 'list')).toMatchObject({ mobile: false });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Employee', 'Description', 'Expense Date', 'Category', 'Paid By', 'Activities', 'Company', 'Total', 'Status']);
    expect(list.row_open_action).toBe('view_accounting_employee_expense');
    expect(list.form_view.page).toBe('apps/services/accounting/pages/employee-expense-detail.yaml');
  });

  test('keeps deterministic fixtures and resilient read/create/update boundaries', () => {
    const api = yaml('api/employee-expenses.yaml');
    const detailApi = yaml('api/employee-expense-detail.yaml');
    const migration = yaml('migrations/20260910180000-016-accounting-employee-expenses.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'accounting_employee_expenses');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_accounting_employee_expense');
    const update = detailApi.actions.find((candidate: any) => candidate.id === 'edit_accounting_employee_expense');
    const migrationText = migration.type.postgres.up + migration.type.postgres.down;
    expect(source.permission).toBe('accounting.read');
    expect(source.error_states.transport_error.status).toBe(503);
    expect(source.query).toContain('fixture_state');
    expect(create.permission).toBe('accounting.write');
    expect(create.mutation.guards).toHaveLength(2);
    expect(update.permission).toBe('accounting.write');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(migration.version).toBe('0.0.16');
    expect(migrationText).toContain("DATE '2026-01-15'");
    expect(migrationText).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migrationText).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random\s*\(/i);
  });
});
