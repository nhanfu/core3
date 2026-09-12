import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Customers parity', () => {
  test('joins the customer page/API and order navigation action', () => {
    const page = yaml('pages/customers.yaml');
    const api = yaml('api/customers.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-customers', route: '/ecommerce/customers' });
    expect(api.page).toEqual({ id: 'ecommerce-customers' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_customers', row_open_action: 'view_ecommerce_customer_orders' });
    expect(api.actions[0].navigate_to).toBe('/ecommerce/orders');
  });

  test('serves deterministic customer summaries and explicit read boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_customers_test', ['schema', 'data']);
    const api = yaml('api/customers.yaml');
    const source = api.datasources[0];
    const params = { q: null, active: true, fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Acme Corporation', 'Nguyen Workspace', 'Northwind Traders']);
    expect((await repository.querySource(source, { ...params, q: 'northwind' }, 0, 50)).data[0].order_count).toBe(1);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
