import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/bank-accounts.yaml').actions.find((candidate: any) => candidate.id === id)
  ?? yaml('api/bank-account-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Accounting Bank Accounts Odoo action parity', () => {
  test('keeps list/detail layouts separate and joins API fragments by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/bank-accounts.yaml');
    const detailPage = yaml('pages/bank-account-detail.yaml');
    const listApi = yaml('api/bank-accounts.yaml');
    const detailApi = yaml('api/bank-account-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({ source: 'accounting_bank_accounts', create_action: 'create_accounting_bank_account', row_open_action: 'view_accounting_bank_account' });
    expect(listPage.components[0].columns.map((column: any) => column.field)).toEqual(['account_number', 'bank_name', 'send_money']);
    expect(listPage.components[0].columns.slice(1).every((column: any) => column.mobile === true)).toBe(true);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_bank_account_detail', title_field: 'account_number' });
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.field)).toEqual(['account_number', 'clearing_number', 'account_holder', 'account_holder_name', 'bank_name', 'send_money', 'company', 'currency']);
    expect(discovered.pageDatasources.get('accounting-bank-accounts')).toContain('accounting_bank_accounts');
    expect(discovered.pageDatasources.get('accounting-bank-account-detail')).toContain('accounting_bank_account_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/bank-accounts', page: 'accounting-bank-accounts', module: 'accounting' }),
      expect.objectContaining({ path: '/accounting/bank-account-detail', page: 'accounting-bank-account-detail', module: 'accounting' }),
    ]));
  });

  test('seeds the six Odoo rows and covers search, empty, detail, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_bank_accounts_states', ['schema', 'data']);
    const source = yaml('api/bank-accounts.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.account_number)).toEqual([
      '60-16-13 31926819', 'BANK134567890', 'BE39 1031 2345 6719', 'SI56 1910 0000 0123 438', 'BE61 3101 2698 5517', 'BANK334567890',
    ]);
    expect((await repository.querySource(source, { q: 'BNP', fixture_state: null }, 0, 50)).data.map((row: any) => row.account_number)).toEqual(['BE39 1031 2345 6719', 'SI56 1910 0000 0123 438']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    const detail = yaml('api/bank-account-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'accounting-bank-account-003', fixture_state: null }, 0, 1)).data).toMatchObject({ account_number: 'BE39 1031 2345 6719', bank_name: 'BNP Paribas', account_holder: 'Wood Corner' });
    expect((await repository.querySource(detail, { id: 'missing-bank-account', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'accounting-bank-account-003', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_BANK_ACCOUNT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces write permissions, CRUD, validation, duplicate, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_bank_accounts_crud', ['schema', 'data']);
    expect(action('view_accounting_bank_account').permission).toBe('accounting.read');
    for (const id of ['create_accounting_bank_account', 'edit_accounting_bank_account', 'delete_accounting_bank_account']) {
      expect(action(id).permission, id).toBe('accounting.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    const create = action('create_accounting_bank_account');
    const created = await repository.executeMutation(create.mutation, { values: { account_number: 'QA-001', account_holder: 'QA Company', account_holder_name: 'QA Company', bank_name: 'Core3 Bank', send_money: true, company: 'My Company (San Francisco)', currency: 'USD', note: 'Focused test fixture' } });
    expect(created).toMatchObject({ id: 'accounting-bank-account-qa-001', account_number: 'QA-001', send_money: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { account_number: 'qa-001', account_holder: 'Duplicate', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_BANK_ACCOUNT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { account_number: ' ', account_holder: 'Missing', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_BANK_ACCOUNT_NUMBER_REQUIRED' });

    const edit = action('edit_accounting_bank_account');
    expect(edit.mutation.concurrency.required).toBe(true);
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { account_number: 'QA-001', account_holder: 'QA Company Updated', account_holder_name: 'QA Company Updated', bank_name: 'Core3 Bank', send_money: false, company: 'My Company (San Francisco)', currency: 'USD', note: 'Updated' } });
    expect(edited).toMatchObject({ id: created.id, account_holder: 'QA Company Updated', send_money: false, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { account_number: 'QA-001', account_holder: 'Stale', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-bank-account', expected_row_version: 1, values: { account_number: 'Missing', account_holder: 'Missing', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_BANK_ACCOUNT_NOT_FOUND' });
    const remove = action('delete_accounting_bank_account');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(sourceForList(), { q: 'QA-001', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_BANK_ACCOUNT_NOT_FOUND' });
    database.close();
  });
});

const sourceForList = () => yaml('api/bank-accounts.yaml').datasources[0];
