import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Checkout parity', () => {
  test('enforces authenticated customer ownership at the HTTP query boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_http_scope_test', ['schema', 'data']);
    const source = yaml('api/orders.yaml').datasources[0];
    const checkoutApi = yaml('api/checkout.yaml');
    const confirm = checkoutApi.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    const authUser = { sub: 'customer-user', email: 'hello@workspace.example', name: 'Workspace Buyer', roles: ['customer'], permissions: ['ecommerce.read', 'ecommerce.write'] };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return authUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([[source.id, source]]),
      pageSources: new Map(), pages: new Map([['ecommerce-checkout', { actions: [confirm] }]]), catalogs: new Map(), menus: new Map(),
      workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
      uploadRoot: '/tmp/core3-ecommerce-test-uploads', eventStore: {}, topics: {},
    });
    const request = (params: Record<string, unknown>) => api(new Request('http://core3.test/api/query', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: source.id, params, top: 50 }),
    }), new URL('http://core3.test/api/query'));
    expect((await (await request({ customer_id: 'ecommerce-customer-001' })).json()).data).toEqual([]);
    expect((await (await request({})).json()).data.map((row: any) => row.customer_email)).toEqual(['hello@workspace.example']);
    const mutationError = await api(new Request('http://core3.test/api/actions/ecommerce.checkout.confirm', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }),
    }), new URL('http://core3.test/api/actions/ecommerce.checkout.confirm')).catch(error => error);
    expect(mutationError).toMatchObject({ status: 403, code: 'ECOMMERCE_CHECKOUT_OWNERSHIP_REQUIRED' });
    database.close();
  });

  test('joins cart checkout navigation to a page/API-bound checkout form', () => {
    const cart = yaml('api/cart.yaml');
    const cartPage = yaml('pages/cart.yaml');
    const page = yaml('pages/checkout.yaml');
    const api = yaml('api/checkout.yaml');
    expect(cart.actions.find((action: any) => action.id === 'checkout_ecommerce_cart')).toMatchObject({ navigate_to: '/ecommerce/checkout', permission: 'ecommerce.write' });
    expect(cartPage.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'checkout_ecommerce_cart' })]));
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
    expect(order).toMatchObject({ customer_id: 'ecommerce-customer-001', customer_name: 'Acme Corporation', amount_total: 285, state: 'Quotation', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' });
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
    expect((await repository.querySource(cartApi.datasources[0], { id: 'ecommerce-cart-open-001', customer_id: 'ecommerce-customer-999', company_name: null, fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(customerApi.datasources[0], { q: null, active: null, customer_id: 'ecommerce-customer-999', company_name: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(orderApi.datasources[0], { q: null, state: null, customer_id: 'ecommerce-customer-999', company_name: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    const customerContext = { q: null, state: null, company_name: null, fixture_state: null, customer_id: 'ecommerce-customer-001', customer_scope: 'own', current_user_email: 'hello@workspace.example' };
    expect((await repository.querySource(orderApi.datasources[0], customerContext, 0, 50)).data).toEqual([]);
    const checkoutApi = yaml('api/checkout.yaml');
    const confirm = checkoutApi.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(confirm.mutation, {
      customer_scope: 'own', current_user_email: 'hello@workspace.example',
      values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' },
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_CHECKOUT_OWNERSHIP_REQUIRED' });
    expect((await repository.querySource(productApi.datasources[0], { q: null, published: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(pricelistApi.datasources[0], { q: null, active: null, company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
