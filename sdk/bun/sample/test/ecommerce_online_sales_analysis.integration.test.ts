import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Online Sales Analysis parity', () => {
  test('binds the Website Sale report action to separate page and API YAML', () => {
    const page = yaml('pages/online-sales-analysis.yaml');
    const api = yaml('api/online-sales-analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');

    expect(page.page).toMatchObject({
      id: 'ecommerce-online-sales-analysis',
      route: '/ecommerce/reporting/online-sales-analysis',
      breadcrumb: ['eCommerce', 'Reporting', 'Online Sales Analysis'],
    });
    expect(api.page).toEqual({ id: 'ecommerce-online-sales-analysis' });
    expect(page.datasources).toBeUndefined();
    expect(reporting.items).toContainEqual(expect.objectContaining({
      path: '/ecommerce/reporting/online-sales-analysis',
      label: 'Online Sales Analysis',
      permission: 'ecommerce.read',
    }));

    expect(page.components[0].source).toBe('ecommerce_online_sales_analysis');
    expect(api.datasources.map((source: any) => source.id)).toContain('ecommerce_online_sales_analysis');
  });

  test('clones Odoo Online Sales Analysis defaults, search, grouping, and views', () => {
    const page = yaml('pages/online-sales-analysis.yaml');
    const api = yaml('api/online-sales-analysis.yaml');
    const list = page.components[0];
    const source = api.datasources[0];

    expect(list.views.map((view: any) => view.id)).toEqual(['pivot', 'graph']);
    expect(list.default_filters).toEqual({ state: 'Sale Order' });
    expect(list.date_range).toMatchObject({ default_preset: 'month', from_field: 'from_date', to_field: 'to_date' });
    expect(list.group_by).toEqual(expect.arrayContaining([
      { field: 'website_name', label: 'Website' },
      { field: 'product_name', label: 'Product' },
      { field: 'category', label: 'Product Category' },
      { field: 'customer_name', label: 'Customer' },
      { field: 'country', label: 'Customer Country' },
      { field: 'state', label: 'Status' },
      { field: 'date_month', label: 'Order Date' },
    ]));
    expect(list.views[0].pivot.default).toMatchObject({ rows: ['date_month'], columns: ['state'] });
    expect(list.views[1]).toMatchObject({ type: 'line', category_field: 'date_month', measure_field: 'untaxed_total' });
    expect(list.empty_state.title).toBe("You don't have any order from the website");
    expect(source.permission).toBe('ecommerce.read');
    expect(source.pivot.fields).toContain('untaxed_total');
    expect(String(source.query)).toContain("o.state = :state");
    expect(String(source.query)).toContain('CAST(:from_date AS DATE)');
    expect(String(source.query)).toContain('CAST(:to_date AS DATE)');
  });

  test('returns durable confirmed website order lines and guards empty/search/date states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_online_sales_analysis_test', ['schema', 'data']);
    const source = yaml('api/online-sales-analysis.yaml').datasources[0];
    const params = { company_name: 'My Company', q: null, state: 'Sale Order', from_date: null, to_date: null, fixture_state: null };

    const confirmed = await repository.querySource(source, params, 0, 80);
    expect(confirmed.data.map((row: any) => row.order_number)).toEqual(['WEB/2026/0001', 'WEB/2026/0001']);
    expect(confirmed.data[0]).toMatchObject({ product_name: 'Core3 Ceramic Mug', category: 'All / Accessories', website_name: 'Core3 Website', state: 'Sale Order', untaxed_total: 18 });
    expect((await repository.querySource(source, { ...params, q: 'chair' }, 0, 80)).data[0]).toMatchObject({ product_name: 'Ergonomic Office Chair', untaxed_total: 249 });
    expect((await repository.querySource(source, { ...params, from_date: '2026-09-02' }, 0, 80)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 80)).data).toEqual([]);
    expect(source.error_states.unauthorized.status).toBe(401);
    expect(source.error_states.forbidden.status).toBe(403);
    expect(source.error_states.transport_error.status).toBe(503);
    database.close();
  });
});
