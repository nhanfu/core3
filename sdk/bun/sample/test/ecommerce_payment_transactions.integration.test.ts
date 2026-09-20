import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

const checkoutValues = {
  cart_id: 'ecommerce-cart-open-001',
  customer_name: 'Acme Corporation',
  customer_email: 'buyer@acme.example',
  shipping_address: '1 Main Street',
  delivery_method: 'Standard Delivery',
  payment_method: 'Wire Transfer',
};

describe('eCommerce payment transaction parity', () => {
  test('traces the Odoo menu/action and keeps the page/API contracts separate', () => {
    const page = yaml('pages/payment-transactions.yaml');
    const api = yaml('api/payment-transactions.yaml');
    const manifest = yaml('manifest.yaml');
    const transition = action(api, 'set_ecommerce_payment_transaction_state');
    expect(page.page).toMatchObject({ id: 'ecommerce-payment-transactions', route: '/ecommerce/payment-transactions' });
    expect(api.page).toEqual({ id: 'ecommerce-payment-transactions' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_payment_transactions' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_payment_transactions', 'ecommerce_payment_transaction_states']);
    expect(transition).toMatchObject({ type: 'server_form', permission: 'ecommerce.write', action: 'ecommerce.payment_transactions.transition' });
    expect(transition.mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/payment-transactions', permission: 'ecommerce.read' })]));
  });

  test('creates one pending transaction per checkout and transitions it with company and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_transactions_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_transactions_test', ['schema', 'data']);
    const checkout = action(yaml('api/checkout.yaml'), 'confirm_ecommerce_checkout');
    const order = await repository.executeMutation(checkout.mutation, { values: checkoutValues, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' }) as any;
    const transaction = (await repository.query('SELECT * FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id]))[0];
    expect(transaction).toMatchObject({ order_id: order.id, reference: 'ECOM-TX-WEB-2026-0004', payment_method: 'Wire Transfer', state: 'pending', amount: 285, idempotency_key: 'checkout:ecommerce-cart-open-001', row_version: 1 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id])).toEqual([{ count: 1 }]);
    await expect(repository.executeMutation(checkout.mutation, { values: checkoutValues, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_CART_CLOSED' });

    const transition = action(yaml('api/payment-transactions.yaml'), 'set_ecommerce_payment_transaction_state');
    const authorized = await repository.executeMutation(transition.mutation, { id: transaction.id, expected_row_version: 1, current_company_name: 'My Company', values: { state: 'authorized', provider_reference: 'provider-0004', state_message: 'Authorized' } }) as any;
    expect(authorized).toMatchObject({ state: 'authorized', provider_reference: 'provider-0004', row_version: 2 });
    const done = await repository.executeMutation(transition.mutation, { id: transaction.id, expected_row_version: 2, current_company_name: 'My Company', values: { state: 'done', provider_reference: 'provider-0004', state_message: 'Captured' } }) as any;
    expect(done).toMatchObject({ state: 'done', row_version: 3 });
    await expect(repository.executeMutation(transition.mutation, { id: transaction.id, expected_row_version: 2, current_company_name: 'My Company', values: { state: 'cancel' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TRANSACTION_STALE' });
    await expect(repository.executeMutation(transition.mutation, { id: transaction.id, expected_row_version: 3, current_company_name: 'Other Company', values: { state: 'cancel' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TRANSACTION_STALE' });
    await expect(repository.executeMutation(transition.mutation, { id: transaction.id, expected_row_version: 3, current_company_name: 'My Company', values: { state: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_TRANSACTION_STATE_INVALID' });
    database.close();
  });

  test('persists the transaction and final state across a DuckDB restart', async () => {
    const path = `/tmp/core3-ecommerce-payment-transaction-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_payment_transaction_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const checkout = action(yaml('api/checkout.yaml'), 'confirm_ecommerce_checkout');
      const order = await repository.executeMutation(checkout.mutation, { values: checkoutValues, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' }) as any;
      const tx = (await repository.query('SELECT id, row_version FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id]))[0];
      const transition = action(yaml('api/payment-transactions.yaml'), 'set_ecommerce_payment_transaction_state');
      await repository.executeMutation(transition.mutation, { id: tx.id, expected_row_version: tx.row_version, current_company_name: 'My Company', values: { state: 'error', state_message: 'Provider unavailable' } });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT state, state_message, row_version FROM ecommerce_payment_transactions WHERE id = ?', [tx.id])).toEqual([{ state: 'error', state_message: 'Provider unavailable', row_version: 2 }]);
      second.close();
    } finally {
      try { const { unlinkSync } = await import('node:fs'); unlinkSync(path); } catch { /* DuckDB already removed the file */ }
    }
  });
});
