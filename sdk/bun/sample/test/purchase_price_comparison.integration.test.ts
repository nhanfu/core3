import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Purchase price comparison parity', () => {
  test('binds the source stat action through page-id-separated contracts', () => {
    const page = yaml('pages/purchase-price-comparison.yaml');
    const api = yaml('api/purchase-price-comparison.yaml');
    const detail = yaml('pages/purchase-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'purchase-price-comparison', route: '/purchase/price-comparison', auth: { require: ['purchase.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'purchase-price-comparison' });
    expect(discovered.pageDatasources.get('purchase-price-comparison')).toEqual(['purchase_price_comparison']);
    expect(api.actions).toEqual([expect.objectContaining({ id: 'open_purchase_price_comparison', permission: 'purchase.read', navigate_to: '/purchase/price-comparison' })]);
    expect(detail.components[0].stat_buttons).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'open_purchase_price_comparison', label: 'Price Comparison', permission: 'purchase.read' })]));
  });

  test('serves only the selected order products with deterministic comparison history', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'purchase_price_comparison_migrations', ['schema', 'data']);
    const source = yaml('api/purchase-price-comparison.yaml').datasources[0];
    const rows = await repository.querySource(source, { id: 'po-demo-006', q: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data.map((row: any) => row.vendor_name)).toEqual(['Saigon Office Goods', 'Wood Corner']);
    expect(rows.data[0]).toMatchObject({ product_name: 'Ergonomic office desks', unit_price: 420, total_untaxed: 3360, unit_price_display: '$ 420.00' });
    expect((await repository.querySource(source, { id: 'po-demo-006', q: 'Wood Corner', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { id: 'po-demo-006', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { id: 'po-demo-006', q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_PRICE_COMPARISON_UNAVAILABLE' });
    database.close();
  });
});
