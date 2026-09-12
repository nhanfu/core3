import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Unpaid Orders parity', () => {
  test('joins the unpaid order page/API and reuses the order detail surface', () => {
    const page = yaml('pages/unpaid-orders.yaml');
    const api = yaml('api/unpaid-orders.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-unpaid-orders', route: '/ecommerce/unpaid-orders' });
    expect(api.page).toEqual({ id: 'ecommerce-unpaid-orders' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_unpaid_orders', row_open_action: 'view_ecommerce_unpaid_order' });
    expect(api.actions[0].navigate_to).toBe('/ecommerce/orders/detail');
  });

  test('returns only unpaid states and explicit empty/error contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_unpaid_orders_test', ['schema', 'data']);
    const api = yaml('api/unpaid-orders.yaml');
    const source = api.datasources[0];
    const params = { q: null, fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.order_number)).toEqual(['WEB/2026/0002', 'WEB/2026/0001']);
    expect(rows.every((row: any) => ['Quotation', 'Sale Order'].includes(row.state))).toBe(true);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
