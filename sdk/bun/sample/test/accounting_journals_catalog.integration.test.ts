import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Accounting Journals Odoo configuration parity', () => {
  test('keeps list/detail layouts separate from page-owned API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/journals.yaml');
    const detail = yaml('pages/journal-detail.yaml');
    const listApi = yaml('api/config-journals.yaml');
    const detailApi = yaml('api/journal-detail.yaml');
    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(listApi.page.id).toBe(list.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(list.components[0]).toMatchObject({ source: 'accounting_journals', create_action: 'create_accounting_journal', row_open_action: 'view_accounting_journal', row_double_click_action: 'view_accounting_journal' });
    expect(list.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'journal_type', 'sequence_prefix', 'default_account']);
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_journal_detail', title_field: 'name', status_field: 'state' });
    expect(discovered.pageDatasources.get('journals')).toContain('accounting_journals');
    expect(discovered.pageDatasources.get('journal-detail')).toContain('accounting_journal_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/journals', page: 'journals', module: 'accounting' }),
      expect.objectContaining({ path: '/accounting/journal-detail', page: 'journal-detail', module: 'accounting' }),
    ]));
  });

  test('seeds the 12 Odoo rows and covers search, empty, detail, and transport boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_journals_catalog_states', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_journals_catalog_states', ['schema', 'data']);
    const source = yaml('api/config-journals.yaml').datasources[0];
    const rows = (await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data;
    expect(rows).toHaveLength(12);
    expect(rows.map((row: any) => row.name)).toEqual(['Sales', 'Purchases', 'Bank', 'Miscellaneous Operations', 'Exchange Difference', 'Cash Basis Taxes', 'Inventory Valuation', 'Point of Sale', 'Cash Furn. Shop', 'Cash Clothes Shop', 'Cash Bakery', 'Expense']);
    expect((await repository.querySource(source, { q: 'BNK1', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Bank', sequence_prefix: 'BNK1', default_account: 'Bank' }]);
    expect((await repository.querySource(source, { q: 'No such journal', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    const detail = yaml('api/journal-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'sales', fixture_state: null }, 0, 1)).data).toMatchObject({ id: 'sales', name: 'Sales', sequence_prefix: 'INV', default_account: 'Product Sales' });
    expect((await repository.querySource(detail, { id: 'missing-journal', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'sales', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_JOURNAL_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces permissioned CRUD, validation, duplicate, stale, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_journals_catalog_crud', ['schema', 'data']);
    const listApi = yaml('api/config-journals.yaml');
    const detailApi = yaml('api/journal-detail.yaml');
    for (const [file, id] of [['api/config-journals.yaml', 'create_accounting_journal'], ['api/journal-detail.yaml', 'edit_accounting_journal'], ['api/journal-detail.yaml', 'archive_accounting_journal'], ['api/journal-detail.yaml', 'restore_accounting_journal'], ['api/journal-detail.yaml', 'delete_accounting_journal']] as const) {
      expect(action(file, id).permission, id).toBe('accounting.write');
      expect(action(file, id).handler, id).toBe('yaml_mutation');
    }
    const create = listApi.actions.find((candidate: any) => candidate.id === 'create_accounting_journal');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Wire Journal', journal_type: 'Bank', sequence_prefix: 'WIRE', default_account: 'Bank', company: 'My Company (San Francisco)' } });
    expect(created).toMatchObject({ name: 'Wire Journal', journal_type: 'Bank', sequence_prefix: 'WIRE', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'wire journal', journal_type: 'Cash', company: 'My Company (San Francisco)' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_JOURNAL_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', journal_type: 'Cash' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_JOURNAL_NAME_REQUIRED' });
    const edit = detailApi.actions.find((candidate: any) => candidate.id === 'edit_accounting_journal');
    expect(edit.mutation.concurrency.required).toBe(true);
    await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Wire Journal Updated', journal_type: 'Bank', sequence_prefix: 'WIRE2', default_account: 'Bank', company: 'My Company (San Francisco)', currency: 'USD', sequence: 1000 } });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', journal_type: 'Bank' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-journal', expected_row_version: 1, values: { name: 'Missing', journal_type: 'Bank' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_JOURNAL_NOT_FOUND' });
    const archive = detailApi.actions.find((candidate: any) => candidate.id === 'archive_accounting_journal');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { state: 'Archived' } });
    const restore = detailApi.actions.find((candidate: any) => candidate.id === 'restore_accounting_journal');
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Active' } });
    const remove = detailApi.actions.find((candidate: any) => candidate.id === 'delete_accounting_journal');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404 });
    database.close();
  });
});
