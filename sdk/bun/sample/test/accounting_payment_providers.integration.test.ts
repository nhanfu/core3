import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const list = () => yaml('api/payment-providers.yaml');
const detail = () => yaml('api/payment-provider-detail.yaml');
const action = (id: string) => [...list().actions, ...detail().actions].find((item: any) => item.id === id);
const migrate = async (name: string) => { const db = await DuckDbDatabase.open(':memory:'); const repo = new YamlRepository(db); await migrateDatabase(repo, join(root, 'migrations'), undefined, name, ['schema', 'data']); return { db, repo }; };

describe('Accounting Payment Providers Odoo action parity', () => {
  test('joins layout pages and API fragments by page.id and exposes card/list/form states', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/payment-providers.yaml'); const form = yaml('pages/payment-provider-detail.yaml');
    expect(page.datasources).toBeUndefined(); expect(page.actions).toBeUndefined(); expect(form.datasources).toBeUndefined();
    expect(list().page.id).toBe(page.page.id); expect(detail().page.id).toBe(form.page.id);
    expect(discovered.pageDatasources.get('payment-providers')).toContain('accounting_payment_providers');
    expect(discovered.pageDatasources.get('payment-provider-detail')).toContain('accounting_payment_provider_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/payment-providers', page: 'payment-providers' }), expect.objectContaining({ path: '/accounting/payment-provider-detail', page: 'payment-provider-detail' })]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['card', 'list']);
    expect(page.components[0].views[0].card).toMatchObject({ actions: [{ id: 'install_accounting_payment_provider', label_field: 'action_label', variant: 'primary' }] });
    expect(page.components[0].create_action).toBeUndefined();
    expect(page.components[0].create_label).toBeUndefined();
    expect(form.components[0]).toMatchObject({ type: 'OdooFormView', avatar_field: 'logo_url' });
  });

  test('covers deterministic 24-row fixtures, search, empty, detail, and transport errors', async () => {
    const { db, repo } = await migrate('accounting_payment_providers_states'); const source = list().datasources[0];
    const rows = (await repo.querySource(source, { q: null, fixture_state: null }, 0, 50)).data;
    expect(rows).toHaveLength(24); expect(rows.slice(0, 3).map((row: any) => row.name)).toEqual(['SEPA Direct Debit', 'Wire Transfer', 'Demo']);
    expect((await repo.querySource(source, { q: 'stripe', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Stripe' }]);
    expect((await repo.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repo.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repo.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_PAYMENT_PROVIDERS_UNAVAILABLE' });
    expect((await repo.querySource(detail().datasources[0], { id: 'provider-wire', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Wire Transfer' });
    expect((await repo.querySource(detail().datasources[0], { id: 'missing-provider', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repo.querySource(detail().datasources[0], { id: 'provider-wire', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503 }); db.close();
  });

  test('enforces write permission declarations and CRUD validation, duplicate, stale, install, and missing guards', async () => {
    const { db, repo } = await migrate('accounting_payment_providers_crud');
    for (const id of ['create_accounting_payment_provider', 'edit_accounting_payment_provider', 'install_accounting_payment_provider', 'uninstall_accounting_payment_provider', 'delete_accounting_payment_provider']) expect(action(id).permission, id).toBe('accounting.write');
    const create = action('create_accounting_payment_provider'); const row = await repo.executeMutation(create.mutation, { values: { name: 'Test Gateway', provider_code: 'test_gateway' } }); expect(row).toMatchObject({ name: 'Test Gateway', active: true, installed: false });
    await expect(repo.executeMutation(create.mutation, { values: { name: 'test gateway' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_PAYMENT_PROVIDER_EXISTS' });
    await expect(repo.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_PAYMENT_PROVIDER_NAME_REQUIRED' });
    const edit = action('edit_accounting_payment_provider'); const edited = await repo.executeMutation(edit.mutation, { id: row.id, expected_row_version: 1, values: { name: 'Test Gateway Updated', company: 'My Company (San Francisco)', provider_code: 'test_gateway', description: '', website: '', logo_abbr: 'TG', logo_color: '%235b4f9b' } }); expect(edited).toMatchObject({ name: 'Test Gateway Updated', row_version: 2 });
    await expect(repo.executeMutation(edit.mutation, { id: row.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repo.executeMutation(edit.mutation, { id: 'missing-provider', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_PAYMENT_PROVIDER_NOT_FOUND' });
    await repo.executeMutation(action('install_accounting_payment_provider').mutation, { id: row.id, expected_row_version: 2, values: action('install_accounting_payment_provider').params.values }); expect((await repo.querySource(list().datasources[0], { q: 'Test Gateway Updated', fixture_state: null }, 0, 50)).data).toMatchObject([{ installed: true, state: 'Enabled' }]);
    await repo.executeMutation(action('uninstall_accounting_payment_provider').mutation, { id: row.id, expected_row_version: 3, values: action('uninstall_accounting_payment_provider').params.values }); await repo.executeMutation(action('delete_accounting_payment_provider').mutation, { id: row.id, expected_row_version: 4 }); await expect(repo.executeMutation(action('delete_accounting_payment_provider').mutation, { id: row.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404 }); db.close();
  });
});
