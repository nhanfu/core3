import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');
const yaml = (relative: string) => Bun.YAML.parse(read(relative)) as any;

describe('Purchase Analysis graph and pivot parity', () => {
  test('keeps the report page layout-only and joins its API by page id', () => {
    const page = yaml('services/purchase/pages/analysis.yaml');
    const api = yaml('services/purchase/api/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((datasource: any) => datasource.id === 'purchase_analysis_report');
    const discovered = discoverPages(root);

    expect(page.page.id).toBe('purchase-analysis');
    expect(page.page.route).toBe('/purchase-analysis');
    expect(api.page.id).toBe('purchase-analysis');
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('purchase-analysis')).toEqual(expect.arrayContaining(['purchase_analysis_totals', 'purchase_analysis_report']));
    expect(list.source).toBe('purchase_analysis_report');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph']);
    expect(source.permission).toBe('purchase.read');
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['vendor_name', 'order_month', 'ordered_quantity', 'billed_quantity', 'untaxed_total', 'total_amount']));
    expect(source.query).toContain('order_month');
    expect(source.query).toContain(':q');
  });

  test('matches the Odoo report controls and deterministic empty-state contract', () => {
    const page = yaml('services/purchase/pages/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');

    expect(graph).toMatchObject({ label: 'Graph', category_field: 'vendor_name', measure_field: 'total_amount', type: 'bar' });
    expect(pivot.pivot.config_label).toBe('Measures');
    expect(pivot.pivot.default).toMatchObject({ rows: ['vendor_name'], columns: ['order_month'] });
    expect(pivot.pivot.default.measures.map((measure: any) => measure.field)).toEqual(['ordered_quantity', 'received_quantity', 'untaxed_total', 'total_amount']);
    expect(list.empty_state).toMatchObject({ title: 'No purchase analysis data' });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Reference', 'Order Date', 'Vendor', 'Buyer', 'Product', 'Ordered Qty',
      'Received Qty', 'Billed Qty', 'Total', 'Status',
    ]);
  });

  test('returns deterministic scoped rows, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'services/purchase/migrations'), undefined, 'purchase_analysis_test_schema_migrations', ['schema', 'data']);
    const source = yaml('services/purchase/api/analysis.yaml').datasources.find((item: any) => item.id === 'purchase_analysis_report');

    const defaultOrders = await repository.querySource(source, { q: null, report_scope: null, fixture_state: null }, 0, 50);
    expect(defaultOrders.data).toHaveLength(8);
    expect(defaultOrders.data.slice(0, 3).map((row: any) => row.order_reference)).toEqual(['PO/2026/0008', 'PO/2026/0002', 'PO/2026/0001']);
    expect(defaultOrders.data[0]).toMatchObject({ vendor_name: 'Northwind Components', product_name: 'Industrial label printers', ordered_quantity: 6, received_quantity: 0, billed_quantity: 0, total_amount: 1560 });
    expect((await repository.querySource(source, { q: 'Northwind', fixture_state: null }, 0, 50)).data.map((row: any) => row.order_reference)).toEqual(['PO/2026/0008', 'PO/2026/0002', 'PO/2026/0005']);
    expect((await repository.querySource(source, { q: 'does-not-exist', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_ANALYSIS_UNAVAILABLE' });
    database.close();
  });
});
