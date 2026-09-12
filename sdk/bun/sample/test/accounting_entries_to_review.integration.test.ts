import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Entries to Review action parity', () => {
  test('joins the dashboard action route to a page-owned API fragment', () => {
    const page = yaml('pages/entries-to-review.yaml');
    const api = yaml('api/entries-to-review.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'accounting-entries-to-review', route: '/accounting/entries-to-review' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'accounting-entries-to-review' });
    expect(page.components[0]).toMatchObject({ source: 'accounting_entries_to_review', row_open_action: 'view_journal_entry' });
    expect(discovered.pageDatasources.get('accounting-entries-to-review')).toEqual(['accounting_entries_to_review']);
  });

  test('returns only deterministic draft entries and supports search/empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_entries_to_review_test_migrations', ['schema', 'data']);
    const source = yaml('api/entries-to-review.yaml').datasources[0];
    const initial = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(initial.data).toHaveLength(4);
    expect(initial.data[0]).toMatchObject({ id: 'accounting-review-demo-001', state: 'Draft', journal: 'Miscellaneous' });
    expect(initial.data.every((row: any) => row.state === 'Draft')).toBe(true);
    expect((await repository.querySource(source, { q: 'bank fee', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toHaveLength(0);
    expect((await repository.query('SELECT COUNT(*) AS count FROM accounting_journal_entries WHERE id LIKE \'accounting-review-demo-%\''))[0].count).toBe(4);
    database.close();
  });
});
