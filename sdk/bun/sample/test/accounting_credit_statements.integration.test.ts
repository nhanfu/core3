import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (name: string) => Bun.YAML.parse(readFileSync(join(root, name), 'utf8')) as any;

describe('Accounting Credit Statements action parity', () => {
  test('keeps the source action page and API page.id contract', () => {
    const page = yaml('pages/credit-statements.yaml');
    const api = yaml('api/credit-statements.yaml');
    expect(page.page.id).toBe('accounting-credit-statements');
    expect(page.components[0].source).toBe('accounting_credit_statements');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].create_label).toBeUndefined();
    expect(api.datasources[0].permission).toBe('accounting.read');
    expect(api.datasources[0].error_states.forbidden.status).toBe(403);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Pivot', 'Graph']);
    expect(api.datasources[0].pivot.fields).toEqual(['statement_month', 'starting_balance', 'ending_balance']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('accounting-credit-statements')).toContain('accounting_credit_statements');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/credit-statements', page: 'accounting-credit-statements', module: 'accounting' }),
    ]));
  });

  test('seeds deterministic credit rows and bounded states', async () => {
    const db = await DuckDbDatabase.open(':memory:');
    const repo = new YamlRepository(db);
    await migrateDatabase(repo, join(root, 'migrations'), undefined, 'accounting_credit_statements_states', ['schema', 'data']);
    const source = yaml('api/credit-statements.yaml').datasources[0];
    const normal = await repo.querySource(source, { q: null, fixture_state: null, statement_filter: null }, 0, 50);
    expect(normal.data.map((row: any) => row.reference)).toEqual([
      'Credit Statement - 2026-01-15', 'Credit Statement - 2025-12-15', 'Credit Statement - 2025-11-15',
    ]);
    expect((await repo.querySource(source, { q: 'Travel', fixture_state: null, statement_filter: null }, 0, 50)).data).toHaveLength(1);
    expect((await repo.querySource(source, { q: null, fixture_state: null, statement_filter: 'empty' }, 0, 50)).data).toHaveLength(1);
    expect((await repo.querySource(source, { q: null, fixture_state: null, statement_filter: 'invalid' }, 0, 50)).data).toHaveLength(1);
    expect((await repo.querySource(source, { q: null, fixture_state: 'empty', statement_filter: null }, 0, 50)).data).toEqual([]);
    await expect(repo.querySource(source, { q: null, fixture_state: 'transport_error', statement_filter: null }, 0, 50)).rejects.toMatchObject({ status: 503 });
    await migrateDatabase(repo, join(root, 'migrations'), undefined, 'accounting_credit_statements_states', ['schema', 'data']);
    expect((await repo.querySource(source, { q: null, fixture_state: null, statement_filter: null }, 0, 50)).data).toHaveLength(3);
    db.close();
  });
});
