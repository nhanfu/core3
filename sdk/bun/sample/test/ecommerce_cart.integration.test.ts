import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Cart parity', () => {
  test('joins the cart page/API and line datasource', () => {
    const page = yaml('pages/cart.yaml');
    const api = yaml('api/cart.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-cart', route: '/ecommerce/cart' });
    expect(api.page).toEqual({ id: 'ecommerce-cart' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_cart' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_cart', 'ecommerce_cart_lines']);
  });

  test('projects deterministic cart totals and guards quantity updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_cart_test', ['schema', 'data']);
    const api = yaml('api/cart.yaml');
    const cart = await repository.querySource(api.datasources[0], { id: 'ecommerce-cart-open-001', fixture_state: null }, 0, 1);
    expect(cart.data).toMatchObject({ customer_name: 'Acme Corporation', item_count: 3, amount_total: 285 });
    const lines = await repository.querySource(api.datasources[1], { cart_id: 'ecommerce-cart-open-001' }, 0, 50);
    expect(lines.data.map((row: any) => row.quantity)).toEqual([2, 1]);
    const action = api.actions.find((candidate: any) => candidate.id === 'update_ecommerce_cart_line');
    await expect(repository.executeMutation(action.mutation, { id: 'ecommerce-cart-line-001', values: { quantity: 0 }, expected_version: 1 })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CART_QUANTITY_INVALID' });
    database.close();
  });
});
