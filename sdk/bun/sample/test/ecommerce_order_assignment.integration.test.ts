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
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce online order assignment parity', () => {
  test('traces Odoo Orders Assignment and pairs separate page/API contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const orderModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/sale_order.py', 'utf8');
    const api = yaml('api/order-assignment-policy.yaml');
    const page = yaml('pages/order-assignment-policy.yaml');
    const checkout = yaml('api/checkout.yaml');
    const orders = yaml('api/orders.yaml');
    const orderDetail = yaml('api/order-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('salesperson_id = fields.Many2one');
    expect(websiteModel).toContain('salesteam_id = fields.Many2one');
    expect(websiteModel).toContain('def _default_salesteam_id');
    expect(settingsModel).toContain('salesperson_id = fields.Many2one');
    expect(settingsModel).toContain('salesteam_id = fields.Many2one');
    expect(settingsView).toContain('string="Orders Assignment"');
    expect(settingsView).toContain('name="salesteam_id"');
    expect(settingsView).toContain('name="salesperson_id"');
    expect(orderModel).toContain('return super()._default_team_id() or self.website_id.salesteam_id.id');
    expect(orderModel).toContain('order.website_id.salesperson_id');
    expect(page.page).toMatchObject({ id: 'ecommerce-order-assignment-policy', route: '/ecommerce/order-assignment-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-order-assignment-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_order_assignment_policy' });
    expect(action(api, 'edit_ecommerce_order_assignment_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.checkout.order_assignment.update' });
    expect(action(api, 'edit_ecommerce_order_assignment_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/order-assignment-policy', label: 'Orders Assignment', permission: 'ecommerce.read' }),
    ]));
    expect(orders.datasources[0].query).toContain('sales_team_name');
    expect(orderDetail.datasources[0].query).toContain('salesperson_name');
    const checkoutActions = [action(checkout, 'confirm_ecommerce_checkout'), action(checkout, 'anonymous_confirm_ecommerce_checkout')];
    for (const checkoutAction of checkoutActions) {
      expect(checkoutAction.mutation.steps[0].query).toContain('sales_team_id');
      expect(checkoutAction.mutation.steps.some((step: any) => step.query.includes('sales_team_name'))).toBe(true);
      expect(checkoutAction.mutation.steps.some((step: any) => step.query.includes('ecommerce_sales_handoffs'))).toBe(true);
    }
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921270000-118-ecommerce-order-assignment.yaml').version).toBe('0.0.118');
    expect(yaml('migrations/20260921271000-119-ecommerce-order-assignment-demo.yaml').version).toBe('0.0.119');
  });

  test('updates the company policy with permission, validation, stale guards, and idempotent checkout handoff snapshots', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_order_assignment_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/order-assignment-policy.yaml');
    const edit = action(api, 'edit_ecommerce_order_assignment_policy');
    const checkoutApi = yaml('api/checkout.yaml');
    const checkout = action(checkoutApi, 'confirm_ecommerce_checkout');
    const guestCheckout = action(checkoutApi, 'anonymous_confirm_ecommerce_checkout');

    expect(await repository.querySource(api.datasources[0], { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({
      data: expect.objectContaining({ company_name: 'My Company', sales_team_id: 'ecommerce-sales-team-website', sales_team_name: 'Website Sales', salesperson_id: '', salesperson_name: 'Unassigned', assignment_behavior: 'Website Sales' }),
    });
    expect((await repository.querySource(api.datasources[1], { company_name: 'My Company' }, 0, 10)).data.map((row: any) => row.label)).toEqual(['Enterprise Sales', 'Unassigned', 'Website Sales']);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: 'ecommerce-sales-team-enterprise', salesperson_id: '' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ORDER_ASSIGNMENT_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: 'ecommerce-sales-team-other', salesperson_id: '' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ORDER_ASSIGNMENT_TEAM_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: 'ecommerce-sales-team-website', salesperson_id: 'ecommerce-salesperson-other' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ORDER_ASSIGNMENT_SALESPERSON_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: 'ecommerce-sales-team-enterprise', salesperson_id: 'ecommerce-salesperson-dispatcher' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, sales_team_id: 'ecommerce-sales-team-enterprise', sales_team_name: 'Enterprise Sales', salesperson_id: 'ecommerce-salesperson-dispatcher', salesperson_name: 'Dispatcher User' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: '', salesperson_id: '' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ORDER_ASSIGNMENT_STALE' });

    await repository.query("INSERT INTO ecommerce_carts (id, customer_id, customer_name, currency, state, company_name) VALUES ('ecommerce-cart-order-assignment-001', 'ecommerce-customer-001', 'Acme Corporation', 'USD', 'Open', 'My Company')");
    await repository.query("INSERT INTO ecommerce_cart_lines (id, cart_id, product_id, product_name, unit_price, quantity) VALUES ('ecommerce-cart-line-order-assignment-001', 'ecommerce-cart-order-assignment-001', 'ecommerce-product-mug', 'Core3 Ceramic Mug', 18, 1)");
    const order = await repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-order-assignment-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Assignment Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' }) as any;
    expect(order).toMatchObject({ sales_team_id: 'ecommerce-sales-team-enterprise', sales_team_name: 'Enterprise Sales', salesperson_id: 'ecommerce-salesperson-dispatcher', salesperson_name: 'Dispatcher User' });
    expect(await repository.query('SELECT sales_team_name, salesperson_name FROM ecommerce_sales_handoffs WHERE ecommerce_order_id = ?', [order.id])).toEqual([{ sales_team_name: 'Enterprise Sales', salesperson_name: 'Dispatcher User' }]);
    await expect(repository.executeMutation(checkout.mutation, { values: { cart_id: 'ecommerce-cart-order-assignment-001', customer_name: 'Acme Corporation', customer_email: 'buyer@acme.example', shipping_address: '1 Assignment Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }, company_name: 'My Company', current_company_name: 'My Company', customer_scope: 'all', current_user_email: 'buyer@acme.example' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CHECKOUT_CART_CLOSED' });

    await repository.query("INSERT INTO ecommerce_carts (id, customer_name, currency, state, company_name) VALUES ('ecommerce-cart-anon-order-assignment-001', 'Guest Assignment', 'USD', 'Open', 'My Company')");
    await repository.query("INSERT INTO ecommerce_cart_lines (id, cart_id, product_id, product_name, unit_price, quantity) VALUES ('ecommerce-cart-line-anon-order-assignment-001', 'ecommerce-cart-anon-order-assignment-001', 'ecommerce-product-mug', 'Core3 Ceramic Mug', 18, 1)");
    const guestOrder = await repository.executeMutation(guestCheckout.mutation, { values: { cart_id: 'ecommerce-cart-anon-order-assignment-001', customer_name: 'Guest Assignment', customer_email: 'guest-assignment@example.com', shipping_address: '2 Assignment Street', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' } }) as any;
    expect(guestOrder).toMatchObject({ sales_team_name: 'Enterprise Sales', salesperson_name: 'Dispatcher User' });
    database.close();
  });

  test('preserves the assignment policy and checkout snapshot across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-order-assignment-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_order_assignment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/order-assignment-policy.yaml');
      const edit = action(api, 'edit_ecommerce_order_assignment_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrate(repository, migrationName);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-order-assignment-policy-my-company', expected_row_version: 1, values: { sales_team_id: 'ecommerce-sales-team-enterprise', salesperson_id: 'ecommerce-salesperson-dispatcher' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrate(repository, migrationName);
      expect(await repository.query('SELECT company_name, sales_team_id, salesperson_id, row_version FROM ecommerce_order_assignment_policies WHERE id = ?', ['ecommerce-order-assignment-policy-my-company'])).toEqual([
        { company_name: 'My Company', sales_team_id: 'ecommerce-sales-team-enterprise', salesperson_id: 'ecommerce-salesperson-dispatcher', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
