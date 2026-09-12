import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import EcommerceModule from '../services/ecommerce/module';
import { authorizePayment, createDelivery, recordCallback } from '../temporal/ecommerce-activities';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Checkout parity', () => {
  test('converts an anonymous cookie cart through guest checkout and clears the cookie', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_guest_checkout_test', ['schema', 'data']);
    const shopApi = yaml('api/shop.yaml');
    const add = shopApi.actions.find((action: any) => action.id === 'anonymous_shop_add_to_cart');
    await repository.executeMutation(add.mutation, { values: { cart_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001', line_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001-ecommerce-product-mug', product_id: 'ecommerce-product-mug' } });
    const checkoutApi = yaml('api/checkout.yaml');
    const guestCheckout = checkoutApi.actions.find((action: any) => action.id === 'anonymous_confirm_ecommerce_checkout');
    const order = await repository.executeMutation(guestCheckout.mutation, { values: { cart_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001', customer_name: 'Guest Buyer', customer_email: 'guest@example.com', shipping_address: '1 Guest Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(order).toMatchObject({ customer_id: null, customer_name: 'Guest Buyer', customer_email: 'guest@example.com', amount_total: 18, cart_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001' });
    expect((await repository.query('SELECT state FROM ecommerce_carts WHERE id = ?', ['ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001']))[0].state).toBe('Converted');
    await expect(repository.executeMutation(guestCheckout.mutation, { values: { cart_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001', customer_name: 'Guest Buyer', customer_email: 'guest@example.com', shipping_address: '1 Guest Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PUBLIC_CHECKOUT_CART_INVALID' });
    const calls: any[] = [];
    const module = new EcommerceModule();
    const service = { async call(operation: string, request: any) { calls.push({ operation, request }); return { id: 'ecommerce-order-checkout-anon', customer_email: request.values.customer_email }; } };
    const response = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/checkout', { method: 'POST', headers: { cookie: 'core3_ecommerce_cart=ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001', 'content-type': 'application/json' }, body: JSON.stringify({ customer_name: 'Guest Buyer', customer_email: 'guest@example.com', shipping_address: '1 Guest Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }) }), new URL('http://core3.test/api/public/ecommerce/checkout'), service);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(calls[0]).toMatchObject({ operation: 'ecommerce.checkout.anonymous_confirm', request: { values: { cart_id: 'ecommerce-cart-anon-a11ce000-0000-4000-8000-000000000001', customer_email: 'guest@example.com' } } });
    const missingCart = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/checkout', { method: 'POST', body: '{}' }), new URL('http://core3.test/api/public/ecommerce/checkout'), service);
    expect(missingCart.status).toBe(422);
    database.close();
  });

  test('enforces authenticated customer ownership at the HTTP query boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_http_scope_test', ['schema', 'data']);
    const source = yaml('api/orders.yaml').datasources[0];
    const checkoutApi = yaml('api/checkout.yaml');
    const confirm = checkoutApi.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout');
    const authUser = { sub: 'customer-user', email: 'hello@workspace.example', name: 'Workspace Buyer', company: { name: 'My Company' }, roles: ['customer'], permissions: ['ecommerce.read', 'ecommerce.write'] };
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
    expect((await (await request({ company_name: 'Other Company' })).json()).data.map((row: any) => row.company_name)).toEqual(['My Company']);
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
    expect(api.actions.find((action: any) => action.id === 'confirm_ecommerce_checkout').event).toBe('ecommerce.checkout.confirmed');
  });

  test('declares the Temporal payment and delivery boundary without hiding runtime requirements', () => {
    const contract = yaml('temporal/payment-delivery.yaml').workflow;
    expect(contract).toMatchObject({ id: 'ecommerce_payment_delivery', runtime: 'temporal', task_queue: 'core3-ecommerce', permission: 'ecommerce.write', trigger: 'ecommerce.checkout.confirmed' });
    expect(contract.input.required).toEqual(['order_id', 'payment_method', 'delivery_method']);
    expect(contract.activities.map((activity: any) => activity.id)).toEqual(['authorize_payment', 'create_delivery', 'record_callback', 'cancel_payment_and_release_delivery']);
    expect(contract.activities.every((activity: any) => activity.permission === 'ecommerce.write' && activity.idempotency_key)).toBe(true);
    expect(contract.callbacks.map((callback: any) => callback.activity)).toEqual(['record_callback', 'record_callback']);
    expect(contract.failure).toMatchObject({ compensation: 'cancel_payment_and_release_delivery', terminal_state: 'Integration Failed' });
  });

  test('records provider callbacks idempotently at the activity boundary', async () => {
    expect(await recordCallback({ callback_id: 'callback-ecommerce-001', order_id: 'ecommerce-order-001', status: 'Authorized' })).toEqual({ recorded: true });
    expect(await recordCallback({ callback_id: 'callback-ecommerce-001', order_id: 'ecommerce-order-001', status: 'Authorized' })).toEqual({ recorded: false });
  });

  test('keeps provider retry and compensation policy explicit', () => {
    const contract = yaml('temporal/payment-delivery.yaml').workflow;
    const payment = contract.activities.find((activity: any) => activity.id === 'authorize_payment');
    expect(payment.retryable_errors).toEqual(['PAYMENT_PROVIDER_UNAVAILABLE', 'PAYMENT_TIMEOUT']);
    expect(contract.retry.maximum_attempts).toBe(5);
    expect(contract.activities.find((activity: any) => activity.id === 'cancel_payment_and_release_delivery')).toMatchObject({ compensation: true, idempotency_key: 'order_id' });
  });

  test('uses configured provider adapters with idempotency keys', async () => {
    const requestBodies: unknown[] = [];
    const idempotencyKeys: string[] = [];
    const server = Bun.serve({ port: 0, async fetch(request) { idempotencyKeys.push(request.headers.get('idempotency-key') || ''); requestBodies.push(await request.json()); return Response.json({ state: 'Authorized', provider_reference: 'provider-payment-001' }); } });
    const previous = process.env.ECOMMERCE_PAYMENT_PROVIDER_URL;
    process.env.ECOMMERCE_PAYMENT_PROVIDER_URL = `http://127.0.0.1:${server.port}`;
    try {
      const result = await authorizePayment({ order_id: 'provider-adapter-order-001', payment_method: 'Wire Transfer', delivery_method: 'Standard Delivery' });
      expect(result).toEqual({ state: 'Authorized', provider_reference: 'provider-payment-001' });
      expect(requestBodies).toHaveLength(1);
      expect(idempotencyKeys).toEqual(['provider-adapter-order-001']);
      expect(requestBodies[0]).toMatchObject({ order_id: 'provider-adapter-order-001', payment_method: 'Wire Transfer' });
    } finally {
      if (previous === undefined) delete process.env.ECOMMERCE_PAYMENT_PROVIDER_URL;
      else process.env.ECOMMERCE_PAYMENT_PROVIDER_URL = previous;
      server.stop();
    }
    const deliveryServer = Bun.serve({ port: 0, fetch() { return Response.json({ state: 'Ready', tracking_reference: 'provider-delivery-001' }); } });
    const previousDelivery = process.env.ECOMMERCE_DELIVERY_PROVIDER_URL;
    process.env.ECOMMERCE_DELIVERY_PROVIDER_URL = `http://127.0.0.1:${deliveryServer.port}`;
    try {
      expect(await createDelivery({ order_id: 'provider-adapter-order-002', payment_method: 'Wire Transfer', delivery_method: 'Standard Delivery', payment_reference: 'provider-payment-002' })).toEqual({ state: 'Ready', tracking_reference: 'provider-delivery-001' });
    } finally {
      if (previousDelivery === undefined) delete process.env.ECOMMERCE_DELIVERY_PROVIDER_URL;
      else process.env.ECOMMERCE_DELIVERY_PROVIDER_URL = previousDelivery;
      deliveryServer.stop();
    }
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
