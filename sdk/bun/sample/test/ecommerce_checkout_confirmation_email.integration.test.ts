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

describe('eCommerce confirmation email template parity', () => {
  test('traces the Odoo settings/order override and pairs the configuration page/API', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const orderModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/sale_order.py', 'utf8');
    const api = yaml('api/confirmation-email-policy.yaml');
    const page = yaml('pages/confirmation-email-policy.yaml');
    const orders = yaml('api/orders.yaml');
    const orderDetail = yaml('api/order-detail.yaml');
    const checkout = yaml('api/checkout.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('def _default_confirmation_email_template');
    expect(websiteModel).toContain('confirmation_email_template_id = fields.Many2one');
    expect(websiteModel).toContain("domain=[('model', '=', 'sale.order')]");
    expect(settingsModel).toContain("related='website_id.confirmation_email_template_id'");
    expect(settingsView).toContain('id="order_confirmation_setting"');
    expect(settingsView).toContain('name="confirmation_email_template_id"');
    expect(orderModel).toContain('def _get_confirmation_template(self)');
    expect(orderModel).toContain('self.website_id.confirmation_email_template_id');
    expect(page.page).toMatchObject({ id: 'ecommerce-confirmation-email-policy', route: '/ecommerce/confirmation-email-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-confirmation-email-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_confirmation_email_policy' });
    expect(action(api, 'edit_ecommerce_confirmation_email_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.confirmation_email_policy.update' });
    expect(action(api, 'edit_ecommerce_confirmation_email_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/confirmation-email-policy', permission: 'ecommerce.read' }),
    ]));
    expect(orders.datasources[0].query).toContain('confirmation_email_template_name');
    expect(orderDetail.datasources[0].query).toContain('confirmation_email_template_id');
    expect(checkout.actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout').mutation.steps[0].query).toContain('confirmation_email_template_id');
    expect(checkout.actions.find((candidate: any) => candidate.id === 'anonymous_confirm_ecommerce_checkout').mutation.steps[0].query).toContain('confirmation_email_template_id');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921250000-114-ecommerce-confirmation-email-template.yaml').version).toBe('0.0.114');
    expect(yaml('migrations/20260921251000-115-ecommerce-confirmation-email-template-demo.yaml').version).toBe('0.0.115');
  });

  test('enforces company, active-template, and stale guards and stamps checkout orders', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_confirmation_email_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_confirmation_email_test', ['schema', 'data']);
    const api = yaml('api/confirmation-email-policy.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_confirmation_email_policy');
    const checkoutApi = yaml('api/checkout.yaml');
    const checkout = action(checkoutApi, 'confirm_ecommerce_checkout');
    const anonymousCheckout = action(checkoutApi, 'anonymous_confirm_ecommerce_checkout');

    expect((await repository.querySource(source, { company_name: 'My Company', fixture_state: null }, 0, 10)).data).toMatchObject({
      company_name: 'My Company', template_id: 'sale.mail_template_sale_confirmation', template_name: 'Sales Order Confirmation', model_name: 'sale.order', template_status: 'Active',
    });
    expect((await repository.querySource(api.datasources[1], {}, 0, 10)).data.map((row: any) => row.value)).toEqual(['sale.mail_template_sale_confirmation', 'ecommerce.website_sale_confirmation']);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-confirmation-email-policy-my-company', expected_row_version: 1, values: { template_id: 'ecommerce.website_sale_confirmation' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CONFIRMATION_EMAIL_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-confirmation-email-policy-my-company', expected_row_version: 1, values: { template_id: 'missing-template' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CONFIRMATION_EMAIL_TEMPLATE_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-confirmation-email-policy-my-company', expected_row_version: 1, values: { template_id: 'ecommerce.website_sale_confirmation' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, template_id: 'ecommerce.website_sale_confirmation', template_name: 'Website Sale Confirmation' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-confirmation-email-policy-my-company', expected_row_version: 1, values: { template_id: 'sale.mail_template_sale_confirmation' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CONFIRMATION_EMAIL_POLICY_STALE' });

    const order = await repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-open-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Main Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' }) as any;
    expect(order).toMatchObject({ confirmation_email_template_id: 'ecommerce.website_sale_confirmation', confirmation_email_template_name: 'Website Sale Confirmation' });
    expect(await repository.query('SELECT confirmation_email_template_id, confirmation_email_template_name FROM ecommerce_orders WHERE id = ?', [order.id])).toEqual([
      { confirmation_email_template_id: 'ecommerce.website_sale_confirmation', confirmation_email_template_name: 'Website Sale Confirmation' },
    ]);
    await repository.query("INSERT INTO ecommerce_carts (id, customer_id, customer_name, currency, state, company_name) VALUES ('ecommerce-cart-anon-confirm-email-001', NULL, 'Guest Shopper', 'USD', 'Open', 'My Company') ON CONFLICT (id) DO NOTHING");
    await repository.query("INSERT INTO ecommerce_cart_lines (id, cart_id, product_id, product_name, unit_price, quantity) VALUES ('ecommerce-cart-line-anon-confirm-email-001', 'ecommerce-cart-anon-confirm-email-001', 'ecommerce-product-mug', 'Core3 Ceramic Mug', 18, 1) ON CONFLICT (id) DO NOTHING");
    const guestOrder = await repository.executeMutation(anonymousCheckout.mutation, { values: { cart_id: 'ecommerce-cart-anon-confirm-email-001', customer_name: 'Guest Shopper', customer_email: 'guest-confirmation@example.com', shipping_address: '2 Guest Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(guestOrder).toMatchObject({ confirmation_email_template_id: 'ecommerce.website_sale_confirmation', confirmation_email_template_name: 'Website Sale Confirmation' });
    database.close();
  });

  test('preserves the selected template policy and order selection across restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-confirmation-email-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_confirmation_email_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/confirmation-email-policy.yaml');
      const edit = action(api, 'edit_ecommerce_confirmation_email_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-confirmation-email-policy-my-company', expected_row_version: 1, values: { template_id: 'ecommerce.website_sale_confirmation' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, template_id, row_version FROM ecommerce_confirmation_email_policies WHERE id = ?', ['ecommerce-confirmation-email-policy-my-company'])).toEqual([
        { company_name: 'My Company', template_id: 'ecommerce.website_sale_confirmation', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
