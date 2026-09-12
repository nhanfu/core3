import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/banks.yaml');
const detailApi = yaml('api/bank-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Base Banks parity', () => {
  test('binds the source-qualified Bank Accounts menu and joins page/API by page.id', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'people').items.find((item: any) => item.label === 'Configuration');
    const bankAccounts = config.children.find((item: any) => item.label === 'Bank Accounts');
    expect(bankAccounts.children).toContainEqual(expect.objectContaining({ path: '/base-banks', label: 'Banks', permission: 'base.reference.read' }));
    const page = yaml('pages/banks.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'banks', route: '/base-banks' });
    expect(api.page.id).toBe(page.page.id);
    expect(yaml('pages/bank-detail.yaml').page.id).toBe(detailApi.page.id);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('banks')).toEqual(['bank_active_states', 'banks']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-banks', page: 'banks', module: 'base' }),
      expect.objectContaining({ path: '/base-bank-detail', page: 'bank-detail', module: 'base' }),
    ]));
  });

  test('seeds deterministic Odoo-shaped banks with active, archived, search, empty, and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_banks_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_banks_test_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'banks');
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['bank-bnp', 'bank-ing']);
    expect((await repository.querySource(source, { q: 'BBRUB', active: null, fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'bank-ing', country: 'Belgium' })]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'bank-reserve', active: false })]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_BANKS_UNAVAILABLE' });
    expect((await repository.querySource(detailApi.datasources[0], { id: 'missing-bank', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('guards bank CRUD, archive/restore, permissions, duplicate, required, not-found, and stale writes', async () => {
    expect(action('create_bank')).toMatchObject({ permission: 'base.reference.write', operation: 'create', mutation: { required: ['name'] } });
    expect(action('edit_bank')).toMatchObject({ permission: 'base.reference.write', mutation: { concurrency: { required: true } } });
    expect(action('delete_bank')).toMatchObject({ permission: 'base.reference.write', operation: 'delete' });
    for (const id of ['archive_bank', 'unarchive_bank']) expect(action(id)).toMatchObject({ permission: 'base.reference.write', mutation: { concurrency: { required: true } } });
    expect(api.datasources[1].permission).toBe('base.reference.read');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_banks_crud_migrations', ['schema', 'data']);
    const create = await repository.executeMutation(action('create_bank').mutation, { values: { name: 'QA Bank', bic: 'QABKUS33' } });
    expect(create).toMatchObject({ name: 'QA Bank', active: true, row_version: 1 });
    await expect(repository.executeMutation(action('create_bank').mutation, { values: { name: 'qa bank' } })).rejects.toMatchObject({ status: 409, code: 'BASE_BANK_NAME_EXISTS' });
    await expect(repository.executeMutation(action('create_bank').mutation, { values: { name: '' } })).rejects.toMatchObject({ status: 400, message: 'name is required' });
    const edit = await repository.executeMutation(action('edit_bank').mutation, { id: create.id, expected_row_version: 1, values: { name: 'QA Bank Updated' } });
    expect(edit).toMatchObject({ name: 'QA Bank Updated', row_version: 2 });
    await expect(repository.executeMutation(action('edit_bank').mutation, { id: create.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(action('archive_bank').mutation, { id: create.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ active: false, row_version: 3 });
    await expect(repository.executeMutation(action('edit_bank').mutation, { id: create.id, expected_row_version: 3, values: { name: 'Archived' } })).rejects.toMatchObject({ status: 404, code: 'BASE_BANK_NOT_FOUND' });
    const restored = await repository.executeMutation(action('unarchive_bank').mutation, { id: create.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ active: true, row_version: 4 });
    await expect(repository.executeMutation(action('delete_bank').mutation, { id: 'missing-bank', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'BASE_BANK_NOT_FOUND' });
    await repository.executeMutation(action('delete_bank').mutation, { id: create.id, expected_row_version: 4 });
    database.close();
  });
});
