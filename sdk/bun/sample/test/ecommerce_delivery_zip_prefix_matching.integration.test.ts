import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce delivery zip-prefix matching parity', () => {
  test('declares Odoo carrier assignment and postal-code-aware checkout contracts', () => {
    const odooCarrier = readFileSync('/home/nhanjs/projects/odoo/addons/delivery/models/delivery_carrier.py', 'utf8');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/delivery/views/delivery_carrier_views.xml', 'utf8');
    const page = yaml('pages/delivery-methods.yaml');
    const api = yaml('api/delivery-methods.yaml');
    const checkout = yaml('api/checkout.yaml');
    const checkoutPage = yaml('pages/checkout.yaml');
    expect(odooCarrier).toContain('zip_prefix_ids = fields.Many2many');
    expect(odooCarrier).toContain("if self.zip_prefix_ids:");
    expect(odooView).toContain('name="zip_prefix_ids"');
    expect(page.components[0].columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'zip_prefix_names', label: 'Zip Prefixes' }),
    ]));
    expect(api.datasources.map((source: any) => source.id)).toContain('ecommerce_delivery_zip_prefix_options');
    expect(api.actions.find((action: any) => action.id === 'create_ecommerce_delivery_method').fields)
      .toEqual(expect.arrayContaining([expect.objectContaining({ field: 'zip_prefix_ids', type: 'multi-select' })]));
    expect(checkout.datasources.find((source: any) => source.id === 'ecommerce_delivery_methods').query)
      .toContain('shipping_postal_code');
    expect(checkout.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout').mutation.guards
      .find((guard: any) => guard.code === 'ECOMMERCE_CHECKOUT_DELIVERY_INVALID').query)
      .toContain('regexp_matches');
    expect(checkoutPage.components[0].groups[1].fields)
      .toEqual(expect.arrayContaining([expect.objectContaining({ field: 'shipping_postal_code', label: 'Postal Code' })]));
  });

  test('persists assignments and filters delivery options using Odoo prefix matching', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_delivery_prefix_matching_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/delivery-methods.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_delivery_method');
    const values = {
      name: 'Metro Zip Delivery', sequence: 40, company_name: 'My Company', delivery_type: 'fixed',
      allow_cash_on_delivery: true, fixed_price: 12, margin: 0, fixed_margin: 0, free_over: false,
      free_over_amount: 1000, tracking_url: '', carrier_description: 'Metro service.', active: true,
      zip_prefix_ids: 'ecommerce-delivery-zip-prefix-100,ecommerce-delivery-zip-prefix-700-exact',
    };
    const created = await repository.executeMutation(create.mutation, { values, current_company_name: 'My Company' }) as any;
    expect(created).toMatchObject({ name: values.name, zip_prefix_ids: values.zip_prefix_ids });

    const catalog = api.datasources.find((source: any) => source.id === 'ecommerce_delivery_methods_catalog');
    const row = (await repository.querySource(catalog, { q: 'Metro', active: null, delivery_type: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data[0];
    expect(row).toMatchObject({ zip_prefix_ids: values.zip_prefix_ids, zip_prefix_names: '100, 700$' });
    const options = yaml('api/checkout.yaml').datasources.find((source: any) => source.id === 'ecommerce_delivery_methods');
    expect((await repository.querySource(options, { company_name: 'My Company', shipping_postal_code: '10099' }, 0, 50)).data.map((item: any) => item.value))
      .toContain('Metro Zip Delivery');
    expect((await repository.querySource(options, { company_name: 'My Company', shipping_postal_code: '700' }, 0, 50)).data.map((item: any) => item.value))
      .toContain('Metro Zip Delivery');
    expect((await repository.querySource(options, { company_name: 'My Company', shipping_postal_code: '701' }, 0, 50)).data.map((item: any) => item.value))
      .not.toContain('Metro Zip Delivery');
    database.close();
  });

  test('rejects a checkout delivery method when the postal code is outside assigned prefixes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_delivery_prefix_checkout_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const delivery = yaml('api/delivery-methods.yaml').actions.find((action: any) => action.id === 'create_ecommerce_delivery_method');
    await repository.executeMutation(delivery.mutation, { current_company_name: 'My Company', values: {
      name: 'Exact 700 Delivery', sequence: 40, company_name: 'My Company', delivery_type: 'fixed',
      allow_cash_on_delivery: true, fixed_price: 12, margin: 0, fixed_margin: 0, free_over: false,
      free_over_amount: 1000, tracking_url: '', carrier_description: '', active: true,
      zip_prefix_ids: 'ecommerce-delivery-zip-prefix-700-exact',
    } });
    const checkout = yaml('api/checkout.yaml').actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(checkout.mutation, { current_company_name: 'My Company', values: {
      cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example',
      shipping_address: '1 Main Street', shipping_postal_code: '701', delivery_method: 'Exact 700 Delivery', payment_method: 'Wire Transfer',
    } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_DELIVERY_INVALID' });
    database.close();
  });
});
