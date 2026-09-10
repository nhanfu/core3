import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Sales customer analysis parity slice', () => {
  it('binds a disjoint page/API route to the installed Odoo customer report action', () => {
    const page = yaml('pages/sale-reporting-customers.yaml');
    const api = yaml('api/sale-reporting-customers.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    expect(page.page).toMatchObject({ id: 'sale-reporting-customers', route: '/order/reporting/customers', breadcrumb: ['Sales', 'Reporting', 'Sales Analysis By Customers'] });
    expect(api.page).toEqual({ id: 'sale-reporting-customers' });
    expect(page.datasources).toBeUndefined();
    expect(reporting.items).toContainEqual(expect.objectContaining({ path: '/order/reporting/customers', label: 'Customers', permission: 'orders.read' }));
    expect(['sale-reporting-sales', 'sale-reporting-salespersons', 'sale-reporting-products']).not.toContain(page.page.id);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(['/order/reporting/sales', '/order/reporting/salespersons', '/order/reporting/products']).not.toContain(page.page.route);
    expect(discoverPageRoutes(discovered).filter((route: any) => route.path === page.page.route)).toEqual([{ path: page.page.route, page: page.page.id, module: 'order' }]);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('sale_report_customers');
  });

  it('clones Odoo graph/pivot defaults, customer grouping, search, date range, and empty state', () => {
    const page = yaml('pages/sale-reporting-customers.yaml');
    const api = yaml('api/sale-reporting-customers.yaml');
    const list = page.components[0];
    const source = api.datasources.find((item: any) => item.id === 'sale_report_customers');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views[0]).toMatchObject({ type: 'bar', category_field: 'customer_name', measure_field: 'quantity_ordered', measure_label: 'Qty Ordered' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['customer_name'] });
    expect(list.group_by).toEqual([{ field: 'customer_name', label: 'Customer' }]);
    expect(list.default_group_by).toBe('customer_name');
    expect(list.date_range).toMatchObject({ default_preset: 'last_12_months', from_field: 'from_date', to_field: 'to_date' });
    expect(list.empty_state).toMatchObject({ title: 'No sales data' });
    expect(String(source.query)).toContain("o.customer_name ILIKE '%' || :q || '%'");
    expect(String(source.query)).toContain('CAST(:from_date AS DATE)');
    expect(String(source.query)).toContain('CAST(:to_date AS DATE)');
  });

  it('keeps read permission, transport error, no-CRUD behavior, and fixed fixtures explicit', () => {
    const page = yaml('pages/sale-reporting-customers.yaml');
    const api = yaml('api/sale-reporting-customers.yaml');
    const source = api.datasources[0];
    const migration = yaml('migrations/20260910190000-014-sales-customer-report-fixtures.yaml');
    expect(page.page.auth.require).toEqual(['orders.read']);
    expect(source.permission).toBe('orders.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'SALES_CUSTOMER_REPORT_UNAVAILABLE' });
    expect(api.actions).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(migration.type.postgres.up).toContain("DATE '2026-01-15'");
    expect(migration.type.postgres.up).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
