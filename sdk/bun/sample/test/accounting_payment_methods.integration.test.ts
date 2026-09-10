import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/config-payment-methods.yaml').actions.find((candidate: any) => candidate.id === id)
  ?? yaml('api/payment-method-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Accounting Payment Methods Odoo action parity', () => {
  test('keeps list and form layout-only and joins page-owned APIs by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/payment-methods.yaml');
    const detailPage = yaml('pages/payment-method-detail.yaml');
    const listApi = yaml('api/config-payment-methods.yaml');
    const detailApi = yaml('api/payment-method-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('payment-methods')).toContain('accounting_payment_methods');
    expect(discovered.pageDatasources.get('payment-method-detail')).toContain('accounting_payment_method_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/accounting/payment-methods', page: 'payment-methods', module: 'accounting' }),
      expect.objectContaining({ path: '/accounting/payment-method-detail', page: 'payment-method-detail', module: 'accounting' }),
    ]));
    expect(listPage.components[0]).toMatchObject({ source: 'accounting_payment_methods', create_action: 'create_accounting_payment_method', row_open_action: 'view_accounting_payment_method' });
    expect(listPage.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'active', 'code']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'accounting_payment_method_detail', title_field: 'name', status_field: 'active' });
    expect(detailPage.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['Providers', 'Brands']);
  });

  test('seeds deterministic rows and supports search, empty, detail, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_methods_states', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_methods_states', ['schema', 'data']);
    const source = yaml('api/config-payment-methods.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Bank', 'Card', 'Cash']);
    expect((await repository.querySource(source, { q: 'bank', active: 'active', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Bank', code: 'bank', active: true }]);
    expect((await repository.querySource(source, { q: 'No such method', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PAYMENT_METHODS_UNAVAILABLE' });
    const detail = yaml('api/payment-method-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'bank', fixture_state: null }, 0, 1)).data).toMatchObject({ id: 'bank', name: 'Bank', code: 'bank', active: true });
    expect((await repository.querySource(detail, { id: 'missing-payment-method', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'bank', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PAYMENT_METHOD_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces permissioned create, update, archive, restore, delete, validation, duplicate, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_payment_methods_crud', ['schema', 'data']);
    for (const id of ['create_accounting_payment_method', 'edit_accounting_payment_method', 'archive_accounting_payment_method', 'restore_accounting_payment_method', 'delete_accounting_payment_method']) {
      expect(action(id).permission, id).toBe('accounting.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    const create = action('create_accounting_payment_method');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Wire Transfer', code: 'wire_transfer', countries: 'United States', currencies: 'USD' } });
    expect(created).toMatchObject({ name: 'Wire Transfer', code: 'wire_transfer', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'wire transfer', code: 'wire-duplicate' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_METHOD_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Code', code: 'wire transfer' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PAYMENT_METHOD_CODE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bank', code: 'other' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_METHOD_EXISTS' });

    const edit = action('edit_accounting_payment_method');
    expect(edit.mutation.concurrency.required).toBe(true);
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Wire Transfer Updated', code: 'wire_v2', active: true, countries: 'All countries', currencies: 'All currencies', providers: '', brands: '' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Wire Transfer Updated', code: 'wire_v2', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', code: 'stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-payment-method', expected_row_version: 1, values: { name: 'Missing', code: 'missing' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_PAYMENT_METHOD_NOT_FOUND' });

    const archive = action('archive_accounting_payment_method');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(yaml('api/config-payment-methods.yaml').datasources[0], { q: 'Wire Transfer Updated', active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false }]);
    const restore = action('restore_accounting_payment_method');
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(yaml('api/config-payment-methods.yaml').datasources[0], { q: 'Wire Transfer Updated', active: 'active', fixture_state: null }, 0, 50)).data).toMatchObject([{ active: true }]);
    const remove = action('delete_accounting_payment_method');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(yaml('api/config-payment-methods.yaml').datasources[0], { q: 'Wire Transfer Updated', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404 });
    database.close();
  });
});
