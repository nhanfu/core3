import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const read = (file: string) => readFileSync(join(serviceRoot, file), 'utf8');
const yaml = (file: string) => Bun.YAML.parse(read(file)) as any;
const report = () => yaml('api/analysis.yaml').datasources.find((source: any) => source.id === 'email_mailing_trace_report');

describe('Email Marketing Mass Mailing Analysis action 783 parity', () => {
  test('keeps the Odoo graph/pivot/list action, labels, groupings, and page/API boundary', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu['email-marketing'].groups.find((group: any) => group.id === 'reporting');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');

    expect(reporting.items).toContainEqual({ path: '/email-analysis', label: 'Mass Mailing Analysis', icon: 'chart', permission: 'email_marketing.read' });
    expect(page.title).toBe('Mass Mailing Analysis');
    expect(page.page).toMatchObject({ id: 'email-analysis', route: '/email-analysis', auth: { require: ['email_marketing.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'email-analysis' });
    expect(list.source).toBe('email_mailing_trace_report');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.date_range).toMatchObject({ from_field: 'from_date', to_field: 'to_date' });
    expect(list.group_by).toEqual([
      { field: 'campaign', label: 'Mass Mailing Campaign' },
      { field: 'state', label: 'State' },
      { field: 'email_from', label: 'Sent By' },
      { field: 'scheduled_date', label: 'Scheduled Period' },
    ]);
    expect(graph).toMatchObject({ category_field: 'name', measure_field: 'sent', measure_label: 'Sent', type: 'bar' });
    expect(graph.measures.map((measure: any) => measure.field)).toEqual(['sent', 'scheduled', 'delivered', 'opened', 'replied', 'clicked']);
    expect(pivot.pivot.default).toEqual({
      rows: ['name'],
      measures: [
        { field: 'sent', aggregate: 'sum', column: 'Sent' },
        { field: 'scheduled', aggregate: 'sum', column: 'Scheduled' },
        { field: 'delivered', aggregate: 'sum', column: 'Delivered' },
        { field: 'opened', aggregate: 'sum', column: 'Opened' },
        { field: 'replied', aggregate: 'sum', column: 'Replied' },
        { field: 'clicked', aggregate: 'sum', column: 'Clicked' },
      ],
    });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Mailing', 'Campaign', 'Scheduled On', 'Status', 'Scheduled', 'Sent',
      'Processing', 'Pending', 'Delivered', 'Opened', 'Replied', 'Clicked',
      'Canceled', 'Error', 'Bounced',
    ]);
  });

  test('seeds deterministic mail-only report rows and covers search, state, date, and empty results', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_analysis_seed_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_analysis_seed_test', ['schema', 'data']);
    const source = report();
    const params = { q: null, state: null, from_date: null, to_date: null, fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual([
      'Welcome Series Template', 'Customer Onboarding Tips', 'Newsletter 1',
      'Spring Release', 'Quarterly Product Briefing',
    ]);
    expect(populated.data).toHaveLength(5);
    expect(populated.data.find((row: any) => row.name === 'Newsletter 1')).toMatchObject({ sent: 6, delivered: 5, opened: 4, replied: 2, clicked: 2, state: 'Sent' });
    expect((await repository.querySource(source, { ...params, q: 'Spring' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['email-analysis-spring-release-001']);
    expect((await repository.querySource(source, { ...params, state: 'Draft' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Quarterly Product Briefing']);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-15', to_date: '2026-01-16' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Newsletter 1', 'Spring Release']);
    expect((await repository.querySource(source, { ...params, q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('declares permission, mail-only, transport, forbidden, and deterministic migration contracts', async () => {
    const source = report();
    expect(source.permission).toBe('email_marketing.read');
    expect(source.error_states).toMatchObject({
      unauthorized: { status: 401, code: 'EMAIL_ANALYSIS_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'EMAIL_ANALYSIS_FORBIDDEN' },
      transport_error: { status: 503, code: 'EMAIL_ANALYSIS_UNAVAILABLE' },
    });
    expect(String(source.query)).toContain("mailing_type = 'mail'");
    expect(String(source.query)).toContain(':from_date');
    expect(String(source.query)).toContain(':to_date');
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['scheduled', 'sent', 'delivered', 'opened', 'replied', 'clicked', 'bounced']));
    expect(read('migrations/20260911143000-010-email-mailing-trace-report.yaml')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(read('migrations/20260911143100-011-email-mailing-trace-report-demo.yaml')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('email-analysis')).toEqual(['email_mailing_trace_report']);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_analysis_error_test', ['schema', 'data']);
    const params = { q: null, state: null, from_date: null, to_date: null, fixture_state: null };
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMAIL_ANALYSIS_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'EMAIL_ANALYSIS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'EMAIL_ANALYSIS_UNAUTHORIZED' });
    database.close();
  });
});
