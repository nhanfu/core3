import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce payment transaction post-processing parity', () => {
  test('traces the Odoo transaction menu/action and pairs the page/API contracts', () => {
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/payment/models/payment_transaction.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/payment/views/payment_transaction_views.xml', 'utf8');
    const api = yaml('api/payment-transactions.yaml');
    const page = yaml('pages/payment-transactions.yaml');
    const postProcess = action(api, 'post_process_ecommerce_payment_transaction');

    expect(menu).toContain('menu_ecommerce_payment_transactions');
    expect(menu).toContain('action="payment.action_payment_transaction"');
    expect(model).toContain('is_post_processed = fields.Boolean');
    expect(model).toContain('def action_post_process(self):');
    expect(model).toContain('self._post_process()');
    expect(model).toContain('self.is_post_processed = True');
    expect(view).toContain('name="action_post_process"');
    expect(view).toContain('invisible="is_post_processed"');
    expect(view).toContain('string="Post-process"');
    expect(model).toContain("'tag': 'soft_reload'");
    expect(page.page).toMatchObject({ id: 'ecommerce-payment-transactions', route: '/ecommerce/payment-transactions' });
    expect(api.page).toEqual({ id: 'ecommerce-payment-transactions' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_payment_transactions' });
    expect(postProcess).toMatchObject({ type: 'server', permission: 'ecommerce.write', action: 'ecommerce.payment_transactions.post_process' });
    expect(postProcess.mutation.concurrency).toEqual({ required: true });
    expect(page.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'is_post_processed' })]));
    const pageActions = page.components[0].columns.find((column: any) => column.field === 'actions').actions;
    expect(pageActions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'post_process_ecommerce_payment_transaction', show_if: "row.is_post_processed !== true" })]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921230000-110-ecommerce-payment-transaction-post-process.yaml').version).toBe('0.0.110');
    expect(yaml('migrations/20260921231000-111-ecommerce-payment-transaction-post-process-demo.yaml').version).toBe('0.0.111');
  });

  test('post-processes once with company/concurrency guards and resets on a later state transition', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_transaction_post_process_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_transaction_post_process_test', ['schema', 'data']);
    const api = yaml('api/payment-transactions.yaml');
    const postProcess = action(api, 'post_process_ecommerce_payment_transaction');
    const transition = action(api, 'set_ecommerce_payment_transaction_state');
    const source = api.datasources[0];

    expect((await repository.querySource(source, { q: null, state: null, company_name: 'My Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ is_post_processed: false, post_processed_at: null, state: 'done' });
    await expect(repository.executeMutation(postProcess.mutation, { id: 'ecommerce-payment-tx-001', expected_row_version: 1, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TRANSACTION_STALE' });
    const processed = await repository.executeMutation(postProcess.mutation, { id: 'ecommerce-payment-tx-001', expected_row_version: 1, current_company_name: 'My Company' }) as any;
    expect(processed).toMatchObject({ id: 'ecommerce-payment-tx-001', row_version: 2, is_post_processed: true });
    expect(processed.post_processed_at).toBeTruthy();
    await expect(repository.executeMutation(postProcess.mutation, { id: 'ecommerce-payment-tx-001', expected_row_version: 2, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TRANSACTION_ALREADY_POST_PROCESSED' });
    await expect(repository.executeMutation(postProcess.mutation, { id: 'ecommerce-payment-tx-001', expected_row_version: 1, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TRANSACTION_STALE' });

    const checkout = action(yaml('api/checkout.yaml'), 'confirm_ecommerce_checkout');
    const order = await repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' }) as any;
    const pending = (await repository.query('SELECT id, row_version FROM ecommerce_payment_transactions WHERE order_id = ?', [order.id]))[0];
    await repository.executeMutation(postProcess.mutation, { id: pending.id, expected_row_version: pending.row_version, current_company_name: 'My Company' });
    const authorized = await repository.executeMutation(transition.mutation, { id: pending.id, expected_row_version: pending.row_version + 1, current_company_name: 'My Company', values: { state: 'authorized', provider_reference: 'provider-post-process-001', state_message: 'Authorized' } }) as any;
    expect(authorized).toMatchObject({ state: 'authorized', is_post_processed: false, post_processed_at: null, row_version: pending.row_version + 2 });
    database.close();
  });

  test('persists post-processing across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-payment-post-process-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_payment_post_process_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/payment-transactions.yaml');
      const postProcess = action(api, 'post_process_ecommerce_payment_transaction');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(postProcess.mutation, { id: 'ecommerce-payment-tx-001', expected_row_version: 1, current_company_name: 'My Company' });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT is_post_processed, post_processed_at IS NOT NULL AS has_post_processed_at, row_version FROM ecommerce_payment_transactions WHERE id = ?', ['ecommerce-payment-tx-001'])).toEqual([{ is_post_processed: true, has_post_processed_at: true, row_version: 2 }]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
