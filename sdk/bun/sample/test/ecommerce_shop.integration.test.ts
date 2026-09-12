import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Shop parity', () => {
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
    expect((await repository.querySource(source, { ...params, q: 'setup' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
