import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const migrations = join(root, 'migrations');
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce checkout customer address parity', () => {
  test('traces Odoo address management and keeps checkout page/API contracts separate', () => {
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const partner = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_partner.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const page = yaml('pages/checkout.yaml');
    const api = yaml('api/checkout.yaml');

    expect(controller).toContain("'/shop/address'");
    expect(controller).toContain('def shop_address');
    expect(controller).toContain('def shop_address_submit');
    expect(controller).toContain('def shop_update_address');
    expect(partner).toContain('_get_frontend_writable_fields');
    expect(templates).toContain('Address Management');
    expect(templates).toContain('address_on_checkout');
    expect(page.page).toMatchObject({ id: 'ecommerce-checkout', route: '/ecommerce/checkout' });
    expect(api.page).toEqual({ id: 'ecommerce-checkout' });
    expect(page.components.find((component: any) => component.source === 'ecommerce_checkout_addresses'))
      .toMatchObject({ type: 'ListView', create_action: 'create_ecommerce_checkout_address' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_checkout_addresses')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'confirm_ecommerce_checkout').fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'shipping_address_id', options_source: 'ecommerce_checkout_addresses' }),
    ]));
    expect(action(api, 'create_ecommerce_checkout_address')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.address.create' });
    expect(action(api, 'edit_ecommerce_checkout_address')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.address.update' });
    expect(action(api, 'archive_ecommerce_checkout_address')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.address.archive' });
  });

  test('filters owned addresses, validates CRUD boundaries, and applies a saved address at checkout', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_checkout_customer_address_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_checkout_customer_address_test', ['schema', 'data']);
    const api = yaml('api/checkout.yaml');
    const addresses = api.datasources.find((source: any) => source.id === 'ecommerce_checkout_addresses');
    const seeded = (await repository.querySource(addresses, { cart_id: 'ecommerce-cart-open-001', company_name: 'My Company', customer_scope: 'all', current_user_email: null }, 0, 20)).data;
    expect(seeded).toMatchObject([
      { id: 'ecommerce-address-acme-billing', address_type: 'billing', label: 'Acme Billing' },
      { id: 'ecommerce-address-acme-hq', address_type: 'delivery', label: 'Acme HQ' },
    ]);
    expect((await repository.querySource(addresses, { cart_id: 'ecommerce-cart-open-001', company_name: 'Other Company', customer_scope: 'all', current_user_email: null }, 0, 20)).data).toEqual([]);

    const create = action(api, 'create_ecommerce_checkout_address');
    const values = { address_type: 'delivery', label: 'Warehouse', recipient_name: 'Acme Warehouse', street: '42 Checkout Street', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US', is_default: false };
    await expect(repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_CHECKOUT_ADDRESS_OWNERSHIP_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { ...values, address_type: 'pickup' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_ADDRESS_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { ...values, label: 'Acme HQ' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_ADDRESS_EXISTS' });

    const created = await repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ customer_id: 'ecommerce-customer-001', label: 'Warehouse', address_type: 'delivery', company_name: 'My Company', row_version: 1 });
    const update = action(api, 'edit_ecommerce_checkout_address');
    await expect(repository.executeMutation(update.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { ...values, id: created.id, expected_row_version: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_ADDRESS_STALE' });
    const updated = await repository.executeMutation(update.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { ...values, id: created.id, expected_row_version: 1, city: 'Dallas' } }) as any;
    expect(updated).toMatchObject({ id: created.id, city: 'Dallas', row_version: 2 });
    const archive = action(api, 'archive_ecommerce_checkout_address');
    expect(await repository.executeMutation(archive.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { id: created.id, expected_row_version: 2 } })).toEqual({ archived: true, id: created.id });
    expect((await repository.querySource(addresses, { cart_id: 'ecommerce-cart-open-001', company_name: 'My Company', customer_scope: 'all', current_user_email: null }, 0, 20)).data.map((row: any) => row.id)).not.toContain(created.id);

    const selected = await repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { ...values, label: 'Checkout Selected' } }) as any;
    const confirm = action(api, 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: 'Fallback Address', shipping_address_id: 'missing-address', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_ADDRESS_INVALID' });
    const order = await repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: 'Fallback Address', shipping_address_id: selected.id, delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(order).toMatchObject({ id: 'ecommerce-order-checkout-ecommerce-cart-open-001', shipping_address: 'Acme Warehouse, 42 Checkout Street, Austin, TX 78701, US' });
    database.close();
  });

  test('preserves customer addresses across DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-customer-address-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_customer_address_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const create = action(yaml('api/checkout.yaml'), 'create_ecommerce_checkout_address');
      const created = await repository.executeMutation(create.mutation, { cart_id: 'ecommerce-cart-open-001', current_company_name: 'My Company', values: { address_type: 'billing', label: 'Restart Billing', recipient_name: 'Acme Corporation', street: '9 Durable Avenue', city: 'Denver', state: 'CO', postal_code: '80202', country: 'US', is_default: false } }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT customer_id, address_type, label, city, row_version FROM ecommerce_customer_addresses WHERE id = ?', [created.id]))
        .toEqual([{ customer_id: 'ecommerce-customer-001', address_type: 'billing', label: 'Restart Billing', city: 'Denver', row_version: 1 }]);
      expect((await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_customer_addresses WHERE customer_id = ?', ['ecommerce-customer-001']))[0].count).toBe(3);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
