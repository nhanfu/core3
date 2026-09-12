import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import EcommerceModule from '../services/ecommerce/module';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Shop parity', () => {
  test('serves the published catalog through the public shop endpoint', async () => {
    const calls: any[] = [];
    const module = new EcommerceModule();
    const service = { async call(operation: string, request: any) { calls.push({ operation, request }); if (operation === 'ecommerce.public.cart') return { lines: [{ product_id: 'ecommerce-product-mug', quantity: 1, amount_total: 25 }] }; if (operation === 'ecommerce.cart.anonymous_add') return { id: request.values.line_id, product_id: request.values.product_id, quantity: 1 }; return { products: [{ id: 'ecommerce-product-mug', name: 'Core3 Ceramic Mug' }] }; } };
    const response = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop?q=mug'), new URL('http://core3.test/api/public/ecommerce/shop?q=mug'), service);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ products: [{ id: 'ecommerce-product-mug', name: 'Core3 Ceramic Mug' }] });
    expect(calls).toEqual([{ operation: 'ecommerce.public.shop', request: { q: 'mug' } }]);
    expect((await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop', { method: 'POST' }), new URL('http://core3.test/api/public/ecommerce/shop'), service))?.status).toBe(405);
    const addResponse = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: 'ecommerce-product-mug' }) }), new URL('http://core3.test/api/public/ecommerce/cart'), service);
    expect(addResponse?.status).toBe(200);
    expect(addResponse?.headers.get('set-cookie')).toMatch(/^core3_ecommerce_cart=ecommerce-cart-anon-/);
    const cartId = addResponse?.headers.get('set-cookie')?.match(/=(ecommerce-cart-anon-[^;]+)/)?.[1];
    const cartResponse = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/cart', { headers: { cookie: `core3_ecommerce_cart=${cartId}` } }), new URL('http://core3.test/api/public/ecommerce/cart'), service);
    expect(await cartResponse?.json()).toMatchObject({ cart_id: cartId, amount_total: 25 });
  });
  test('joins the shop page/API and cart navigation actions', () => {
    const page = yaml('pages/shop.yaml');
    const api = yaml('api/shop.yaml');
    const manifest = yaml('manifest.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop', route: '/ecommerce/shop' });
    expect(api.page).toEqual({ id: 'ecommerce-shop' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_shop_products' });
    expect(api.actions.find((action: any) => action.id === 'shop_add_to_cart')).toMatchObject({ type: 'server', action: 'ecommerce.cart.add' });
    expect(api.actions.find((action: any) => action.id === 'anonymous_shop_add_to_cart')).toMatchObject({ type: 'server', action: 'ecommerce.cart.anonymous_add' });
    expect(api.actions.find((action: any) => action.id === 'shop_view_cart')).toMatchObject({ type: 'navigate', navigate_to: '/ecommerce/cart' });
    expect(manifest.menu.groups[0].items.map((item: any) => item.path)).toContain('/ecommerce/shop');
  });

  test('returns only active published products and explicit error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_shop_test', ['schema', 'data']);
    const api = yaml('api/shop.yaml');
    const source = api.datasources[0];
    const params = { q: null, fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Core3 Ceramic Mug', 'Ergonomic Office Chair', 'Desk Lamp']);
    expect(rows.every((row: any) => row.active === true && row.is_published === true)).toBe(true);
    const operation = yaml('operations.yaml').operations['ecommerce.public.shop'];
    const bound = bindNamedParams(operation.query, { q: null });
    expect((await repository.query(bound.statement, bound.values)).map((row: any) => row.name)).toEqual(rows.map((row: any) => row.name));
    const addToCart = api.actions.find((action: any) => action.id === 'shop_add_to_cart');
    const added = await repository.executeMutation(addToCart.mutation, { values: { product_id: 'ecommerce-product-mug' }, customer_scope: 'own', current_user_email: 'hello@workspace.example' });
    expect(added).toMatchObject({ cart_id: 'ecommerce-cart-ecommerce-customer-002', product_id: 'ecommerce-product-mug', quantity: 1 });
    const addedAgain = await repository.executeMutation(addToCart.mutation, { values: { product_id: 'ecommerce-product-mug' }, customer_scope: 'own', current_user_email: 'hello@workspace.example' });
    expect(addedAgain).toMatchObject({ cart_id: 'ecommerce-cart-ecommerce-customer-002', product_id: 'ecommerce-product-mug', quantity: 2 });
    const anonymousAdd = api.actions.find((action: any) => action.id === 'anonymous_shop_add_to_cart');
    const anonymous = await repository.executeMutation(anonymousAdd.mutation, { values: { cart_id: 'ecommerce-cart-anon-shop-test', line_id: 'ecommerce-cart-anon-shop-test-ecommerce-product-mug', product_id: 'ecommerce-product-mug' } });
    expect(anonymous).toMatchObject({ cart_id: 'ecommerce-cart-anon-shop-test', product_id: 'ecommerce-product-mug', quantity: 1 });
    const anonymousAgain = await repository.executeMutation(anonymousAdd.mutation, { values: { cart_id: 'ecommerce-cart-anon-shop-test', line_id: 'ecommerce-cart-anon-shop-test-ecommerce-product-mug', product_id: 'ecommerce-product-mug' } });
    expect(anonymousAgain).toMatchObject({ quantity: 2 });
    expect((await repository.query('SELECT customer_id, quantity FROM ecommerce_carts c JOIN ecommerce_cart_lines l ON l.cart_id = c.id WHERE c.id = ?', ['ecommerce-cart-anon-shop-test']))[0]).toEqual({ customer_id: null, quantity: 2 });
    await expect(repository.executeMutation(anonymousAdd.mutation, { values: { cart_id: 'ecommerce-cart-open-001', line_id: 'ecommerce-cart-open-001-ecommerce-product-mug', product_id: 'ecommerce-product-mug' } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PUBLIC_CART_INVALID' });
    expect((await repository.querySource(source, { ...params, q: 'setup' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
