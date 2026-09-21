import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const operationQuery = async (repository: YamlRepository, definition: any, request: Record<string, unknown>) => {
  const bound = bindNamedParams(definition.query, request);
  return repository.query(bound.statement, bound.values);
};

describe('eCommerce checkout tax display mode parity', () => {
  test('traces the Odoo website/settings/template contract and pairs page/API projections', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/tax-display-policy.yaml');
    const page = yaml('pages/tax-display-policy.yaml');
    const cart = yaml('api/cart.yaml');
    const checkout = yaml('api/checkout.yaml');
    const operations = yaml('operations.yaml').operations;
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('show_line_subtotals_tax_selection = fields.Selection');
    expect(websiteModel).toContain("('tax_excluded', \"Tax Excluded\")");
    expect(websiteModel).toContain("('tax_included', \"Tax Included\")");
    expect(websiteModel).toContain("website.show_line_subtotals_tax_selection = 'tax_excluded'");
    expect(settingsModel).toContain("related='website_id.show_line_subtotals_tax_selection'");
    expect(settingsView).toContain('name="show_line_subtotals_tax_selection"');
    expect(template).toContain("website.show_line_subtotals_tax_selection == 'tax_excluded'");
    expect(page.page).toMatchObject({ id: 'ecommerce-tax-display-policy', route: '/ecommerce/tax-display-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-tax-display-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_tax_display_policy' });
    expect(action(api, 'edit_ecommerce_tax_display_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.tax_display_policy.update' });
    expect(action(api, 'edit_ecommerce_tax_display_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/tax-display-policy', permission: 'ecommerce.read' }),
    ]));
    expect(cart.datasources.find((source: any) => source.id === 'ecommerce_cart').query).toContain('tax_display_mode');
    expect(checkout.datasources.find((source: any) => source.id === 'ecommerce_checkout_cart').query).toContain('subtotal_label');
    expect(operations['ecommerce.public.cart'].query).toContain('tax_display_mode');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921240000-112-ecommerce-checkout-tax-display-mode.yaml').version).toBe('0.0.112');
    expect(yaml('migrations/20260921241000-113-ecommerce-checkout-tax-display-mode-demo.yaml').version).toBe('0.0.113');
  });

  test('persists the company policy, projects it into cart/checkout, and enforces scope, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_tax_display_mode_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_tax_display_mode_test', ['schema', 'data']);
    const api = yaml('api/tax-display-policy.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_tax_display_policy');
    const cart = yaml('api/cart.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_cart');
    const checkout = yaml('api/checkout.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_checkout_cart');
    const policyParams = { company_name: 'My Company', fixture_state: null };

    expect(await repository.querySource(source, policyParams, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_line_subtotals_tax_selection: 'tax_excluded', tax_display_label: 'Tax Excluded', subtotal_label: 'Line subtotals exclude tax' }) });
    expect((await repository.querySource(cart, { id: 'ecommerce-cart-open-001', company_name: 'My Company', customer_id: null, customer_scope: 'all', current_user_email: null, fixture_state: null }, 0, 1)).data).toMatchObject({ tax_display_mode: 'tax_excluded', subtotal_label: 'Line subtotals exclude tax' });
    expect((await repository.querySource(checkout, { cart_id: 'ecommerce-cart-open-001', company_name: 'My Company', customer_id: null, customer_scope: 'all', current_user_email: null, fixture_state: null }, 0, 1)).data).toMatchObject({ tax_display_mode: 'tax_excluded', subtotal_label: 'Line subtotals exclude tax' });
    await repository.query("INSERT INTO ecommerce_carts (id, customer_id, customer_name, currency, state, company_name) VALUES ('ecommerce-cart-anon-tax-display-001', NULL, 'Anonymous', 'USD', 'Open', 'My Company') ON CONFLICT (id) DO NOTHING");
    await repository.query("INSERT INTO ecommerce_cart_lines (id, cart_id, product_id, product_name, unit_price, quantity) VALUES ('ecommerce-cart-line-anon-tax-display-001', 'ecommerce-cart-anon-tax-display-001', 'ecommerce-product-mug', 'Core3 Ceramic Mug', 18, 1) ON CONFLICT (id) DO NOTHING");
    const operation = yaml('operations.yaml').operations['ecommerce.public.cart'];
    expect((await operationQuery(repository, operation, { cart_id: 'ecommerce-cart-anon-tax-display-001' }))[0]).toMatchObject({ tax_display_mode: 'tax_excluded', subtotal_label: 'Line subtotals exclude tax' });

    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-tax-display-policy-my-company', expected_row_version: 1, values: { show_line_subtotals_tax_selection: 'tax_included' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_TAX_DISPLAY_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-tax-display-policy-my-company', expected_row_version: 1, values: { show_line_subtotals_tax_selection: 'tax_inclusive' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_TAX_DISPLAY_POLICY_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-tax-display-policy-my-company', expected_row_version: 1, values: { show_line_subtotals_tax_selection: 'tax_included' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, show_line_subtotals_tax_selection: 'tax_included', tax_display_label: 'Tax Included', subtotal_label: 'Line subtotals include tax' });
    expect((await repository.querySource(cart, { id: 'ecommerce-cart-open-001', company_name: 'My Company', customer_id: null, customer_scope: 'all', current_user_email: null, fixture_state: null }, 0, 1)).data).toMatchObject({ tax_display_mode: 'tax_included', subtotal_label: 'Line subtotals include tax' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-tax-display-policy-my-company', expected_row_version: 1, values: { show_line_subtotals_tax_selection: 'tax_excluded' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_TAX_DISPLAY_POLICY_STALE' });
    database.close();
  });

  test('preserves the tax display policy across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-tax-display-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_tax_display_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/tax-display-policy.yaml');
      const edit = action(api, 'edit_ecommerce_tax_display_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-tax-display-policy-my-company', expected_row_version: 1, values: { show_line_subtotals_tax_selection: 'tax_included' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, show_line_subtotals_tax_selection, row_version FROM ecommerce_tax_display_policies WHERE id = ?', ['ecommerce-tax-display-policy-my-company'])).toEqual([
        { company_name: 'My Company', show_line_subtotals_tax_selection: 'tax_included', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
