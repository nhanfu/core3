import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const values = {
  name: 'Same Day Delivery',
  sequence: 5,
  company_name: null,
  delivery_type: 'fixed',
  allow_cash_on_delivery: true,
  fixed_price: 25,
  margin: 0,
  fixed_margin: 0,
  free_over: false,
  free_over_amount: 1000,
  tracking_url: 'https://tracking.example/same-day/<shipmenttrackingnumber>',
  carrier_description: 'Same day local delivery.',
  active: true,
};

describe('eCommerce Delivery Methods parity', () => {
  test('traces the Odoo delivery action and keeps page/API contracts separate', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/delivery-methods.yaml');
    const api = yaml('api/delivery-methods.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/delivery-methods', label: 'Delivery Methods', permission: 'ecommerce.read' }),
    ]));
    expect(page.page).toMatchObject({ id: 'ecommerce-delivery-methods', route: '/ecommerce/delivery-methods' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_delivery_methods_catalog', create_action: 'create_ecommerce_delivery_method' });
    expect(api.page).toEqual({ id: 'ecommerce-delivery-methods' });
    expect(api.datasources.map((source: any) => source.id)).toEqual([
      'ecommerce_delivery_methods_catalog',
      'ecommerce_delivery_zip_prefix_options',
      'ecommerce_delivery_method_active',
      'ecommerce_delivery_method_type',
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_delivery_method',
      'edit_ecommerce_delivery_method',
      'archive_ecommerce_delivery_method',
      'restore_ecommerce_delivery_method',
      'delete_ecommerce_delivery_method',
    ]);
  });

  test('seeds company-scoped carriers and drives checkout delivery options', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_delivery_methods_contract_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_delivery_methods_contract_test', ['schema', 'data']);
    const api = yaml('api/delivery-methods.yaml');
    const source = api.datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, delivery_type: null, company_name: 'My Company', fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Standard Delivery', 'Express Delivery', 'Local Pickup']);
    expect(rows.data[0]).toMatchObject({ company_name: null, delivery_type: 'fixed', fixed_price: 5, allow_cash_on_delivery: true });
    expect((await repository.querySource(source, { q: 'express', active: null, delivery_type: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Express Delivery']);
    expect((await repository.querySource(source, { q: null, active: null, delivery_type: 'base_on_rule', company_name: 'My Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, delivery_type: null, company_name: 'My Company', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, delivery_type: null, company_name: 'My Company', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_DELIVERY_METHODS_UNAVAILABLE' });
    const checkout = yaml('api/checkout.yaml');
    const options = checkout.datasources.find((item: any) => item.id === 'ecommerce_delivery_methods');
    expect((await repository.querySource(options, { company_name: 'Other Company' }, 0, 50)).data.map((row: any) => row.value)).toEqual(['Standard Delivery', 'Express Delivery']);
    const confirm = checkout.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(confirm.mutation, {
      current_company_name: 'My Company',
      values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Local Pickup', payment_method: 'Cash on Delivery' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_CASH_ON_DELIVERY_UNSUPPORTED' });
    expect(source.permission).toBe('ecommerce.read');
    expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: 'ECOMMERCE_DELIVERY_METHODS_UNAUTHENTICATED' });
    expect(source.error_states.forbidden).toMatchObject({ status: 403, code: 'ECOMMERCE_DELIVERY_METHODS_FORBIDDEN' });
    database.close();
  });

  test('covers permissioned CRUD, validation, company scope, archive, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_delivery_methods_crud_test', ['schema', 'data']);
    const api = yaml('api/delivery-methods.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_delivery_method');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_delivery_method');
    const archive = api.actions.find((action: any) => action.id === 'archive_ecommerce_delivery_method');
    const restore = api.actions.find((action: any) => action.id === 'restore_ecommerce_delivery_method');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_delivery_method');
    for (const action of [create, edit, archive, restore, remove]) expect(action.permission).toBe('ecommerce.write');
    const created = await repository.executeMutation(create.mutation, { values, current_company_name: 'My Company' }) as any;
    expect(created).toMatchObject({ name: 'Same Day Delivery', row_version: 1, company_name: null, fixed_price: 25 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Invalid Type', delivery_type: 'carrier_api' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_DELIVERY_METHOD_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Invalid Price', fixed_price: -1 }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_DELIVERY_METHOD_PRICE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Other Company Carrier', company_name: 'Other Company' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_COMPANY_SCOPE_REQUIRED' });
    const companyCarrier = await repository.executeMutation(create.mutation, { values: { ...values, name: 'Company Same Day', company_name: 'My Company' }, current_company_name: 'My Company' }) as any;
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Company Same Day', company_name: 'My Company' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_DELIVERY_METHOD_EXISTS' });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Same Day Updated' }, current_company_name: 'My Company' }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Same Day Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale' }, current_company_name: 'My Company' }))
      .rejects.toMatchObject({ status: 409 });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } }) as any;
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } }) as any;
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await repository.executeMutation(remove.mutation, { id: companyCarrier.id, expected_row_version: 1, values: {} });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_delivery_methods WHERE id = ?', [companyCarrier.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists delivery methods and checkout availability across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-delivery-methods-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_delivery_methods_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/delivery-methods.yaml').actions.find((action: any) => action.id === 'create_ecommerce_delivery_method');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { values: { ...values, name: 'Restart Courier', sequence: 5 }, current_company_name: 'My Company' }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT name, sequence, fixed_price FROM ecommerce_delivery_methods WHERE id = ?', [created.id]))
        .toEqual([{ name: 'Restart Courier', sequence: 5, fixed_price: 25 }]);
      const checkout = yaml('api/checkout.yaml').datasources.find((item: any) => item.id === 'ecommerce_delivery_methods');
      expect((await secondRepository.querySource(checkout, { company_name: 'Other Company' }, 0, 50)).data.map((row: any) => row.value)).toEqual(['Restart Courier', 'Standard Delivery', 'Express Delivery']);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
