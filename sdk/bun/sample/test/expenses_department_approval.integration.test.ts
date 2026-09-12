import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const findAction = (id: string) => yaml('api/to-approve.yaml').actions.find((item: any) => item.id === id);

describe('Expenses department approval action parity', () => {
  test('joins a presentation page to a scoped API and preserves Odoo view order', () => {
    const page = yaml('pages/to-approve.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'expenses-to-approve', route: '/expenses/to-approve' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'pivot', 'graph']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('expenses-to-approve')).toContain('expenses_department_to_approve');
    expect(findAction('approve_department_expense')).toMatchObject({ permission: 'expenses.manage', operation: 'approve' });
    expect(findAction('refuse_department_expense').fields[0]).toMatchObject({ field: 'reason', required: true });
  });

  test('defaults to the seeded Sales department and supports the active department scope', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_department_approval_migrations', ['schema', 'data']);
    const source = yaml('api/to-approve.yaml').datasources.find((item: any) => item.id === 'expenses_department_to_approve');
    const sales = await repository.querySource(source, { department_name: null, q: null, payment_mode: null }, 0, 25);
    expect(sales.data.map((row: any) => row.name)).toEqual(['Travel by Air', 'Hotel Expenses']);
    const engineering = await repository.querySource(source, { department_name: 'Engineering', q: null, payment_mode: null }, 0, 25);
    expect(engineering.data).toEqual([]);
    const empty = await repository.querySource(source, { department_name: 'Sales', q: 'missing', payment_mode: null }, 0, 25);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 25)).rejects.toMatchObject({ status: 503, code: 'EXPENSE_DEPARTMENT_APPROVAL_UNAVAILABLE' });
  });

  test('keeps approval permission and receipt guard on the department action', () => {
    const approve = findAction('approve_department_expense');
    expect(approve.permission).toBe('expenses.manage');
    expect(approve.mutation.guards[0].message).toBe('Attach a receipt before approving this expense');
    expect(findAction('view_expense_detail')).toMatchObject({ permission: 'expenses.read', navigate_to: '/expenses/detail' });
  });
});
