import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Bank Card',
  code: 'bank_card',
  sequence: 40,
  provider_names: 'Demo Gateway',
  supported_countries: 'All countries',
  supported_currencies: 'USD, EUR',
  support_manual_capture: 'full_only',
  support_refund: 'partial',
  active: true,
};

describe('eCommerce Payment Methods parity', () => {
  test('traces the Odoo settings action and keeps page/API contracts separate', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/payment-methods.yaml');
    const api = yaml('api/payment-methods.yaml');
    expect(manifest.menu.groups[2].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/payment-methods', label: 'Payment Methods', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-payment-methods', route: '/ecommerce/payment-methods' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_payment_methods_catalog', create_action: 'create_ecommerce_payment_method' });
    expect(api.page).toEqual({ id: 'ecommerce-payment-methods' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_payment_methods_catalog', 'ecommerce_payment_method_active']);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_payment_method',
      'edit_ecommerce_payment_method',
      'archive_ecommerce_payment_method',
      'restore_ecommerce_payment_method',
      'delete_ecommerce_payment_method',
    ]);
  });

  test('seeds primary methods and drives checkout options from durable active rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_payment_methods_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_payment_methods_contract_test', ['schema', 'data']);
    const api = yaml('api/payment-methods.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, primary_only: true, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Wire Transfer', 'Cash on Delivery', 'Card']);
    expect(rows.data[0]).toMatchObject({ code: 'wire_transfer', is_primary: true });
    expect((await repository.querySource(source, { q: 'card', active: null, primary_only: true, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Card']);
    expect((await repository.querySource(source, { q: null, active: null, primary_only: true, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, primary_only: true, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_PAYMENT_METHODS_UNAVAILABLE' });
    const checkout = yaml('api/checkout.yaml');
    const options = checkout.datasources.find((item: any) => item.id === 'ecommerce_payment_methods');
    expect((await repository.querySource(options, {}, 0, 50)).data.map((row: any) => row.value)).toEqual(['Wire Transfer', 'Cash on Delivery', 'Card']);
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_PAYMENT_METHODS_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_PAYMENT_METHODS_FORBIDDEN' });
    database.close();
  });

  test('covers permissioned CRUD, validation, archive, and optimistic concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_methods_crud_test', ['schema', 'data']);
    const api = yaml('api/payment-methods.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_payment_method');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_payment_method');
    const archive = api.actions.find((action: any) => action.id === 'archive_ecommerce_payment_method');
    const restore = api.actions.find((action: any) => action.id === 'restore_ecommerce_payment_method');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_payment_method');
    for (const action of [create, edit, archive, restore, remove]) expect(action.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: 'Bank Card', code: 'bank_card', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Duplicate code', code: 'bank_card' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_METHOD_CODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Invalid code', code: 'Bad Code' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_METHOD_CODE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: '', code: 'missing_name' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_METHOD_NAME_REQUIRED' });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Bank Card Updated' } }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Bank Card Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409 });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } }) as any;
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    expect((await repository.query('SELECT name FROM ecommerce_payment_methods WHERE active = TRUE AND primary_payment_method_id IS NULL ORDER BY sequence, name', [])).map((row: any) => row.name)).toEqual(['Wire Transfer', 'Cash on Delivery', 'Card']);
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } }) as any;
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4, values: {} });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_payment_methods WHERE id = ?', [created.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists custom methods and active checkout behavior across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-payment-methods-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_payment_methods_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/payment-methods.yaml').actions.find((action: any) => action.id === 'create_ecommerce_payment_method');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Wallet', code: 'restart_wallet', sequence: 5 } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, code, sequence FROM ecommerce_payment_methods WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Wallet', code: 'restart_wallet', sequence: 5 }]);
      const checkout = yaml('api/checkout.yaml').datasources.find((item: any) => item.id === 'ecommerce_payment_methods');
      expect((await secondRepository.querySource(checkout, {}, 0, 50)).data.map((row: any) => row.value)).toEqual(['Restart Wallet', 'Wire Transfer', 'Cash on Delivery', 'Card']);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
