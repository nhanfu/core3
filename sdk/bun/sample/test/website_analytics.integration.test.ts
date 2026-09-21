import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Analytics parity', () => {
  test('keeps Odoo menu/action route and page/API ownership explicit', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const discoveryRoot = mkdtempSync('/tmp/core3-website-analytics-discovery-');
    mkdirSync(join(discoveryRoot, 'services'));
    cpSync(root, join(discoveryRoot, 'services', 'website'), { recursive: true });
    const discovered = discoverPages(discoveryRoot);
    rmSync(discoveryRoot, { recursive: true, force: true });

    expect(page.page).toMatchObject({ id: 'website-analysis', route: '/website-analysis', breadcrumb: ['Website', 'Reporting', 'Analytics'], auth: { require: ['website.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('website-analysis')).toEqual(['website_analysis_websites', 'website_analysis_totals', 'website_analysis_traffic']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/website-analysis', page: 'website-analysis', module: 'website' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'reporting').items)
      .toContainEqual({ path: '/website-analysis', label: 'Analytics', icon: 'chart', permission: 'website.read' });
    expect(page.components.map((component: any) => component.type)).toEqual(['StatRow', 'Chart']);
    expect(page.components[0].stats.map((stat: any) => stat.label)).toEqual(['Websites', 'Visitors', 'Visits', 'Page views']);
  });

  test('serves durable multi-site totals, daily traffic, empty state, and permission contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_analytics_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_analytics_test_migrations', ['schema', 'data']);

    const api = yaml('api/analysis.yaml');
    const totals = api.datasources.find((source: any) => source.id === 'website_analysis_totals');
    const traffic = api.datasources.find((source: any) => source.id === 'website_analysis_traffic');
    const websites = api.datasources.find((source: any) => source.id === 'website_analysis_websites');

    expect(await repository.querySource(websites, { fixture_state: null, website_id: null }, 0, 20)).toMatchObject({ data: [
      { value: 'website-demo-002', label: 'Core3 Docs' },
      { value: 'website-demo-001', label: 'Core3 Storefront' },
    ] });
    expect(await repository.querySource(totals, { fixture_state: null, website_id: null }, 0, 1)).toMatchObject({ data: { website_count: 2, visitor_count: 357, visit_count: 480, pageview_count: 1136 } });
    expect((await repository.querySource(traffic, { fixture_state: null, website_id: 'website-demo-001' }, 0, 20)).data).toEqual([
      { report_date: '2026-01-12', visitors: 82, visits: 109, pageviews: 246 },
      { report_date: '2026-01-13', visitors: 96, visits: 128, pageviews: 301 },
      { report_date: '2026-01-14', visitors: 104, visits: 141, pageviews: 338 },
    ]);
    expect(await repository.querySource(totals, { fixture_state: 'empty', website_id: null }, 0, 1)).toMatchObject({ data: { website_count: 0, visitor_count: 0, visit_count: 0, pageview_count: 0 } });
    expect((await repository.querySource(traffic, { fixture_state: 'empty', website_id: null }, 0, 20)).data).toEqual([]);
    expect(totals.permission).toBe('website.read');
    expect(traffic.permission).toBe('website.read');
    expect(totals.error_states).toMatchObject({ forbidden: { status: 403, code: 'WEBSITE_ANALYTICS_FORBIDDEN' }, transport_error: { status: 503, code: 'WEBSITE_ANALYTICS_UNAVAILABLE' } });

    const rows = await repository.query('SELECT website_id, report_date, visitors, visits, pageviews FROM website_analytics_daily ORDER BY website_id, report_date');
    expect(rows).toHaveLength(5);
    database.close();
  });
});
