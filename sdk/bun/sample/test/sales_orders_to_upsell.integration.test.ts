import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Sales orders to upsell parity slice', () => {
  test('binds the Odoo menu, page, and separate API contract', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/sale-orders-to-upsell.yaml');
    const api = yaml('api/sale-orders-to-upsell.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'to-invoice').items;
    expect(menu).toContainEqual({ path: '/order/orders-to-upsell', label: 'Orders to Upsell', icon: 'trending-up', permission: 'orders.read' });
    expect(page.page).toMatchObject({ id: 'sale-orders-to-upsell', route: '/order/orders-to-upsell' });
    expect(api.page).toEqual({ id: 'sale-orders-to-upsell' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'sale_orders_to_upsell' });
    expect(page.components[0].create_action).toBeUndefined();
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('sale-orders-to-upsell')).toContain('sale_orders_to_upsell');
  });

  test('returns deterministic upsell records and honest empty, error, and scope states', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_upselling_acceptance', ['schema', 'data']);
    const source = yaml('api/sale-orders-to-upsell.yaml').datasources[0];
    const params = { q: null, view_scope: 'all', current_branch_id: null, fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows).toEqual([expect.objectContaining({ id: 'order-demo-06', order_number: 'DH-2026-0106', invoice_status: 'Upselling' })]);
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, view_scope: 'branch', current_branch_id: 'branch-hn' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'SALES_ORDERS_TO_UPSELL_UNAVAILABLE' });
    expect(source.permission).toBe('orders.read');
    await database.close();
  });
});
