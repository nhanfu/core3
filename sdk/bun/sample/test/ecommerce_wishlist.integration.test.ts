import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import EcommerceModule from '../services/ecommerce/module';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrations = join(root, 'migrations');

describe('eCommerce wishlist parity', () => {
  test('traces Odoo wishlist routes and separates the Core3 page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/models/product_wishlist.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/controllers/main.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/views/website_sale_wishlist_template.xml', 'utf8');
    const interaction = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/interactions/product_wishlist.js', 'utf8');
    const page = yaml('pages/wishlist.yaml');
    const api = yaml('api/wishlist.yaml');
    const manifest = yaml('manifest.yaml');
    const orders = manifest.menu.groups.find((group: any) => group.id === 'orders');

    expect(model).toContain("_name = 'product.wishlist'");
    expect(model).toContain('UNIQUE(product_id, partner_id)');
    expect(model).toContain('request.session.get(\'wishlist_ids\', [])');
    expect(controller).toContain("'/shop/wishlist/add'");
    expect(controller).toContain("'/shop/wishlist'");
    expect(controller).toContain("'/shop/wishlist/remove/<int:wish_id>'");
    expect(template).toContain('o_add_wishlist');
    expect(template).toContain('class="o_wsale_product_btn_primary btn btn-primary o_wish_add"');
    expect(template).toContain('Add to Cart');
    expect(interaction).toContain('async addToCart(ev)');
    expect(interaction).toContain("await this._removeProduct(button, '/shop/cart')");
    expect(page.page).toMatchObject({ id: 'ecommerce-wishlist', route: '/ecommerce/wishlist' });
    expect(api.page).toEqual({ id: 'ecommerce-wishlist' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_wishlist_items' });
    expect(api.datasources[0].permission).toBe('ecommerce.read');
    expect(action(api, 'add_ecommerce_wishlist_item')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.wishlist.add' });
    expect(action(api, 'remove_ecommerce_wishlist_item').mutation.required).toEqual(['id', 'wishlist_id', 'expected_row_version']);
    expect(action(api, 'add_to_cart_ecommerce_wishlist_item')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.wishlist.add_to_cart' });
    expect(action(api, 'add_to_cart_ecommerce_wishlist_item').mutation.required).toEqual(['id', 'wishlist_id', 'expected_row_version']);
    expect(action(api, 'add_to_cart_ecommerce_wishlist_item').refresh).toEqual(['ecommerce_wishlist_items', 'ecommerce_cart', 'ecommerce_cart_lines']);
    expect(orders.items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/wishlist', permission: 'ecommerce.read' })]));
  });

  test('adds a saved customer item to the owned open cart, removes it, and returns the Cart redirect', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_add_to_cart_test', ['schema', 'data']);
    const addToCart = action(yaml('api/wishlist.yaml'), 'add_to_cart_ecommerce_wishlist_item');

    const result = await repository.executeMutation(addToCart.mutation, {
      id: 'ecommerce-wishlist-customer-001-mug',
      wishlist_id: 'ecommerce-wishlist-customer-001',
      expected_row_version: 1,
      current_company_name: 'My Company',
      customer_scope: 'own',
      current_user_email: 'hello@workspace.example',
    }) as any;

    expect(result).toMatchObject({
      cart_id: 'ecommerce-cart-open-001',
      product_id: 'ecommerce-product-mug',
      quantity: 3,
      removed: true,
      redirect_path: '/ecommerce/cart',
    });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_wishlist_items WHERE id = ?', ['ecommerce-wishlist-customer-001-mug']))
      .toEqual([{ count: 0 }]);
    expect(await repository.query('SELECT quantity FROM ecommerce_cart_lines WHERE cart_id = ? AND product_id = ?', ['ecommerce-cart-open-001', 'ecommerce-product-mug']))
      .toEqual([{ quantity: 3 }]);

    database.close();
  });

  test('guards wishlist-to-cart ownership, stale rows, unavailable products, and zero-price policy', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_add_to_cart_guards_test', ['schema', 'data']);
    const api = yaml('api/wishlist.yaml');
    const addToCart = action(api, 'add_to_cart_ecommerce_wishlist_item');
    const request = {
      id: 'ecommerce-wishlist-customer-001-mug',
      wishlist_id: 'ecommerce-wishlist-customer-001',
      expected_row_version: 1,
      current_company_name: 'My Company',
      customer_scope: 'own',
      current_user_email: 'hello@workspace.example',
    };

    await expect(repository.executeMutation(addToCart.mutation, { ...request, current_user_email: 'other@example.com' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_WISHLIST_ADD_TO_CART_FORBIDDEN' });
    await expect(repository.executeMutation(addToCart.mutation, { ...request, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_WISHLIST_ADD_TO_CART_FORBIDDEN' });
    await expect(repository.executeMutation(addToCart.mutation, { ...request, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_ADD_TO_CART_STALE' });
    await expect(repository.executeMutation(addToCart.mutation, { ...request, id: 'missing-wishlist-item' }))
      .rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_WISHLIST_ITEM_NOT_FOUND' });

    await repository.query("UPDATE ecommerce_products SET is_published = FALSE WHERE id = 'ecommerce-product-mug'");
    await expect(repository.executeMutation(addToCart.mutation, request))
      .rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_WISHLIST_ADD_TO_CART_PRODUCT_UNAVAILABLE' });
    database.close();
  });

  test('persists the wishlist-to-cart workflow across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-wishlist-add-to-cart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_wishlist_add_to_cart_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const addToCart = action(yaml('api/wishlist.yaml'), 'add_to_cart_ecommerce_wishlist_item');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(addToCart.mutation, {
        id: 'ecommerce-wishlist-customer-001-mug',
        wishlist_id: 'ecommerce-wishlist-customer-001',
        expected_row_version: 1,
        current_company_name: 'My Company',
        customer_scope: 'own',
        current_user_email: 'hello@workspace.example',
      });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT quantity FROM ecommerce_cart_lines WHERE cart_id = ? AND product_id = ?', ['ecommerce-cart-open-001', 'ecommerce-product-mug']))
        .toEqual([{ quantity: 3 }]);
      expect(await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_wishlist_items WHERE id = ?', ['ecommerce-wishlist-customer-001-mug']))
        .toEqual([{ count: 0 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });

  test('persists deterministic fixtures, enforces ownership/company/product guards, and makes add idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_wishlist_test', ['schema', 'data']);
    const api = yaml('api/wishlist.yaml');
    const source = api.datasources[0];
    const fixture = (await repository.querySource(source, { wishlist_id: 'ecommerce-wishlist-customer-001', company_name: 'My Company', customer_scope: 'all', current_user_email: null }, 0, 50)).data;
    expect(fixture).toMatchObject([expect.objectContaining({ product_id: 'ecommerce-product-mug', product_name: 'Core3 Ceramic Mug', price: 18 })]);
    const add = action(api, 'add_ecommerce_wishlist_item');
    const remove = action(api, 'remove_ecommerce_wishlist_item');
    const values = {
      wishlist_id: 'ecommerce-wishlist-customer-test',
      item_id: 'ecommerce-wishlist-customer-test-chair',
      owner_type: 'customer',
      customer_id: 'ecommerce-customer-001',
      customer_name: 'Acme Corporation',
      customer_email: 'hello@workspace.example',
      product_id: 'ecommerce-product-chair',
      variant_id: null,
      variant_key: '',
      company_name: 'My Company',
      session_key: '',
      website_id: 'core3-main-website',
      currency: 'USD',
    };
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_WISHLIST_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'My Company', values: { ...values, product_id: 'ecommerce-product-hidden' } })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_WISHLIST_PRODUCT_UNAVAILABLE' });
    const created = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', values }) as any;
    const replay = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', values: { ...values, item_id: 'ecommerce-wishlist-customer-test-chair-replay' } }) as any;
    expect(created).toMatchObject({ id: values.item_id, product_id: values.product_id, product_name: 'Ergonomic Office Chair', row_version: 1 });
    expect(replay).toMatchObject({ id: values.item_id, product_id: values.product_id });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_wishlist_items WHERE wishlist_id = ?', [values.wishlist_id]))[0].count).toBe(1);
    await expect(repository.executeMutation(remove.mutation, { id: values.item_id, wishlist_id: values.wishlist_id, expected_row_version: 1, current_company_name: 'My Company', customer_scope: 'own', current_user_email: 'other@example.com' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_STALE' });
    const removed = await repository.executeMutation(remove.mutation, { id: values.item_id, wishlist_id: values.wishlist_id, expected_row_version: 1, current_company_name: 'My Company', customer_scope: 'own', current_user_email: 'hello@workspace.example' }) as any;
    expect(removed).toMatchObject({ removed: true, id: values.item_id });
    await expect(repository.executeMutation(remove.mutation, { id: values.item_id, wishlist_id: values.wishlist_id, expected_row_version: 1, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_WISHLIST_STALE' });
    database.close();
  });

  test('supports the public cookie wishlist add/list/remove contract', async () => {
    const calls: any[] = [];
    const module = new EcommerceModule();
    const service = { async call(operation: string, request: any) {
      calls.push({ operation, request });
      if (operation === 'ecommerce.public.wishlist') return { items: [{ id: 'ecommerce-wishlist-anon-a-item', product_id: 'ecommerce-product-mug' }] };
      return { id: request.values.item_id, product_id: request.values.product_id, row_version: 1 };
    } };
    const missing = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/wishlist', { method: 'GET' }), new URL('http://core3.test/api/public/ecommerce/wishlist'), service);
    expect(await missing?.json()).toEqual({ wishlist_id: null, items: [] });
    const invalid = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/wishlist', { method: 'POST', body: '{}' }), new URL('http://core3.test/api/public/ecommerce/wishlist'), service);
    expect(invalid?.status).toBe(422);
    const added = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/wishlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ product_id: 'ecommerce-product-mug' }) }), new URL('http://core3.test/api/public/ecommerce/wishlist'), service);
    const cookie = added?.headers.get('set-cookie') || '';
    expect(cookie).toMatch(/^core3_ecommerce_wishlist=ecommerce-wishlist-anon-/);
    const wishlistId = cookie.match(/=(ecommerce-wishlist-anon-[^;]+)/)?.[1] as string;
    expect(calls[0].operation).toBe('ecommerce.wishlist.public_add');
    const listed = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/wishlist', { headers: { cookie } }), new URL('http://core3.test/api/public/ecommerce/wishlist'), service);
    expect(await listed?.json()).toMatchObject({ wishlist_id: wishlistId, items: [{ product_id: 'ecommerce-product-mug' }] });
    const removed = await module.handlePublicRoute(new Request(`http://core3.test/api/public/ecommerce/wishlist/${wishlistId}-ecommerce-product-mug`, { method: 'DELETE', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ expected_row_version: 1 }) }), new URL(`http://core3.test/api/public/ecommerce/wishlist/${wishlistId}-ecommerce-product-mug`), service);
    expect(removed?.status).toBe(200);
    expect(calls.at(-1)).toMatchObject({ operation: 'ecommerce.wishlist.public_remove', request: { values: { wishlist_id: wishlistId, session_key: wishlistId, expected_row_version: 1 } } });
  });

  test('preserves a customer wishlist item across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-wishlist-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_wishlist_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const add = action(yaml('api/wishlist.yaml'), 'add_ecommerce_wishlist_item');
      const item = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', values: { wishlist_id: 'ecommerce-wishlist-restart', item_id: 'ecommerce-wishlist-restart-lamp', owner_type: 'customer', customer_id: 'ecommerce-customer-001', customer_name: 'Acme Corporation', customer_email: 'hello@workspace.example', product_id: 'ecommerce-product-lamp', variant_id: null, variant_key: '', company_name: 'My Company', session_key: '', website_id: 'core3-main-website', currency: 'USD' } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(second);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT product_id, product_name, price, row_version FROM ecommerce_wishlist_items WHERE id = ?', [item.id])).toEqual([{ product_id: 'ecommerce-product-lamp', product_name: 'Desk Lamp', price: 46.5, row_version: 1 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
