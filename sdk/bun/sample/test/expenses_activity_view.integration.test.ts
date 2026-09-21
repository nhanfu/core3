import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Expenses Activity view parity slice', () => {
  test('declares the Odoo Activity view on My Expenses and keeps page/API ownership separate', () => {
    const page = yaml('pages/expenses.yaml');
    const api = yaml('api/expenses.yaml');
    const activity = page.components[0].views.find((view: any) => view.id === 'activity');
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('expenses');
    expect(activity).toMatchObject({
      label: 'Activity',
      title_field: 'name',
      subtitle_field: 'employee_name',
      record_date_field: 'expense_date',
    });
    expect(activity.activity_types.map((type: any) => type.label)).toEqual([
      'To-Do', 'Email', 'Call', 'Meeting', 'Expense Approval', 'Document',
    ]);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('expenses')).toContain('expenses_my');
    expect(api.datasources.find((source: any) => source.id === 'expenses_my').query).toContain('expense_scheduled_activities');
  });

  test('feeds the Activity view from durable scheduled activities with stable state metadata', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_activity_view', ['schema', 'data']);
    const source = yaml('api/expenses.yaml').datasources.find((item: any) => item.id === 'expenses_my');
    const result = await repository.querySource(source, { q: null, status: null, payment_mode: null, fixture_state: null }, 0, 50);
    expect(result.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'expense-demo-submitted',
        activity_type: 'todo',
        activity_summary: 'Review the submitted receipt',
        activity_date: '2026-09-23',
        activity_user: 'Operations Lead',
        activity_state: 'planned',
        activity_count: 1,
      }),
    ]));
    expect(result.data.filter((row: any) => row.activity_count > 0)).toHaveLength(1);
    await database.close();
  });

  test('preserves search, empty, and transport-error behavior for the Activity datasource', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'expenses_activity_view_states', ['schema', 'data']);
    const source = yaml('api/expenses.yaml').datasources.find((item: any) => item.id === 'expenses_my');
    expect((await repository.querySource(source, { q: 'Review the submitted receipt', status: null, payment_mode: null, fixture_state: null }, 0, 50)).data)
      .toEqual([expect.objectContaining({ id: 'expense-demo-submitted', activity_count: 1 })]);
    expect((await repository.querySource(source, { q: null, status: null, payment_mode: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSES_ACTIVITY_UNAVAILABLE' });
    await database.close();
  });
});
