import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting secure entries parity', () => {
  test('joins the Closing menu, form layout, and API datasource by page id', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/secure-entries.yaml');
    const api = yaml('api/secure-entries.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'accounting').items.find((item: any) => item.path === '/accounting/secure-entries');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(menu).toMatchObject({ label: 'Secure Entries', permission: 'accounting.read' });
    expect(page.page).toMatchObject({ id: 'secure-entries', route: '/accounting/secure-entries' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ source: 'accounting_secure_entries', title_field: 'title', subtitle_field: 'instruction' });
    expect(form.header_actions.map((action: any) => action.id)).toEqual(['secure_accounting_entries', 'discard_secure_accounting_entries']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('secure-entries')).toEqual(['accounting_secure_entries']);
  });

  test('seeds the deterministic wizard state and guards the secure transition', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_secure_entries_schema_migrations', ['schema', 'data']);

    const api = yaml('api/secure-entries.yaml');
    const source = api.datasources[0];
    const action = api.actions.find((candidate: any) => candidate.id === 'secure_accounting_entries');
    const initial = await repository.querySource(source, {}, 0, 1);
    expect(initial.data).toMatchObject({
      id: 'secure-entries-state-001',
      hash_date: null,
      max_hash_date: '2026-01-14',
      entry_count: 9,
      state: 'Ready',
    });
    expect(source.permission).toBe('accounting.read');
    expect(action.permission).toBe('accounting.write');
    expect(action.mutation).toMatchObject({ operation: 'update', table: 'accounting_secure_entries', key_field: 'id' });

    const secured = await repository.executeMutation(action.mutation, {
      id: 'secure-entries-state-001',
      expected_row_version: 1,
      values: { hash_date: '2026-01-15' },
    });
    expect(secured).toMatchObject({ hash_date: '2026-01-15', state: 'Secured', secured_entries: 9, row_version: 2 });

    const extended = await repository.executeMutation(action.mutation, {
      id: 'secure-entries-state-001',
      expected_row_version: 2,
      values: { hash_date: '2026-01-15' },
    });
    expect(extended).toMatchObject({ hash_date: '2026-01-15', row_version: 3 });

    await expect(repository.executeMutation(action.mutation, {
      id: 'secure-entries-state-001',
      expected_row_version: 3,
      values: { hash_date: '2026-01-16' },
    })).rejects.toMatchObject({ status: 422 });
    await expect(repository.executeMutation(action.mutation, {
      id: 'secure-entries-state-001',
      expected_row_version: 2,
      values: { hash_date: '2026-01-15' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });
});
