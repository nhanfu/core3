import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Journal Items view parity', () => {
  test('keeps the page/API contract and declares the installed Odoo view modes', () => {
    const page = yaml('pages/journal-items.yaml');
    const api = yaml('api/journal-items.yaml');
    const list = page.components[0];
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'accounting-journal-items', route: '/accounting/journal-items' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'accounting-journal-items' });
    expect(list).toMatchObject({ source: 'accounting_journal_items', variant: 'odoo', view_navigation: 'icons' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph', 'kanban', 'card']);
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({
      category_field: 'item_month',
      measure_field: 'balance',
      measure_label: 'Balance',
      show_zero_data: true,
      type: 'line',
    });
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({
      group_by: '',
      card: { title: 'account_name', subtitle: 'label' },
    });
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({
      mobile: true,
      card: { title: 'account_name', subtitle: 'label' },
    });
    expect(api.datasources[0].pivot.fields).toEqual(['partner_name', 'debit', 'credit', 'balance']);
    expect(String(api.datasources[0].query)).toContain("strftime(item_date, '%B %Y') AS item_month");
    expect(String(api.datasources[0].query)).toContain('amount_display');
    expect(discovered.pageDatasources.get('accounting-journal-items')).toEqual(['accounting_journal_items']);
  });

  test('returns deterministic graph and card projections from the journal-item fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_journal_items_views_migrations', ['schema', 'data']);
    const source = yaml('api/journal-items.yaml').datasources[0];
    const initial = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);

    expect(initial.data).toHaveLength(4);
    expect(initial.data[0]).toMatchObject({
      id: 'acct-item-001',
      item_month: 'January 2026',
      account_name: 'Product Sales',
      balance: 295,
      direction: 'DR',
      amount_display: '$ 295.00 (DR)',
    });
    expect(initial.data[1]).toMatchObject({
      id: 'acct-item-002',
      account_name: 'Account Receivable',
      balance: -295,
      direction: 'CR',
      amount_display: '$ 295.00 (CR)',
    });
    expect(initial.data.every((row: any) => row.state === 'Posted')).toBe(true);
    expect((await repository.querySource(source, { q: 'Azure Interior', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    database.close();
  });
});
