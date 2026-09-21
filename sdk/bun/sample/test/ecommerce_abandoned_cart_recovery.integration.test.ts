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

describe('eCommerce abandoned cart recovery parity', () => {
  test('traces the Odoo abandoned-cart menu/settings/recovery source and pairs page/API contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const saleOrder = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/sale_order.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const saleOrderView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/sale_order_views.xml', 'utf8');
    const menus = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const api = yaml('api/abandoned-cart-recovery-policy.yaml');
    const page = yaml('pages/abandoned-cart-recovery-policy.yaml');
    const abandonedApi = yaml('api/abandoned-carts.yaml');
    const abandonedPage = yaml('pages/abandoned-carts.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('cart_recovery_mail_template_id = fields.Many2one');
    expect(websiteModel).toContain('cart_abandoned_delay = fields.Float');
    expect(websiteModel).toContain('send_abandoned_cart_email = fields.Boolean');
    expect(websiteModel).toContain('def _send_abandoned_cart_email(self)');
    expect(settingsModel).toContain("related='website_id.cart_recovery_mail_template_id'");
    expect(settingsModel).toContain("related='website_id.cart_abandoned_delay'");
    expect(settingsModel).toContain("related='website_id.send_abandoned_cart_email'");
    expect(settingsView).toContain('id="abandoned_carts_setting"');
    expect(settingsView).toContain('name="cart_abandoned_delay"');
    expect(settingsView).toContain('name="action_open_abandoned_cart_mail_template"');
    expect(saleOrder).toContain('cart_recovery_email_sent = fields.Boolean');
    expect(saleOrder).toContain('def action_recovery_email_send(self)');
    expect(saleOrder).toContain('def _cart_recovery_email_send(self)');
    expect(saleOrderView).toContain('id="action_view_abandoned_tree"');
    expect(saleOrderView).toContain('name="action_recovery_email_send"');
    expect(menus).toContain('id="menu_orders_abandoned_orders"');
    expect(menus).toContain('action="action_view_abandoned_tree"');
    expect(page.page).toMatchObject({ id: 'ecommerce-abandoned-cart-recovery-policy', route: '/ecommerce/abandoned-cart-recovery-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-abandoned-cart-recovery-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_abandoned_cart_recovery_policy' });
    expect(action(api, 'edit_ecommerce_abandoned_cart_recovery_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.abandoned_cart_recovery.update' });
    expect(action(api, 'edit_ecommerce_abandoned_cart_recovery_policy').mutation.concurrency).toEqual({ required: true });
    expect(action(abandonedApi, 'send_ecommerce_abandoned_cart_recovery_email')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.abandoned_carts.recovery_email.send' });
    expect(action(abandonedApi, 'send_ecommerce_abandoned_cart_recovery_email').mutation.concurrency).toEqual({ required: true });
    expect(abandonedPage.components[0].actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'send_ecommerce_abandoned_cart_recovery_email' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/abandoned-cart-recovery-policy', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921260000-116-ecommerce-abandoned-cart-recovery.yaml').version).toBe('0.0.116');
    expect(yaml('migrations/20260921261000-117-ecommerce-abandoned-cart-recovery-demo.yaml').version).toBe('0.0.117');
  });

  test('enforces recovery policy scope, delay/template validation, idempotent send, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_abandoned_cart_recovery_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_abandoned_cart_recovery_test', ['schema', 'data']);
    const policyApi = yaml('api/abandoned-cart-recovery-policy.yaml');
    const abandonedApi = yaml('api/abandoned-carts.yaml');
    const policySource = policyApi.datasources[0];
    const edit = action(policyApi, 'edit_ecommerce_abandoned_cart_recovery_policy');
    const send = action(abandonedApi, 'send_ecommerce_abandoned_cart_recovery_email');
    const params = { q: null, fixture_state: null, company_name: 'My Company' };

    expect((await repository.querySource(policySource, { company_name: 'My Company', fixture_state: null }, 0, 10)).data).toMatchObject({ company_name: 'My Company', send_abandoned_cart_email: false, cart_abandoned_delay_hours: 10, recovery_template_id: 'website_sale.mail_template_sale_cart_recovery', recovery_template_name: 'Ecommerce Cart Recovery', recovery_status: 'Disabled' });
    expect((await repository.querySource(abandonedApi.datasources[0], params, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ cart_number: 'CART/2026/0001', company_name: 'My Company', recovery_enabled: false, recovery_email_sent: false })]));
    await expect(repository.executeMutation(send.mutation, { current_company_name: 'My Company', id: 'ecommerce-cart-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ABANDONED_CART_RECOVERY_DISABLED' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-abandoned-cart-policy-my-company', expected_row_version: 1, values: { send_abandoned_cart_email: true, cart_abandoned_delay_hours: 24, recovery_template_id: 'website_sale.mail_template_sale_cart_recovery' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ABANDONED_CART_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-abandoned-cart-policy-my-company', expected_row_version: 1, values: { send_abandoned_cart_email: true, cart_abandoned_delay_hours: 721, recovery_template_id: 'website_sale.mail_template_sale_cart_recovery' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ABANDONED_CART_DELAY_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-abandoned-cart-policy-my-company', expected_row_version: 1, values: { send_abandoned_cart_email: true, cart_abandoned_delay_hours: 24, recovery_template_id: 'missing-template' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ABANDONED_CART_TEMPLATE_INVALID' });
    const enabled = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-abandoned-cart-policy-my-company', expected_row_version: 1, values: { send_abandoned_cart_email: true, cart_abandoned_delay_hours: 24, recovery_template_id: 'website_sale.mail_template_sale_cart_recovery' } }) as any;
    expect(enabled).toMatchObject({ row_version: 2, send_abandoned_cart_email: true, cart_abandoned_delay_hours: 24, recovery_status: 'Enabled' });
    const sent = await repository.executeMutation(send.mutation, { current_company_name: 'My Company', id: 'ecommerce-cart-001', expected_row_version: 1 }) as any;
    expect(sent).toMatchObject({ row_version: 2, recovery_email_sent: true, cart_number: 'CART/2026/0001' });
    expect((await repository.querySource(abandonedApi.datasources[0], params, 0, 50)).data.find((row: any) => row.id === 'ecommerce-cart-001')).toMatchObject({ recovery_enabled: true, recovery_email_sent: true, recovery_email_sent_at: expect.any(String) });
    await expect(repository.executeMutation(send.mutation, { current_company_name: 'My Company', id: 'ecommerce-cart-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ABANDONED_CART_RECOVERY_STALE' });
    database.close();
  });

  test('preserves the recovery policy and send ledger across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-abandoned-recovery-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_abandoned_recovery_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const policyApi = yaml('api/abandoned-cart-recovery-policy.yaml');
      const abandonedApi = yaml('api/abandoned-carts.yaml');
      const edit = action(policyApi, 'edit_ecommerce_abandoned_cart_recovery_policy');
      const send = action(abandonedApi, 'send_ecommerce_abandoned_cart_recovery_email');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-abandoned-cart-policy-my-company', expected_row_version: 1, values: { send_abandoned_cart_email: true, cart_abandoned_delay_hours: 12, recovery_template_id: 'website_sale.mail_template_sale_cart_recovery' } });
      await repository.executeMutation(send.mutation, { current_company_name: 'My Company', id: 'ecommerce-cart-001', expected_row_version: 1 });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, send_abandoned_cart_email, cart_abandoned_delay_hours, row_version FROM ecommerce_abandoned_cart_policies WHERE id = ?', ['ecommerce-abandoned-cart-policy-my-company'])).toEqual([
        { company_name: 'My Company', send_abandoned_cart_email: true, cart_abandoned_delay_hours: 12, row_version: 2 },
      ]);
      expect(await repository.query('SELECT cart_number, recovery_email_sent, row_version FROM ecommerce_abandoned_carts WHERE id = ?', ['ecommerce-cart-001'])).toEqual([
        { cart_number: 'CART/2026/0001', recovery_email_sent: true, row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
