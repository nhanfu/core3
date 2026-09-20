import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

const values = {
  name: 'Browser Provider',
  code: 'browser_provider',
  sequence: 30,
  state: 'test',
  is_published: true,
  company_name: 'My Company',
  payment_method_codes: 'card',
  allow_tokenization: true,
  capture_manually: 'full_only',
  allow_express_checkout: true,
  support_refund: 'full_only',
  maximum_amount: 500,
  available_countries: 'All countries',
  available_currencies: 'USD, EUR',
  pending_message: 'Pending',
  done_message: 'Done',
  cancel_message: 'Canceled',
};

describe('eCommerce payment provider parity', () => {
  test('traces the Odoo provider action and separates the page/API contracts', () => {
    const page = yaml('pages/payment-providers.yaml');
    const api = yaml('api/payment-providers.yaml');
    const manifest = yaml('manifest.yaml');
    const group = manifest.menu.groups.find((candidate: any) => candidate.id === 'configuration');
    expect(page.page).toMatchObject({ id: 'ecommerce-payment-providers', route: '/ecommerce/payment-providers' });
    expect(api.page).toEqual({ id: 'ecommerce-payment-providers' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_payment_providers', create_action: 'create_ecommerce_payment_provider' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_payment_providers', 'ecommerce_payment_provider_states', 'ecommerce_payment_provider_capture_modes', 'ecommerce_payment_provider_refund_modes']);
    expect(group.items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/payment-providers', permission: 'ecommerce.read' })]));
    expect(action(api, 'create_ecommerce_payment_provider')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.payment_providers.create' });
    expect(action(api, 'edit_ecommerce_payment_provider').mutation.concurrency).toEqual({ required: true });
  });

  test('seeds provider fixtures and enforces company, feature, and optimistic CRUD guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_payment_providers_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_payment_providers_test', ['schema', 'data']);
    const api = yaml('api/payment-providers.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { company_name: 'My Company', fixture_state: null }, 0, 50)).data).toMatchObject([
      expect.objectContaining({ code: 'core3_offline', state: 'enabled' }),
      expect.objectContaining({ code: 'demo_gateway', state: 'test', allow_tokenization: true }),
    ]);
    const create = action(api, 'create_ecommerce_payment_provider');
    const edit = action(api, 'edit_ecommerce_payment_provider');
    const archive = action(api, 'archive_ecommerce_payment_provider');
    const restore = action(api, 'restore_ecommerce_payment_provider');
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PAYMENT_PROVIDER_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { ...values, code: 'bad-code' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_PROVIDER_CODE_INVALID' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ name: values.name, code: values.code, state: values.state, row_version: 1 });
    const changed = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company', values: { ...values, name: 'Browser Provider Updated', state: 'enabled' } }) as any;
    expect(changed).toMatchObject({ name: 'Browser Provider Updated', state: 'enabled', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company', values })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_PROVIDER_STALE' });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Other Company', values: { state: 'disabled', is_published: false } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PAYMENT_PROVIDER_COMPANY_SCOPE_REQUIRED' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company', values: { state: 'disabled', is_published: false } }) as any;
    expect(archived).toMatchObject({ state: 'disabled', is_published: false, row_version: 3 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company', values: { state: 'test', is_published: true } }) as any;
    expect(restored).toMatchObject({ state: 'test', is_published: true, row_version: 4 });
    database.close();
  });

  test('persists a custom provider and state across a DuckDB restart', async () => {
    const path = `/tmp/core3-ecommerce-payment-provider-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_payment_provider_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const api = yaml('api/payment-providers.yaml');
      const create = action(api, 'create_ecommerce_payment_provider');
      const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { ...values, code: 'restart_provider' } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(path);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT code, state, allow_tokenization, row_version FROM ecommerce_payment_providers WHERE id = ?', [created.id])).toEqual([{ code: 'restart_provider', state: 'test', allow_tokenization: true, row_version: 1 }]);
      second.close();
    } finally {
      try { const { unlinkSync } = await import('node:fs'); unlinkSync(path); } catch { /* DuckDB already removed the file */ }
    }
  });
});
