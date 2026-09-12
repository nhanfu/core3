import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Checkout parity', () => {
  test('joins cart checkout navigation to a page/API-bound checkout form', () => {
    const cart = yaml('api/cart.yaml');
    const page = yaml('pages/checkout.yaml');
    const api = yaml('api/checkout.yaml');
    expect(cart.actions.find((action: any) => action.id === 'checkout_ecommerce_cart')).toMatchObject({ navigate_to: '/ecommerce/checkout', permission: 'ecommerce.write' });
    expect(page.page).toMatchObject({ id: 'ecommerce-checkout', route: '/ecommerce/checkout' });
    expect(api.page).toEqual({ id: 'ecommerce-checkout' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_checkout_cart' });
    expect(api.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout').params).toEqual({ cart_id: '{state.ecommerce_checkout_cart.id}' });
  });

  test('creates an order with copied lines and closes the cart atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_test', ['schema', 'data']);
    const api = yaml('api/checkout.yaml');
    const checkout = api.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    const order = await repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(order).toMatchObject({ customer_name: 'Acme Corporation', amount_total: 285, state: 'Quotation', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_order_lines WHERE order_id = ?', [order.id]))[0].count).toBe(2);
    expect((await repository.query('SELECT state FROM ecommerce_carts WHERE id = ?', ['ecommerce-cart-open-001']))[0].state).toBe('Converted');
    await expect(repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_CART_CLOSED' });
    database.close();
  });

  test('rejects invalid checkout input without creating an order', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_invalid_test', ['schema', 'data']);
    const api = yaml('api/checkout.yaml');
    const checkout = api.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'invalid', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_EMAIL_INVALID' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM ecommerce_orders WHERE order_number LIKE 'WEB/2026/%'", []))[0].count).toBe(3);
    database.close();
  });

  test('keeps company-scoped carts, customers, and orders isolated and migrations idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationRoot = join(root, 'migrations');
    await migrateDatabase(repository, migrationRoot, undefined, 'ecommerce_checkout_scope_test', ['schema', 'data']);
    await migrateDatabase(repository, migrationRoot, undefined, 'ecommerce_checkout_scope_test', ['schema', 'data']);
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_products'))[0].count).toBe(4);
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_orders'))[0].count).toBe(3);
    const cartApi = yaml('api/cart.yaml');
    const customerApi = yaml('api/customers.yaml');
    const orderApi = yaml('api/orders.yaml');
    const productApi = yaml('api/products.yaml');
    const pricelistApi = yaml('api/pricelists.yaml');
    expect((await repository.querySource(cartApi.datasources[0], { id: 'ecommerce-cart-open-001', company_name: 'Other Company', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(customerApi.datasources[0], { q: null, active: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(orderApi.datasources[0], { q: null, state: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(productApi.datasources[0], { q: null, published: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(pricelistApi.datasources[0], { q: null, active: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
