import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Journal Entry detail parity', () => {
  test('joins list navigation and detail through page-owned API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/journal-entries.yaml');
    const detail = yaml('pages/journal-entry-detail.yaml');
    expect(list.components[0]).toMatchObject({ row_open_action: 'view_journal_entry', row_double_click_action: 'view_journal_entry' });
    expect(list.actions.find((action: any) => action.id === 'view_journal_entry')).toMatchObject({ navigate_to: '/accounting/journal-entry-detail', permission: 'accounting.read' });
    expect(discovered.pages.get('journal-entry-detail')?.config.page.route).toBe('/accounting/journal-entry-detail');
    expect(discovered.pageDatasources.get('journal-entry-detail')).toEqual(['accounting_journal_entry_detail']);
    expect(detail.components[0].statusbar.map((item: any) => item.value)).toEqual(['Draft', 'Posted']);
  });

  test('returns deterministic detail state and guards workflow mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_journal_detail_test_migrations', ['schema', 'data']);
    const source = yaml('api/journal-entry-detail.yaml').datasources[0];
    expect(await repository.querySource(source, { id: 'accounting-entry-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Miscellaneous Operations', state: 'Posted', balance: 0 } });
    expect((await repository.query('SELECT COUNT(*) AS count FROM accounting_journal_entries'))[0].count).toBe(37);
    expect((await repository.querySource(source, { id: 'missing-entry', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    const page = yaml('pages/journal-entry-detail.yaml');
    const post = page.actions.find((action: any) => action.id === 'post_journal_entry');
    const reset = page.actions.find((action: any) => action.id === 'reset_journal_entry');
    expect(post.permission).toBe('accounting.write');
    expect(reset.permission).toBe('accounting.write');
    await expect(repository.executeMutation(post.mutation, { id: 'accounting-entry-demo-001' })).rejects.toMatchObject({ status: 409 });
    const created = await repository.executeMutation(yaml('api/journal-entries.yaml').actions[0].mutation, { values: { name: 'Draft Entry', journal: 'Miscellaneous', debit: 40, credit: 40 } });
    await repository.executeMutation(post.mutation, { id: created.id });
    expect(await repository.query('SELECT state FROM accounting_journal_entries WHERE id = ?', [created.id])).toEqual([{ state: 'Posted' }]);
    await repository.executeMutation(reset.mutation, { id: created.id });
    expect(await repository.query('SELECT state FROM accounting_journal_entries WHERE id = ?', [created.id])).toEqual([{ state: 'Draft' }]);
  });
});
