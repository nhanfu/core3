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
    const service = { async call(operation: string, request: any) { calls.push({ operation, request }); return { products: [{ id: 'ecommerce-product-mug', name: 'Core3 Ceramic Mug' }] }; } };
    const response = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop?q=mug'), new URL('http://core3.test/api/public/ecommerce/shop?q=mug'), service);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ products: [{ id: 'ecommerce-product-mug', name: 'Core3 Ceramic Mug' }] });
    expect(calls).toEqual([{ operation: 'ecommerce.public.shop', request: { q: 'mug' } }]);
    expect((await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop', { method: 'POST' }), new URL('http://core3.test/api/public/ecommerce/shop'), service))?.status).toBe(405);
  });
  test('joins the shop page/API and cart navigation actions', () => {
    const page = yaml('pages/shop.yaml');
    const api = yaml('api/shop.yaml');
    const manifest = yaml('manifest.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop', route: '/ecommerce/shop' });
    expect(api.page).toEqual({ id: 'ecommerce-shop' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_shop_products' });
    expect(api.actions.map((action: any) => action.navigate_to)).toEqual(['/ecommerce/cart', '/ecommerce/cart']);
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
    expect((await repository.querySource(source, { ...params, q: 'setup' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
