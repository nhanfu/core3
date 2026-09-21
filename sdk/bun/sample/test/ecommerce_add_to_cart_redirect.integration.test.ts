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

describe('eCommerce add-to-cart redirect parity', () => {
  test('traces Odoo setting/controller/client source and pairs page/API contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const httpModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/ir_http.py', 'utf8');
    const cartService = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/js/cart_service.js', 'utf8');
    const cartController = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/cart.py', 'utf8');
    const api = yaml('api/add-to-cart-policy.yaml');
    const page = yaml('pages/add-to-cart-policy.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('add_to_cart_action = fields.Selection');
    expect(websiteModel).toContain("('stay'");
    expect(websiteModel).toContain("('go_to_cart'");
    expect(settingsModel).toContain("related='website_id.add_to_cart_action'");
    expect(settingsView).toContain('id="cart_redirect_setting"');
    expect(settingsView).toContain('name="add_to_cart_action"');
    expect(httpModel).toContain("'add_to_cart_action': request.website.add_to_cart_action");
    expect(cartService).toContain("session.add_to_cart_action === 'go_to_cart'");
    expect(cartService).toContain("redirect('/shop/cart')");
    expect(cartController).toContain("route='/shop/cart/add'");
    expect(page.page).toMatchObject({ id: 'ecommerce-add-to-cart-policy', route: '/ecommerce/add-to-cart-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-add-to-cart-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_add_to_cart_policy' });
    expect(action(api, 'edit_ecommerce_add_to_cart_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.add_to_cart_policy.update' });
    expect(action(api, 'edit_ecommerce_add_to_cart_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/add-to-cart-policy', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921220000-108-ecommerce-add-to-cart-redirect.yaml').version).toBe('0.0.108');
    expect(yaml('migrations/20260921221000-109-ecommerce-add-to-cart-redirect-demo.yaml').version).toBe('0.0.109');
  });

  test('persists policy, enforces company/validation/concurrency, and returns redirect intent for both carts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_add_to_cart_redirect_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_add_to_cart_redirect_test', ['schema', 'data']);
    const api = yaml('api/add-to-cart-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_add_to_cart_policy');
    const add = action(shopApi, 'shop_add_to_cart');
    const anonymousAdd = action(shopApi, 'anonymous_shop_add_to_cart');

    expect((await repository.querySource(source, { company_name: 'My Company', fixture_state: null }, 0, 10)).data).toMatchObject({
      company_name: 'My Company', add_to_cart_action: 'stay', action_label: 'Stay on Product Page', redirect_path: '/ecommerce/shop', row_version: 1,
    });
    expect((await repository.querySource(shopApi.datasources[0], { q: 'mug', company_name: 'My Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ add_to_cart_action: 'stay', redirect_path: '/ecommerce/shop' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 1, values: { add_to_cart_action: 'go_to_cart' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ADD_TO_CART_POLICY_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 1, values: { add_to_cart_action: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ADD_TO_CART_POLICY_INVALID' });

    const goToCart = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 1, values: { add_to_cart_action: 'go_to_cart' } });
    expect(goToCart).toMatchObject({ row_version: 2, add_to_cart_action: 'go_to_cart', action_label: 'Go to cart', redirect_path: '/ecommerce/cart' });
    expect(await repository.executeMutation(add.mutation, { values: { product_id: 'ecommerce-product-mug' }, customer_scope: 'own', current_user_email: 'hello@workspace.example' })).toMatchObject({ product_id: 'ecommerce-product-mug', quantity: 1, add_to_cart_action: 'go_to_cart', redirect_path: '/ecommerce/cart' });
    expect(await repository.executeMutation(anonymousAdd.mutation, { values: { cart_id: 'ecommerce-cart-anon-redirect-001', line_id: 'ecommerce-cart-anon-redirect-001-ecommerce-product-mug', product_id: 'ecommerce-product-mug' } })).toMatchObject({ product_id: 'ecommerce-product-mug', quantity: 1, add_to_cart_action: 'go_to_cart', redirect_path: '/ecommerce/cart' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 1, values: { add_to_cart_action: 'stay' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ADD_TO_CART_POLICY_STALE' });
    const stay = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 2, values: { add_to_cart_action: 'stay' } });
    expect(stay).toMatchObject({ row_version: 3, add_to_cart_action: 'stay', redirect_path: '/ecommerce/shop' });
    expect(await repository.executeMutation(add.mutation, { values: { product_id: 'ecommerce-product-mug' }, customer_scope: 'own', current_user_email: 'hello@workspace.example' })).toMatchObject({ quantity: 2, add_to_cart_action: 'stay', redirect_path: '/ecommerce/shop' });
    database.close();
  });

  test('survives a DuckDB restart with the selected redirect mode and version', async () => {
    const databasePath = `/tmp/core3-ecommerce-add-to-cart-redirect-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_add_to_cart_redirect_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/add-to-cart-policy.yaml');
      const edit = action(api, 'edit_ecommerce_add_to_cart_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-add-to-cart-policy-my-company', expected_row_version: 1, values: { add_to_cart_action: 'go_to_cart' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, add_to_cart_action, row_version FROM ecommerce_add_to_cart_policies WHERE id = ?', ['ecommerce-add-to-cart-policy-my-company'])).toEqual([
        { company_name: 'My Company', add_to_cart_action: 'go_to_cart', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
