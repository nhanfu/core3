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

describe('eCommerce checkout account policy parity', () => {
  test('traces Odoo settings/action/source and pairs page and API contracts', () => {
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/checkout-account-policy.yaml');
    const page = yaml('pages/checkout-account-policy.yaml');
    const manifest = yaml('manifest.yaml');

    expect(settingsModel).toContain('account_on_checkout = fields.Selection');
    expect(settingsModel).toContain('compute="_compute_account_on_checkout"');
    expect(settingsModel).toContain('record.website_id.auth_signup_uninvited = \'b2c\'');
    expect(websiteModel).toContain("account_on_checkout = fields.Selection");
    expect(settingsView).toContain('id="checkout_registration_setting"');
    expect(settingsView).toContain('name="account_on_checkout"');
    expect(templates).toContain("website.account_on_checkout != 'mandatory'");
    expect(templates).toContain("website.account_on_checkout != 'disabled'");
    expect(page.page).toMatchObject({ id: 'ecommerce-checkout-account-policy', route: '/ecommerce/checkout-account-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-checkout-account-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_checkout_account_policy' });
    expect(action(api, 'edit_ecommerce_checkout_account_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.account_policy.update' });
    expect(action(api, 'edit_ecommerce_checkout_account_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/checkout-account-policy', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921190000-102-ecommerce-checkout-account-policy.yaml').version).toBe('0.0.102');
    expect(yaml('migrations/20260921191000-103-ecommerce-checkout-account-policy-demo.yaml').version).toBe('0.0.103');
  });

  test('updates a company policy with validation, permission scope, optimistic concurrency, and checkout enforcement', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_account_policy_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_checkout_account_policy_test', ['schema', 'data']);
    const api = yaml('api/checkout-account-policy.yaml');
    const checkoutApi = yaml('api/checkout.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_checkout_account_policy');
    const guestCheckout = action(checkoutApi, 'anonymous_confirm_ecommerce_checkout');

    expect(await repository.querySource(source, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject(
      expect.objectContaining({ company_name: 'My Company', account_on_checkout: 'optional', auth_signup_uninvited: 'b2c', checkout_behavior: 'Guest or account' }),
    );
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 1, values: { account_on_checkout: 'mandatory' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 1, values: { account_on_checkout: 'unsupported' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CHECKOUT_POLICY_INVALID' });
    const mandatory = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 1, values: { account_on_checkout: 'mandatory' } }) as any;
    expect(mandatory).toMatchObject({ row_version: 2, account_on_checkout: 'mandatory', auth_signup_uninvited: 'b2c', checkout_behavior: 'Sign in required' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 1, values: { account_on_checkout: 'disabled' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_POLICY_STALE' });

    const shopApi = yaml('api/shop.yaml');
    const add = action(shopApi, 'anonymous_shop_add_to_cart');
    const cartId = 'ecommerce-cart-anon-account-policy-001';
    await repository.executeMutation(add.mutation, { values: { cart_id: cartId, line_id: `${cartId}-ecommerce-product-mug`, product_id: 'ecommerce-product-mug' } });
    await expect(repository.executeMutation(guestCheckout.mutation, { values: { cart_id: cartId, customer_name: 'Policy Guest', customer_email: 'policy-guest@example.com', shipping_address: '1 Policy Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_CHECKOUT_ACCOUNT_REQUIRED' });
    const optional = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 2, values: { account_on_checkout: 'optional' } }) as any;
    expect(optional).toMatchObject({ row_version: 3, account_on_checkout: 'optional', auth_signup_uninvited: 'b2c' });
    const order = await repository.executeMutation(guestCheckout.mutation, { values: { cart_id: cartId, customer_name: 'Policy Guest', customer_email: 'policy-guest@example.com', shipping_address: '1 Policy Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(order).toMatchObject({ customer_id: null, cart_id: cartId, state: 'Quotation' });
    database.close();
  });

  test('persists the policy and signup mapping across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-checkout-account-policy-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_checkout_account_policy_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/checkout-account-policy.yaml');
      const edit = action(api, 'edit_ecommerce_checkout_account_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-checkout-account-policy-my-company', expected_row_version: 1, values: { account_on_checkout: 'disabled' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, account_on_checkout, auth_signup_uninvited, row_version FROM ecommerce_checkout_account_policies WHERE id = ?', ['ecommerce-checkout-account-policy-my-company'])).toEqual([
        { company_name: 'My Company', account_on_checkout: 'disabled', auth_signup_uninvited: 'b2b', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
