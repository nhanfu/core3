import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

const values = {
  id: 'ecommerce-payment-token-browser',
  idempotency_key: 'checkout-token:browser-001',
  provider_code: 'demo_gateway',
  payment_method_code: 'card',
  payment_details: 'Visa •••• 1111',
  provider_ref: 'demo-token-1111',
  customer_id: 'ecommerce-customer-001',
  customer_name: 'Acme Corporation',
  customer_email: 'hello@workspace.example',
  company_name: 'My Company',
  verified: true,
};

describe('eCommerce payment token parity', () => {
  test('traces Odoo technical menu/action and keeps page/API contracts separate', () => {
    const odooMenus = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/payment/views/payment_token_views.xml', 'utf8');
    const page = yaml('pages/payment-tokens.yaml');
    const api = yaml('api/payment-tokens.yaml');
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');

    expect(odooMenus).toContain('menu_ecommerce_payment_tokens');
    expect(odooMenus).toContain('action="payment.action_payment_token"');
    expect(odooMenus).toContain('groups="base.group_no_one"');
    expect(odooViews).toContain('<field name="payment_details"/>');
    expect(odooViews).toContain('<field name="provider_ref"/>');
    expect(odooViews).toContain('create="false" edit="false"');
    expect(page.page).toMatchObject({ id: 'ecommerce-payment-tokens', route: '/ecommerce/payment-tokens' });
    expect(api.page).toEqual({ id: 'ecommerce-payment-tokens' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_payment_tokens' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_payment_tokens', 'ecommerce_payment_token_active']);
    expect(configuration.items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/payment-tokens', permission: 'ecommerce.read' })]));
    expect(action(api, 'register_ecommerce_payment_token')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.payment_tokens.register' });
    expect(action(api, 'archive_ecommerce_payment_token').mutation.concurrency).toEqual({ required: true });
  });

  test('seeds masked tokens and enforces provider, method, customer, company, and idempotency guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_tokens_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_tokens_test', ['schema', 'data']);
    const api = yaml('api/payment-tokens.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, company_name: 'My Company', customer_scope: 'all', current_user_email: null, fixture_state: null }, 0, 50)).data).toMatchObject([
      expect.objectContaining({ id: 'ecommerce-payment-token-demo-card', payment_details: 'Visa •••• 4242', provider_code: 'demo_gateway', active: true }),
    ]);
    expect((await repository.querySource(source, { q: null, active: null, company_name: 'Other Company', customer_scope: 'all', current_user_email: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    const register = action(api, 'register_ecommerce_payment_token');
    const archive = action(api, 'archive_ecommerce_payment_token');
    await expect(repository.executeMutation(register.mutation, { current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PAYMENT_TOKEN_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(register.mutation, { current_company_name: 'My Company', values: { ...values, payment_details: '4111111111111111' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_TOKEN_DETAILS_INVALID' });
    await expect(repository.executeMutation(register.mutation, { current_company_name: 'My Company', values: { ...values, provider_code: 'core3_offline' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PAYMENT_TOKEN_PROVIDER_INVALID' });
    const created = await repository.executeMutation(register.mutation, { current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ id: values.id, provider_name: 'Demo Gateway', payment_method_name: 'Card', payment_details: values.payment_details, row_version: 1, active: true });
    const replay = await repository.executeMutation(register.mutation, { current_company_name: 'My Company', values: { ...values, payment_details: 'Visa •••• 9999' } }) as any;
    expect(replay).toMatchObject({ id: values.id, payment_details: values.payment_details, row_version: 1 });
    await expect(repository.executeMutation(archive.mutation, { id: values.id, expected_row_version: 1, current_company_name: 'Other Company', values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TOKEN_STALE' });
    const archived = await repository.executeMutation(archive.mutation, { id: values.id, expected_row_version: 1, current_company_name: 'My Company', values: { active: false } }) as any;
    expect(archived).toMatchObject({ id: values.id, active: false, row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: values.id, expected_row_version: 1, current_company_name: 'My Company', values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PAYMENT_TOKEN_STALE' });
    database.close();
  });

  test('keeps token ownership scoped to the authenticated customer query', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_payment_tokens_scope_test', ['schema', 'data']);
    const source = yaml('api/payment-tokens.yaml').datasources[0];
    const own = (await repository.querySource(source, { q: null, active: null, company_name: 'My Company', customer_scope: 'own', current_user_email: 'hello@workspace.example', fixture_state: null }, 0, 50)).data;
    const other = (await repository.querySource(source, { q: null, active: null, company_name: 'My Company', customer_scope: 'own', current_user_email: 'other@example.com', fixture_state: null }, 0, 50)).data;
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ customer_email: 'hello@workspace.example' });
    expect(other).toEqual([]);
    database.close();
  });

  test('persists registration and retirement across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-payment-token-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_payment_token_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const register = action(yaml('api/payment-tokens.yaml'), 'register_ecommerce_payment_token');
      const created = await repository.executeMutation(register.mutation, { current_company_name: 'My Company', values: { ...values, id: 'ecommerce-payment-token-restart', idempotency_key: 'checkout-token:restart-001' } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT id, provider_ref, active, row_version FROM ecommerce_payment_tokens WHERE id = ?', [created.id])).toEqual([{ id: 'ecommerce-payment-token-restart', provider_ref: 'demo-token-1111', active: true, row_version: 1 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
