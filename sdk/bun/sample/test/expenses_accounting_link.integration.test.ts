import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Expenses accounting document action parity', () => {
  test('keeps the smart buttons and accounting link datasource in the page/API boundary', () => {
    const page = yaml('pages/expense-detail.yaml');
    const api = yaml('api/expense-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const buttons = page.components[0].stat_buttons;

    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'expense-detail' });
    expect(discovered.pageDatasources.get('expense-detail')).toContain('expense_accounting_link');
    expect(buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_expense_account_move', label: 'Journal Entry', permission: 'accounting.read' }),
      expect.objectContaining({ id: 'open_expense_origin_payment', label: 'Payment', permission: 'accounting.read' }),
    ]));
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_expense_account_move', navigate_to: '/accounting/journal-entry-detail', permission: 'accounting.read' }),
      expect.objectContaining({ id: 'open_expense_origin_payment', navigate_to: '/accounting/payment-detail', permission: 'accounting.read' }),
    ]));
  });

  test('returns durable, typed links with company and empty/error guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_accounting_links', ['schema', 'data']);
    const source = yaml('api/expense-detail.yaml').datasources.find((candidate: any) => candidate.id === 'expense_accounting_link');

    expect((await repository.querySource(source, { id: 'expense-demo-in-payment', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ target_type: 'journal_entry', target_id: 'accounting-entry-demo-001', target_route: '/accounting/journal-entry-detail' });
    expect((await repository.querySource(source, { id: 'expense-demo-posted', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ target_type: 'payment', target_id: 'accounting-payment-demo-001', target_route: '/accounting/payment-detail' });
    expect((await repository.querySource(source, { id: 'expense-demo-posted', current_company_name: 'Other Company', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'expense-demo-posted', current_company_name: 'Core3 Demo Company', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'expense-demo-posted', current_company_name: 'Core3 Demo Company', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'EXPENSE_ACCOUNTING_LINK_UNAVAILABLE' });
    await database.close();
  });

  test('replays the integration seed without duplicate links', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'expenses_accounting_links_replay', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'expenses_accounting_links_replay', ['schema', 'data']);
    expect(await repository.query("SELECT id, target_type FROM expense_accounting_links ORDER BY id")).toEqual([
      { id: 'expense-accounting-link-in-payment', target_type: 'journal_entry' },
      { id: 'expense-accounting-link-posted', target_type: 'payment' },
    ]);
    await database.close();
  });
});
