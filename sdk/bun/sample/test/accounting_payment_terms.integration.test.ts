import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/config-payment-terms.yaml').actions.find((candidate: any) => candidate.id === id)
  ?? yaml('api/payment-term-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Accounting Payment Terms Odoo configuration parity', () => {
  test('keeps list/detail layouts separate and joins API fragments by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/payment-terms.yaml');
    const detailPage = yaml('pages/payment-term-detail.yaml');
    const listApi = yaml('api/config-payment-terms.yaml');
    const detailApi = yaml('api/payment-term-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({ source: 'accounting_payment_terms', create_action: 'create_accounting_payment_term', row_open_action: 'view_accounting_payment_term' });
    expect(listPage.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'company']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_payment_term_detail', title_field: 'name', status_field: 'state' });
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.field)).toEqual(['name', 'company', 'description', 'early_discount', 'state']);
    expect(discovered.pageDatasources.get('payment-terms')).toContain('accounting_payment_terms');
    expect(discovered.pageDatasources.get('payment-term-detail')).toContain('accounting_payment_term_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/payment-terms', page: 'payment-terms', module: 'accounting' }),
      expect.objectContaining({ path: '/accounting/payment-term-detail', page: 'payment-term-detail', module: 'accounting' }),
    ]));
  });

  test('seeds the 11 Odoo terms and covers search, empty, detail, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_terms_states', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_terms_states', ['schema', 'data']);
    const source = yaml('api/config-payment-terms.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual([
      'Immediate Payment', '15 Days', '21 Days', '30 Days', '45 Days', 'End of Following Month',
      '10 Days after End of Next Month', '30% Now, Balance 60 Days', '2/7 Net 30', '90 days, on the 10th', '30% Advance End of Following Month',
    ]);
    expect((await repository.querySource(source, { q: 'following month', state: 'active', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['End of Following Month', '30% Advance End of Following Month']);
    expect((await repository.querySource(source, { q: 'No such term', state: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, state: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    const detail = yaml('api/payment-term-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'payment-term-2-7-net-30', fixture_state: null }, 0, 1)).data).toMatchObject({ name: '2/7 Net 30', company: 'My Company (San Francisco)', early_discount: true });
    expect((await repository.querySource(detail, { id: 'missing-payment-term', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'immediate', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PAYMENT_TERM_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces write permissions, CRUD, validation, duplicate, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_terms_crud', ['schema', 'data']);
    expect(action('view_accounting_payment_term').permission).toBe('accounting.read');
    for (const id of ['create_accounting_payment_term', 'edit_accounting_payment_term', 'archive_accounting_payment_term', 'restore_accounting_payment_term', 'delete_accounting_payment_term']) {
      expect(action(id).permission, id).toBe('accounting.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    const create = action('create_accounting_payment_term');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Wire Terms', company: 'My Company (San Francisco)', description: '45 days after invoice date', early_discount: false } });
    expect(created).toMatchObject({ name: 'Wire Terms', company: 'My Company (San Francisco)', description: '45 days after invoice date', state: 'Active', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', company: 'My Company (San Francisco)', description: 'Due on receipt' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PAYMENT_TERM_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Missing Rule', company: 'My Company (San Francisco)', description: ' ' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PAYMENT_TERM_RULE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'wire terms', company: 'My Company (San Francisco)', description: 'Duplicate' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_TERM_EXISTS' });

    const edit = action('edit_accounting_payment_term');
    expect(edit.mutation.concurrency.required).toBe(true);
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Wire Terms Updated', company: 'My Company (San Francisco)', description: '60 days after invoice date', early_discount: true, state: 'Active' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Wire Terms Updated', early_discount: true, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', company: 'My Company (San Francisco)', description: 'Due on receipt' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-payment-term', expected_row_version: 1, values: { name: 'Missing', company: 'My Company (San Francisco)', description: 'Due on receipt' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_PAYMENT_TERM_NOT_FOUND' });

    const archive = action('archive_accounting_payment_term');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { state: 'Archived' } });
    expect((await repository.querySource(yaml('api/config-payment-terms.yaml').datasources[0], { q: 'Wire Terms Updated', state: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ state: 'Archived' }]);
    const restore = action('restore_accounting_payment_term');
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Active' } });
    const remove = action('delete_accounting_payment_term');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(yaml('api/config-payment-terms.yaml').datasources[0], { q: 'Wire Terms Updated', state: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_PAYMENT_TERM_NOT_FOUND' });
    database.close();
  });
});
