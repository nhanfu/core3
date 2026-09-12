import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Sales journal action', () => {
  test('keeps the source action view modes and page/API boundary', () => {
    const page = yaml('pages/sales.yaml');
    const api = yaml('api/sales.yaml');
    expect(page.page).toMatchObject({ id: 'accounting-sales', route: '/accounting/sales' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'accounting-sales' });
    expect(page.components[0]).toMatchObject({ source: 'accounting_sales_journal_items', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph', 'kanban', 'card']);
    expect(api.datasources[0].permission).toBe('accounting.read');
    expect(api.datasources[0].query).toContain("journal_type = 'sales'");
  });

  test('returns only deterministic posted sales lines and supports empty search', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_sales_action_migrations', ['schema', 'data']);
    const source = yaml('api/sales.yaml').datasources[0];
    const initial = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(initial.data).toHaveLength(2);
    expect(initial.data.every((row: any) => row.state === 'Posted')).toBe(true);
    expect(initial.data.every((row: any) => row.entry_name.startsWith('INV/'))).toBe(true);
    expect((await repository.querySource(source, { q: 'not-a-sale', fixture_state: null }, 0, 50)).data).toHaveLength(0);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toHaveLength(0);
    database.close();
  });
});
