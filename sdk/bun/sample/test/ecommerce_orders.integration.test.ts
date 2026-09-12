import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Orders parity', () => {
  test('joins the Odoo Orders page and API contract', () => {
    const page = yaml('pages/orders.yaml');
    const api = yaml('api/orders.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-orders', route: '/ecommerce/orders' });
    expect(api.page).toEqual({ id: 'ecommerce-orders' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_orders', row_open_action: 'view_ecommerce_order' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_orders', 'ecommerce_order_states']);
  });

  test('serves deterministic searchable orders and explicit read boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_orders_test', ['schema', 'data']);
    const source = yaml('api/orders.yaml').datasources[0];
    const params = { q: null, state: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.order_number)).toEqual(['WEB/2026/0003', 'WEB/2026/0002', 'WEB/2026/0001']);
    expect((await repository.querySource(source, { ...params, q: 'acme' }, 0, 50)).data[0].customer_name).toBe('Acme Corporation');
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
