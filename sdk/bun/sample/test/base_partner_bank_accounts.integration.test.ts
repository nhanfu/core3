import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/partner-bank-accounts.yaml');
const detailApi = yaml('api/partner-bank-account-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Base partner bank accounts parity', () => {
  test('binds the source action and keeps page/API ownership separate', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'people').items.find((item: any) => item.label === 'Configuration');
    const bankAccounts = config.children.find((item: any) => item.label === 'Bank Accounts');
    expect(bankAccounts.children).toContainEqual(expect.objectContaining({ path: '/base-partner-bank-accounts', label: 'Bank Accounts', permission: 'base.reference.read' }));
    const page = yaml('pages/partner-bank-accounts.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'partner-bank-accounts', route: '/base-partner-bank-accounts' });
    expect(page.components[0].empty_state).toEqual({
      title: 'Create a Bank Account',
      description: 'From here you can manage all bank accounts linked to you and your contacts.',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(yaml('pages/partner-bank-account-detail.yaml').page.id).toBe(detailApi.page.id);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('partner-bank-accounts')).toEqual(['partner_bank_account_active_states', 'partner_bank_account_partners', 'partner_bank_account_banks', 'partner_bank_accounts']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-partner-bank-accounts', page: 'partner-bank-accounts', module: 'base' }),
      expect.objectContaining({ path: '/base-partner-bank-account-detail', page: 'partner-bank-account-detail', module: 'base' }),
    ]));
  });

  test('seeds deterministic normal and archived records with search, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_partner_bank_accounts_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_partner_bank_accounts_test_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'partner_bank_accounts');
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'partner-bank-demo', active: true })]);
    expect((await repository.querySource(source, { q: 'BE685', active: null, fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'partner-bank-demo', partner_name: 'Core3 Demo Company' })]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'partner-bank-archived' })]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_PARTNER_BANK_ACCOUNTS_UNAVAILABLE' });
    expect((await repository.querySource(detailApi.datasources[0], { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('guards CRUD, archive/restore, relation validity, permissions, duplicate and stale writes', async () => {
    expect(action('create_partner_bank_account')).toMatchObject({ permission: 'base.reference.write', operation: 'create', mutation: { required: ['acc_number', 'partner_id'] } });
    expect(action('edit_partner_bank_account')).toMatchObject({ permission: 'base.reference.write', mutation: { concurrency: { required: true } } });
    expect(action('delete_partner_bank_account')).toMatchObject({ permission: 'base.reference.write', operation: 'delete' });
    for (const id of ['archive_partner_bank_account', 'unarchive_partner_bank_account']) expect(action(id)).toMatchObject({ permission: 'base.reference.write', mutation: { concurrency: { required: true } } });
    expect(api.datasources[3].permission).toBe('base.reference.read');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_partner_bank_accounts_crud_migrations', ['schema', 'data']);
    const create = await repository.executeMutation(action('create_partner_bank_account').mutation, { values: { acc_number: 'QA-001', partner_id: 'contact-demo', partner_name: 'Demo Contact' } });
    expect(create).toMatchObject({ acc_number: 'QA-001', active: true, row_version: 1 });
    await expect(repository.executeMutation(action('create_partner_bank_account').mutation, { values: { acc_number: 'qa-001', partner_id: 'contact-demo' } })).rejects.toMatchObject({ status: 409, code: 'BASE_PARTNER_BANK_ACCOUNT_EXISTS' });
    await expect(repository.executeMutation(action('create_partner_bank_account').mutation, { values: { acc_number: '', partner_id: 'contact-demo' } })).rejects.toMatchObject({ status: 422, code: 'BASE_PARTNER_BANK_ACCOUNT_REQUIRED' });
    await expect(repository.executeMutation(action('create_partner_bank_account').mutation, { values: { acc_number: 'QA-002', partner_id: 'missing' } })).rejects.toMatchObject({ status: 422, code: 'BASE_PARTNER_BANK_ACCOUNT_PARTNER_INVALID' });
    const edit = await repository.executeMutation(action('edit_partner_bank_account').mutation, { id: create.id, expected_row_version: 1, values: { acc_number: 'QA-001-UPDATED', partner_id: 'contact-demo' } });
    expect(edit).toMatchObject({ acc_number: 'QA-001-UPDATED', row_version: 2 });
    await expect(repository.executeMutation(action('edit_partner_bank_account').mutation, { id: create.id, expected_row_version: 1, values: { acc_number: 'Stale', partner_id: 'contact-demo' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(action('archive_partner_bank_account').mutation, { id: create.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ active: false, row_version: 3 });
    const restored = await repository.executeMutation(action('unarchive_partner_bank_account').mutation, { id: create.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ active: true, row_version: 4 });
    await expect(repository.executeMutation(action('delete_partner_bank_account').mutation, { id: 'missing', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'BASE_PARTNER_BANK_ACCOUNT_NOT_FOUND' });
    await repository.executeMutation(action('delete_partner_bank_account').mutation, { id: create.id, expected_row_version: 4 });
    database.close();
  });
});
