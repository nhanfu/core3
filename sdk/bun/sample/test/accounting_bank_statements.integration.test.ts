import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Bank Statements Odoo action parity', () => {
  test('keeps the action layout and API fragments page-id bound', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/bank-statements.yaml');
    const detailPage = yaml('pages/bank-statement-detail.yaml');
    const api = yaml('api/bank-statements.yaml');
    const detailApi = yaml('api/bank-statement-detail.yaml');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(page.components[0]).toMatchObject({
      type: 'ListView',
      source: 'accounting_bank_statements',
      view_navigation: 'tabs',
      selectable: true,
      row_open_action: 'view_accounting_bank_statement',
    });
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Pivot', 'Graph']);
    expect(api.datasources[0].pivot.fields).toEqual(['statement_month', 'starting_balance', 'ending_balance']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([
      'Reference', 'Date', 'Journal', 'Company', 'Starting Balance', 'Ending Balance',
    ]);
    expect(detailPage.components[0]).toMatchObject({
      type: 'OdooFormView',
      source: 'accounting_bank_statement_detail',
      editable: false,
    });
    expect(discovered.pageDatasources.get('accounting-bank-statements')).toContain('accounting_bank_statements');
    expect(discovered.pageDatasources.get('accounting-bank-statement-detail')).toContain('accounting_bank_statement_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/bank-statements', page: 'accounting-bank-statements', module: 'accounting' }),
      expect.objectContaining({ path: '/accounting/bank-statement-detail', page: 'accounting-bank-statement-detail', module: 'accounting' }),
    ]));
  });

  test('seeds the two authenticated Odoo bank statements idempotently and covers state boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'accounting_bank_statements_states', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'accounting_bank_statements_states', ['schema', 'data']);

    const source = yaml('api/bank-statements.yaml').datasources[0];
    const params = { q: null, fixture_state: null, statement_filter: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.reference)).toEqual([
      'Bank - 2026-08-11', 'Opening Statement: First Synchronization',
    ]);
    expect((await repository.querySource(source, { ...params, q: 'Opening' }, 0, 50)).data.map((row: any) => row.reference)).toEqual([
      'Opening Statement: First Synchronization',
    ]);
    expect((await repository.querySource(source, { ...params, statement_filter: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({
      status: 503,
      code: 'ACCOUNTING_DATA_UNAVAILABLE',
    });

    const count = await repository.query('SELECT COUNT(*) AS count FROM accounting_bank_statements');
    expect(Number(count[0].count)).toBe(2);

    const detail = yaml('api/bank-statement-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'accounting-bank-statement-002', fixture_state: null }, 0, 1)).data).toMatchObject({
      reference: 'Bank - 2026-08-11',
      starting_balance: 4253,
      ending_balance: 6678,
      line_numbers: 'BNK1/2026/00004, BNK1/2026/00003, BNK1/2026/00002',
    });
    expect((await repository.querySource(detail, { id: 'missing-bank-statement', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'accounting-bank-statement-002', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({
      status: 503,
      code: 'ACCOUNTING_BANK_STATEMENT_DETAIL_UNAVAILABLE',
    });

    expect(source.permission).toBe('accounting.read');
    expect(detail.permission).toBe('accounting.read');
    expect(yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items).some((item: any) => item.path === '/accounting/bank-statements' && item.permission === 'accounting.read')).toBe(true);
    database.close();
  });
});
