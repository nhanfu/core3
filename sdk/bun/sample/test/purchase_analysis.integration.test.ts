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
    const source = api.datasources.find((datasource: any) => datasource.id === 'purchase_analysis');
    const discovered = discoverPages(root);

    expect(page.page.id).toBe('purchase-analysis');
    expect(page.page.route).toBe('/purchase-analysis');
    expect(api.page.id).toBe('purchase-analysis');
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('purchase-analysis')).toContain('purchase_analysis');
    expect(list.source).toBe('purchase_analysis');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.default_filters).toEqual({ report_scope: 'orders' });
    expect(source.permission).toBe('purchase.read');
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['category_name', 'name', 'qty_billed', 'untaxed_total', 'total_amount']));
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PURCHASE_ANALYSIS_UNAVAILABLE' });
    expect(source.query).toContain('confirmation_month');
    expect(source.query).toContain(':q');
    expect(source.query).toContain(':report_scope');
  });

  test('matches the Odoo report controls and deterministic empty-state contract', () => {
    const page = yaml('services/purchase/pages/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');

    expect(graph).toMatchObject({ label: 'Graph', category_field: 'confirmation_date', measure_field: 'untaxed_total', type: 'line' });
    expect(pivot.pivot.config_label).toBe('Measures');
    expect(pivot.pivot.default).toMatchObject({ rows: ['category_name', 'name'], columns: [] });
    expect(pivot.pivot.default.measures.map((measure: any) => measure.field)).toEqual(['untaxed_total', 'total_amount']);
    expect(graph.measures.map((measure: any) => measure.label)).toEqual(['Count', 'Untaxed Total', 'Total']);
    expect(list.empty_state).toMatchObject({ title: 'No purchase analysis records' });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Order', 'Confirmation Date', 'Vendor', 'Vendor Country', 'Buyer', 'Product',
      'Product Category', 'Company', 'Ordered Quantity', 'Received Quantity',
      'Billed Quantity', 'Untaxed Total', 'Total', 'Status',
    ]);
  });

  test('returns deterministic scoped rows, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'services/purchase/migrations'), undefined, 'purchase_analysis_test_schema_migrations', ['schema', 'data']);
    const source = yaml('services/purchase/api/analysis.yaml').datasources[0];

    const defaultOrders = await repository.querySource(source, { q: null, report_scope: null, fixture_state: null }, 0, 50);
    expect(defaultOrders.data).toHaveLength(5);
    expect(defaultOrders.data.slice(0, 3).map((row: any) => row.name)).toEqual(['PO/2026/0003', 'PO/2026/0007', 'PO/2026/0006']);
    expect(defaultOrders.data[0]).toMatchObject({ category_name: 'Furniture / Office', qty_billed: 0, untaxed_total: 2220, total_amount: 2220 });

    const orders = await repository.querySource(source, { q: null, report_scope: 'orders', fixture_state: null }, 0, 50);
    expect(orders.data).toHaveLength(5);
    expect(orders.data.map((row: any) => row.state)).toEqual(['Confirmed', 'Confirmed', 'Received', 'Confirmed', 'To Approve']);
    expect((await repository.querySource(source, { q: 'Northwind', report_scope: 'orders', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['PO/2026/0005', 'PO/2026/0008']);
    expect((await repository.querySource(source, { q: 'does-not-exist', report_scope: 'orders', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, report_scope: 'orders', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, report_scope: 'orders', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_ANALYSIS_UNAVAILABLE' });
    database.close();
  });
});
