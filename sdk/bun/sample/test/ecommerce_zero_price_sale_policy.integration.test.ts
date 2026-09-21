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

describe('eCommerce zero-price sale policy parity', () => {
  test('traces Odoo settings/product/cart source and pairs page/API contracts', () => {
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const productModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_product.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const cartController = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/cart.py', 'utf8');
    const api = yaml('api/zero-price-sale-policy.yaml');
    const page = yaml('pages/zero-price-sale-policy.yaml');
    const manifest = yaml('manifest.yaml');

    expect(settingsModel).toContain('website_sale_prevent_zero_price_sale = fields.Boolean');
    expect(settingsModel).toContain('website_sale_contact_us_button_url = fields.Char');
    expect(websiteModel).toContain("prevent_zero_price_sale = fields.Boolean");
    expect(websiteModel).toContain('contact_us_button_url = fields.Char');
    expect(productModel).toContain('def _is_add_to_cart_allowed');
    expect(productModel).toContain('request.website.prevent_zero_price_sale');
    expect(settingsView).toContain('id="hide_add_to_cart_setting"');
    expect(settingsView).toContain('name="website_sale_contact_us_button_url"');
    expect(template).toContain('website.contact_us_button_url');
    expect(cartController).toContain('not product._is_add_to_cart_allowed()');
    expect(page.page).toMatchObject({ id: 'ecommerce-zero-price-sale-policy', route: '/ecommerce/zero-price-sale-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-zero-price-sale-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_zero_price_sale_policy' });
    expect(action(api, 'edit_ecommerce_zero_price_sale_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.zero_price_policy.update' });
    expect(action(api, 'edit_ecommerce_zero_price_sale_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/zero-price-sale-policy', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921210000-106-ecommerce-zero-price-sale-policy.yaml').version).toBe('0.0.106');
    expect(yaml('migrations/20260921211000-107-ecommerce-zero-price-sale-demo.yaml').version).toBe('0.0.107');
  });

  test('enforces contact-only zero-price products with company, URL, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_zero_price_sale_policy_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_zero_price_sale_policy_test', ['schema', 'data']);
    const api = yaml('api/zero-price-sale-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_zero_price_sale_policy');
    const add = action(shopApi, 'shop_add_to_cart');
    const anonymousAdd = action(shopApi, 'anonymous_shop_add_to_cart');
    const zeroProduct = 'ecommerce-product-contact-only-001';
    await repository.query("INSERT INTO ecommerce_products (id, name, internal_reference, product_type, category, sales_price, website_sequence, is_published, active, company_name) VALUES (?, ?, ?, 'Goods', 'All / Services', 0, 50, TRUE, TRUE, 'My Company') ON CONFLICT (id) DO UPDATE SET sales_price = 0, is_published = TRUE, active = TRUE", [zeroProduct, 'Contact-only Service', 'SV-CONTACT-001']);

    expect(await repository.querySource(source, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject(
      expect.objectContaining({ company_name: 'My Company', prevent_zero_price_sale: false, contact_us_button_url: '/contactus', sale_behavior: 'Allow zero-priced products in cart' }),
    );
    expect((await repository.querySource(shopApi.datasources[0], { q: 'Contact-only', company_name: 'My Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ add_to_cart_allowed: true, contact_us_button_url: null });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 1, values: { prevent_zero_price_sale: true, contact_us_button_url: '/contact-sales' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ZERO_PRICE_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 1, values: { prevent_zero_price_sale: true, contact_us_button_url: 'javascript:alert(1)' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ZERO_PRICE_POLICY_INVALID' });
    const blocked = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 1, values: { prevent_zero_price_sale: true, contact_us_button_url: '/contact-sales' } }) as any;
    expect(blocked).toMatchObject({ row_version: 2, prevent_zero_price_sale: true, contact_us_button_url: '/contact-sales', sale_behavior: 'Contact us for zero-priced products' });
    expect((await repository.querySource(shopApi.datasources[0], { q: 'Contact-only', company_name: 'My Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ add_to_cart_allowed: false, contact_us_button_url: '/contact-sales' });
    await expect(repository.executeMutation(add.mutation, { values: { product_id: zeroProduct }, current_user_email: 'hello@workspace.example', customer_scope: 'own' })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_ZERO_PRICE_UNAVAILABLE' });
    await expect(repository.executeMutation(anonymousAdd.mutation, { values: { cart_id: 'ecommerce-cart-anon-zero-price-001', line_id: 'ecommerce-cart-anon-zero-price-001-contact-only', product_id: zeroProduct } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_ZERO_PRICE_UNAVAILABLE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 1, values: { prevent_zero_price_sale: false, contact_us_button_url: '/contact-sales' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ZERO_PRICE_POLICY_STALE' });
    const allowed = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 2, values: { prevent_zero_price_sale: false, contact_us_button_url: '/contact-sales' } });
    expect(allowed).toMatchObject({ row_version: 3, prevent_zero_price_sale: false });
    expect(await repository.executeMutation(add.mutation, { values: { product_id: zeroProduct }, current_user_email: 'hello@workspace.example', customer_scope: 'own' })).toMatchObject({ product_id: zeroProduct, quantity: 1 });
    database.close();
  });

  test('persists the contact-only policy across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-zero-price-policy-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_zero_price_policy_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/zero-price-sale-policy.yaml');
      const edit = action(api, 'edit_ecommerce_zero_price_sale_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-zero-price-sale-my-company', expected_row_version: 1, values: { prevent_zero_price_sale: true, contact_us_button_url: 'https://example.com/contact' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, prevent_zero_price_sale, contact_us_button_url, row_version FROM ecommerce_zero_price_sale_policies WHERE id = ?', ['ecommerce-zero-price-sale-my-company'])).toEqual([
        { company_name: 'My Company', prevent_zero_price_sale: true, contact_us_button_url: 'https://example.com/contact', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
