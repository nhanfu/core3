import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Purchases journal action', () => {
  test('keeps the source action view modes and page/API boundary', () => {
    const page = yaml('pages/purchases.yaml');
    const api = yaml('api/purchases.yaml');
    expect(page.page).toMatchObject({ id: 'accounting-purchases', route: '/accounting/purchases' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'accounting-purchases' });
    expect(page.components[0]).toMatchObject({ source: 'accounting_purchase_journal_items', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph', 'kanban', 'card']);
    expect(api.datasources[0]).toMatchObject({ permission: 'accounting.read', pivot: { fields: ['partner_name', 'debit', 'credit', 'balance'] } });
    expect(api.datasources[0].query).toContain("journal_type = 'purchase'");
  });

  test('returns deterministic posted purchase lines and supports empty search', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_purchases_action_migrations', ['schema', 'data']);
    const source = yaml('api/purchases.yaml').datasources[0];
    const initial = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(initial.data).toHaveLength(2);
    expect(initial.data.every((row: any) => row.state === 'Posted')).toBe(true);
    expect(initial.data.every((row: any) => row.entry_name.startsWith('BILL/'))).toBe(true);
    expect(initial.data.map((row: any) => row.label)).toEqual(['Expenses', 'Account Payable']);
    expect((await repository.querySource(source, { q: 'not-a-purchase', fixture_state: null }, 0, 50)).data).toHaveLength(0);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toHaveLength(0);
    database.close();
  });
});
