import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Abandoned Carts parity', () => {
  test('joins the abandoned cart page/API and declares detail navigation', () => {
    const page = yaml('pages/abandoned-carts.yaml');
    const api = yaml('api/abandoned-carts.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-abandoned-carts', route: '/ecommerce/abandoned-carts' });
    expect(api.page).toEqual({ id: 'ecommerce-abandoned-carts' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_abandoned_carts' });
    expect(api.actions[0].navigate_to).toBe('/ecommerce/abandoned-carts/detail');
  });

  test('serves deterministic abandoned carts and explicit read boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_abandoned_carts_test', ['schema', 'data']);
    const source = yaml('api/abandoned-carts.yaml').datasources[0];
    const params = { q: null, fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.cart_number)).toEqual(['CART/2026/0002', 'CART/2026/0001']);
    expect(rows.every((row: any) => row.state === 'Abandoned')).toBe(true);
    expect((await repository.querySource(source, { ...params, q: 'acme' }, 0, 50)).data[0].customer_name).toBe('Acme Corporation');
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
