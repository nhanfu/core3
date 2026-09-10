import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Sales salesperson analysis parity slice', () => {
  it('binds the Reporting -> Salespersons menu to a disjoint page/API route', () => {
    const page = yaml('pages/sale-reporting-salespersons.yaml');
    const api = yaml('api/sale-reporting-salespersons.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const discovered = discoverPages(sampleRoot);

    expect(page.page).toMatchObject({
      id: 'sale-reporting-salespersons',
      route: '/order/reporting/salespersons',
      breadcrumb: ['Sales', 'Reporting', 'Sales Analysis By Salespersons'],
    });
    expect(api.page).toEqual({ id: 'sale-reporting-salespersons' });
    expect(page.datasources).toBeUndefined();
    expect(reporting.items).toContainEqual({ path: '/order/reporting/salespersons', label: 'Salespersons', icon: 'users', permission: 'orders.read' });
    expect(discovered.pageDatasources.get(page.page.id)).toEqual(['sale_report_salespersons']);
    expect(discoverPageRoutes(discovered).filter((route: any) => route.path === page.page.route)).toEqual([
      { path: page.page.route, page: page.page.id, module: 'order' },
    ]);
  });

  it('clones the Odoo salesperson action graph/pivot defaults and search states', () => {
    const page = yaml('pages/sale-reporting-salespersons.yaml');
    const api = yaml('api/sale-reporting-salespersons.yaml');
    const list = page.components[0];
    const source = api.datasources[0];

    expect(page.title).toBe('Sales Analysis By Salespersons');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views[0]).toMatchObject({ type: 'bar', category_field: 'salesperson_name', measure_field: 'quantity_ordered', measure_label: 'Qty Ordered' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['salesperson_name'] });
    expect(list.group_by).toEqual([{ field: 'salesperson_name', label: 'Salesperson' }]);
    expect(list.default_group_by).toBe('salesperson_name');
    expect(list.date_range).toMatchObject({ default_preset: 'last_12_months', from_field: 'from_date', to_field: 'to_date' });
    expect(list.empty_state).toMatchObject({ title: 'No sales data' });
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'SALES_SALESPERSON_REPORT_UNAVAILABLE' });
    expect(String(source.query)).toContain("COALESCE(o.salesperson_name, o.created_by) ILIKE '%' || :q || '%'");
    expect(String(source.query)).toContain("IN ('Approved', 'Pending Approval')");
    expect(String(source.query)).toContain('CAST(:from_date AS DATE)');
    expect(String(source.query)).toContain('CAST(:to_date AS DATE)');
  });

  it('returns deterministic named salesperson totals and enforces empty/error/read-only boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_salespersons_report_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_salespersons_report_test_migrations', ['schema', 'data']);

    const page = yaml('pages/sale-reporting-salespersons.yaml');
    const api = yaml('api/sale-reporting-salespersons.yaml');
    const source = api.datasources[0];
    const params = { q: null, from_date: '2026-01-01', to_date: '2026-12-31', fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 80);
    expect(rows.data.map((row: any) => row.salesperson_name)).toEqual(expect.arrayContaining([
      'Avery Chen', 'Taylor Nguyen', 'Jordan Lee', 'Priya Patel',
    ]));

    const expectedFixtures = [
      ['Avery Chen', 18, 45000],
      ['Taylor Nguyen', 15, 30000],
      ['Jordan Lee', 9, 18000],
      ['Priya Patel', 3, 9000],
    ];
    for (const [salesperson, quantity, revenue] of expectedFixtures) {
      const filtered = await repository.querySource(source, { ...params, q: salesperson }, 0, 80);
      expect(filtered.data).toEqual([expect.objectContaining({ salesperson_name: salesperson, order_count: 1, quantity_ordered: quantity, total_revenue: revenue, avg_order_value: revenue })]);
    }
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 80)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 80)).rejects.toMatchObject({ status: 503, code: 'SALES_SALESPERSON_REPORT_UNAVAILABLE' });

    expect(page.page.auth.require).toEqual(['orders.read']);
    expect(source.permission).toBe('orders.read');
    expect(page.actions).toBeUndefined();
    expect(api.actions).toBeUndefined();
    expect(readFileSync(join(serviceRoot, 'migrations/20260910200000-015-sales-salesperson-report-fixtures.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    await database.close();
  }, 30000);
});
