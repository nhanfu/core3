import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const historyApi = () => yaml('api/purchase-product-history.yaml');

async function seededRepository() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_history_schema_migrations', ['schema', 'data']);
  return repository;
}

describe('Purchase Product History parity', () => {
  test('binds the product stat action to the layout-only history page', () => {
    const detailApi = yaml('api/purchase-product-detail.yaml');
    const detailPage = yaml('pages/purchase-product-detail.yaml');
    const historyPage = yaml('pages/purchase-product-history.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const historyView = historyPage.components[0];
    const historySource = historyApi().datasources.find((source: any) => source.id === 'purchase_product_history');
    const purchased = detailApi.actions.find((action: any) => action.id === 'purchase_product_orders');

    expect(historyPage.datasources).toBeUndefined();
    expect(historyPage.page).toMatchObject({ id: 'purchase-product-history', route: '/purchase/products/history', auth: { require: ['purchase.read'] } });
    expect(historySource.permission).toBe('purchase.read');
    expect(discovered.pageDatasources.get('purchase-product-history')).toEqual(['purchase_product_history']);
    expect(purchased).toMatchObject({ navigate_to: '/purchase/products/history', permission: 'purchase.read', params: { product_name: '{row.name}' } });
    expect(detailPage.components[0].stat_buttons).toEqual(expect.arrayContaining([{ id: 'purchase_product_orders', label: 'Purchased', value_field: 'purchased_qty' }]));
    expect(historyView).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'purchase_product_history', view_navigation: 'tabs' });
    expect(historyView.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph']);
    expect(historyView.columns.map((column: any) => column.label)).toEqual(['Order Reference', 'Confirmation Date', 'Vendor', 'Company', 'Quantity', 'Unit Price', 'Total Untaxed']);
  });

  test('serves deterministic history with product filtering, search, empty, and transport states', async () => {
    const repository = await seededRepository();
    const source = historyApi().datasources.find((candidate: any) => candidate.id === 'purchase_product_history');
    const params = { product_name: 'Acoustic Bloc Screens', q: null, fixture_state: null };
    const acoustic = await repository.querySource(source, params, 0, 50);

    expect(acoustic.data).toHaveLength(1);
    expect(acoustic.data[0]).toMatchObject({ order_name: 'PO/2026/0001', vendor_name: 'Wood Corner', quantity: 20, total_untaxed: 5736, total_untaxed_display: '$ 5,736.00' });
    expect((await repository.querySource(source, { ...params, q: 'Wood Corner' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, q: 'PO/2026/9999' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_PRODUCT_HISTORY_UNAVAILABLE' });

    const all = await repository.querySource(source, { product_name: null, q: null, fixture_state: null }, 0, 50);
    expect(all.data).toHaveLength(4);
  });

  test('keeps the Purchased stat aligned with the seeded history', async () => {
    const repository = await seededRepository();
    const detail = yaml('api/purchase-product-detail.yaml').datasources.find((candidate: any) => candidate.id === 'purchase_product_detail');
    const product = await repository.querySource(detail, { id: 'purchase-product-acoustic', fixture_state: null }, 0, 1);
    expect(product.data).toMatchObject({ name: 'Acoustic Bloc Screens', purchased_qty: 20 });
  });
});
