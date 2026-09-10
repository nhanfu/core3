import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Multi-Ledger parity', () => {
  test('joins the menu, layout, and API datasource by page id', () => {
    const page = yaml('pages/multi-ledger.yaml');
    const api = yaml('api/multi-ledger.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((candidate: any) => candidate.id === 'accounting_journal_groups');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_accounting_journal_group');

    expect(page.page).toMatchObject({ id: 'multi-ledger', route: '/accounting/multi-ledger' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: source.id, create_action: create.id, create_label: 'New' });
    expect(list.columns.map((column: any) => column.field)).toEqual(['name', 'excluded_journals', 'company']);
    expect(list.empty_state).toMatchObject({ title: expect.stringContaining('multiple accounting standards') });
    expect(source.permission).toBe('accounting.read');
    expect(create.permission).toBe('accounting.write');
    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'accounting_journal_groups' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('multi-ledger')).toContain(source.id);
  });

  test('starts empty like Odoo and supports unique journal-group creation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_multi_ledger_schema_migrations', ['schema', 'data']);
    const api = yaml('api/multi-ledger.yaml');
    const source = api.datasources[0];
    const create = api.actions[0];

    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    const created = await repository.executeMutation(create.mutation, { values: { name: 'IFRS', company: 'My Company (San Francisco)' } });
    expect(created).toMatchObject({ name: 'IFRS', company: 'My Company (San Francisco)', excluded_journals: '', sequence: 10 });
    expect((await repository.querySource(source, { q: 'IFRS', fixture_state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ name: 'IFRS', company: 'My Company (San Francisco)' }),
    ]);
    let duplicateError: unknown;
    try {
      await repository.executeMutation(create.mutation, { values: { name: 'IFRS', company: 'My Company (San Francisco)' } });
    } catch (error) {
      duplicateError = error;
    }
    expect(duplicateError).toMatchObject({ status: 409 });
  });
});
