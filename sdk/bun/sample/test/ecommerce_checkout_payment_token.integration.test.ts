import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const migrations = join(root, 'migrations');

const checkoutValues = {
  cart_id: 'ecommerce-cart-open-001',
  customer_name: 'Acme Corporation',
  customer_email: 'buyer@acme.example',
  shipping_address: '1 Token Street',
  delivery_method: 'Standard Delivery',
  payment_method: 'Card',
  payment_token_id: 'ecommerce-payment-token-demo-card',
};

describe('eCommerce checkout payment-token selection parity', () => {
  test('traces Odoo token selection and keeps checkout page/API and transaction contracts separate', () => {
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/payment.py', 'utf8');
    const transaction = readFileSync('/home/nhanjs/projects/odoo/addons/payment/models/payment_transaction.py', 'utf8');
    const form = readFileSync('/home/nhanjs/projects/odoo/addons/payment/views/payment_form_templates.xml', 'utf8');
    const page = yaml('pages/checkout.yaml');
    const api = yaml('api/checkout.yaml');
    const transactions = yaml('api/payment-transactions.yaml');
    const confirm = api.actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout');

    expect(controller).toContain("kwargs.get('flow') == 'token'");
    expect(controller).toContain("'sale_order_id': order_id");
    expect(transaction).toContain('token_id = fields.Many2one');
    expect(form).toContain('allow_token_selection');
    expect(form).toContain('tokens_sudo');
    expect(form).toContain('selected_token_id');
    expect(page.page).toMatchObject({ id: 'ecommerce-checkout', route: '/ecommerce/checkout' });
    expect(api.page).toEqual({ id: 'ecommerce-checkout' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_checkout_payment_tokens')).toMatchObject({ permission: 'ecommerce.read' });
    expect(confirm).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.confirm' });
    expect(confirm.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'payment_token_id', options_source: 'ecommerce_checkout_payment_tokens' })]));
    expect(transactions.datasources[0].query).toContain('t.token_id');
  });

  test('lists only active customer tokens and persists a guarded token checkout transaction', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_checkout_token_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_checkout_token_test', ['schema', 'data']);
    const api = yaml('api/checkout.yaml');
    const tokens = api.datasources.find((source: any) => source.id === 'ecommerce_checkout_payment_tokens');
    const rows = (await repository.querySource(tokens, { cart_id: checkoutValues.cart_id, company_name: 'My Company', customer_scope: 'all', current_user_email: null }, 0, 50)).data;
    expect(rows).toEqual([{ value: checkoutValues.payment_token_id, label: 'Visa •••• 4242 - Demo Gateway' }]);

    const confirm = api.actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: { ...checkoutValues, payment_token_id: 'missing-token' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_PAYMENT_TOKEN_INVALID' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_orders WHERE cart_id = ?', [checkoutValues.cart_id]))[0].count).toBe(0);

    const order = await repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: checkoutValues }) as any;
    expect(order).toMatchObject({ id: 'ecommerce-order-checkout-ecommerce-cart-open-001', payment_method: 'Card' });
    expect(await repository.query('SELECT token_id, operation, state FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id]))
      .toEqual([{ token_id: checkoutValues.payment_token_id, operation: 'offline_token', state: 'pending' }]);
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_sales_handoffs WHERE ecommerce_order_id = ?', [order.id]))[0].count).toBe(1);
    await expect(repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: checkoutValues }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_CART_CLOSED' });
    database.close();
  });

  test('rejects a token from another customer or company without changing checkout state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_checkout_token_scope_test', ['schema', 'data']);
    await repository.run("INSERT INTO ecommerce_payment_tokens (id, idempotency_key, provider_code, provider_name, payment_method_code, payment_method_name, payment_details, provider_ref, customer_id, customer_name, customer_email, company_name, active, verified) VALUES ('ecommerce-payment-token-other', 'test:other-token', 'demo_gateway', 'Demo Gateway', 'card', 'Card', 'Visa •••• 9999', 'demo-token-9999', 'ecommerce-customer-002', 'Nguyen Workspace', 'hello@workspace.example', 'My Company', TRUE, TRUE)");
    const api = yaml('api/checkout.yaml');
    const confirm = api.actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout');
    await expect(repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: { ...checkoutValues, payment_token_id: 'ecommerce-payment-token-other' } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_PAYMENT_TOKEN_INVALID' });
    expect((await repository.query('SELECT state FROM ecommerce_carts WHERE id = ?', [checkoutValues.cart_id]))[0].state).toBe('Open');
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_orders WHERE cart_id = ?', [checkoutValues.cart_id]))[0].count).toBe(0);
    const hidden = (await repository.querySource(yaml('api/checkout.yaml').datasources.find((source: any) => source.id === 'ecommerce_checkout_payment_tokens'), { cart_id: checkoutValues.cart_id, company_name: 'Other Company', customer_scope: 'all', current_user_email: null }, 0, 50)).data;
    expect(hidden).toEqual([]);
    database.close();
  });

  test('preserves token linkage across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-checkout-token-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_checkout_token_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const confirm = yaml('api/checkout.yaml').actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout');
      const order = await repository.executeMutation(confirm.mutation, { current_company_name: 'My Company', values: checkoutValues }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT token_id, operation, state FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id]))
        .toEqual([{ token_id: checkoutValues.payment_token_id, operation: 'offline_token', state: 'pending' }]);
      expect(await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_orders WHERE cart_id = ?', [checkoutValues.cart_id])).toEqual([{ count: 1 }]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
