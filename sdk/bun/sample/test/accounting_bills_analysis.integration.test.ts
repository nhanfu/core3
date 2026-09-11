import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = () => yaml('api/bills-analysis.yaml').datasources.find((candidate: any) => candidate.id === 'accounting_bills_analysis');

describe('Accounting Bills Analysis parity slice', () => {
  test('matches the installed Odoo action, labels, views, and page/API boundary', () => {
    const page = yaml('pages/bills-analysis.yaml');
    const api = yaml('api/bills-analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const reportSource = api.datasources.find((candidate: any) => candidate.id === 'accounting_bills_analysis');

    expect(reporting.items).toContainEqual({ path: '/accounting/reports/vendor-bills-analysis', label: 'Bills Analysis', icon: 'chart', permission: 'accounting.read' });
    expect(page.title).toBe('Bills Analysis');
    expect(page.page).toMatchObject({ id: 'bills-analysis', route: '/accounting/reports/vendor-bills-analysis', auth: { require: ['accounting.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(list.source).toBe('accounting_bills_analysis');
    expect(list.search).toEqual({ label: 'Search...', placeholder: 'Search...' });
    expect(list.default_filters).toEqual({ document_scope: 'invoiced', partner_scope: 'vendors' });
    expect(list.filters).toEqual([
      { field: 'document_scope', label: 'Invoiced', options: [{ id: 'invoiced', label: 'Invoiced' }] },
      { field: 'partner_scope', label: 'Vendors', options: [{ id: 'vendors', label: 'Vendors' }] },
    ]);
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views[0]).toMatchObject({ id: 'graph', label: 'Graph', category_field: 'bill_month', series_field: 'product_category', measure_field: 'untaxed_amount', measure_label: 'Untaxed Amount', type: 'line' });
    expect(list.views[1].pivot.default).toEqual({ rows: ['bill_month'], columns: ['product_category'], measures: [{ field: 'untaxed_amount', aggregate: 'sum', column: 'Untaxed Amount' }] });
    expect(api.page).toEqual({ id: 'bills-analysis' });
    expect(reportSource.permission).toBe('accounting.read');
    expect(reportSource.error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    expect(reportSource.pivot.fields).toEqual(['bill_month', 'product_category', 'vendor_name', 'bill_number', 'untaxed_amount']);
    expect(String(reportSource.query)).toContain(':q IS NULL');
    expect(String(reportSource.query)).toContain(':fixture_state');
    expect(readFileSync(join(serviceRoot, 'migrations/20260911200000-025-accounting-bills-analysis.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('bills-analysis')).toEqual(['accounting_bills_analysis']);
  });

  test('seeds deterministic default/search/empty/error states and remains idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'accounting_bills_analysis_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'accounting_bills_analysis_migrations', ['schema', 'data']);
    const report = source();
    const params = { q: null, fixture_state: null, document_scope: 'invoiced', partner_scope: 'vendors' };

    const initial = await repository.querySource(report, params, 0, 50);
    expect(initial.data).toHaveLength(4);
    expect(initial.data[0]).toMatchObject({ bill_month: 'August 2026', product_category: 'Furniture / Office', vendor_name: 'Gemini Furniture', untaxed_amount: 622.27 });
    expect(initial.data.at(-1)).toMatchObject({ bill_number: 'RBILL/2026/09/0001', document_type: 'Vendor Refund', untaxed_amount: -30 });

    const searched = await repository.querySource(report, { ...params, q: 'Ready Mat' }, 0, 50);
    expect(searched.data).toHaveLength(2);
    expect(searched.data.every((row: any) => row.vendor_name === 'Ready Mat')).toBe(true);

    const empty = await repository.querySource(report, { ...params, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);

    let failure: any;
    try {
      await repository.querySource(report, { ...params, fixture_state: 'transport_error' }, 0, 50);
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    expect(String(failure.message)).toContain('Accounting data service is temporarily unavailable');
  });
});
