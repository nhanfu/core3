import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Reporting — Sessions analysis parity', () => {
  test('keeps the existing route, menu label, and page/API join aligned with Odoo action 439', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components[0];
    const discovered = discoverPages(sampleRoot);

    expect(page.page).toMatchObject({ id: 'livechat-analysis', route: '/livechat-analysis', auth: { require: ['livechat.read'] } });
    expect(api.page).toEqual({ id: 'livechat-analysis' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(reporting.items).toContainEqual(expect.objectContaining({ path: '/livechat-analysis', label: 'Sessions', permission: 'livechat.read' }));
    expect(list).toMatchObject({ source: 'livechat_report_sessions', variant: 'odoo', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.date_range).toMatchObject({ default_preset: 'last_month', presets: ['last_month', 'week', 'month', 'year'] });
    expect(list.views[0]).toMatchObject({ label: 'Graph', category_field: 'start_date_label', date_field: 'start_date', measure_field: 'session_count', series_field: 'rating_text', type: 'line' });
    expect(list.views[0].series).toEqual([
      { value: 'Happy', label: 'Happy', color: 'blue' },
      { value: 'None', label: 'None', color: 'red' },
      { value: 'Unhappy', label: 'Unhappy', color: 'teal' },
      { value: 'Neutral', label: 'Neutral', color: 'amber' },
    ]);
    expect(list.views[0].measures).toEqual(expect.arrayContaining([
      { field: 'session_count', label: 'Sessions', aggregate: 'sum' },
      { field: 'time_to_answer', label: 'Response Time (hh:mm:ss)', aggregate: 'avg' },
      { field: 'duration', label: 'Duration (min)', aggregate: 'avg' },
      { field: 'number_of_calls', label: '# of calls', aggregate: 'sum' },
    ]));
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['agent_name'], columns: ['rating_text'] });
    expect(discovered.pageDatasources.get('livechat-analysis')).toContain('livechat_report_sessions');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/livechat-analysis', page: 'livechat-analysis', module: 'livechat' });
  });

  test('returns deterministic report rows and supports date/search/empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_report_sessions_test_migrations', ['schema', 'data']);
    const source = yaml('api/analysis.yaml').datasources[0];
    const range = { q: null, rating_text: null, session_outcome: null, channel_name: null, country_name: null, from_date: '2026-08-10', to_date: '2026-09-10', fixture_state: null };
    const populated = await repository.querySource(source, range, 0, 50);
    expect(populated.data).toHaveLength(18);
    expect(populated.data[0].start_date).toContain('2026-08-10');
    expect(populated.data.at(-1).start_date).toContain('2026-09-10');
    expect(populated.data[0]).toMatchObject({ id: 'livechat-report-session-001', channel_name: 'Website Support', rating_text: 'Happy', session_count: 1 });
    expect(populated.data.filter((row: any) => row.rating_text === 'Happy')).toHaveLength(1);
    expect(populated.data.filter((row: any) => row.rating_text === 'Neutral')).toHaveLength(7);
    expect(populated.data.filter((row: any) => row.rating_text === 'None')).toHaveLength(8);
    expect(populated.data.filter((row: any) => row.rating_text === 'Unhappy')).toHaveLength(2);
    expect(new Set(populated.data.map((row: any) => row.agent_name))).toEqual(new Set(['Odoo', 'Support Bot', 'Mitchell Admin']));
    expect(Object.fromEntries(['Odoo', 'Support Bot', 'Mitchell Admin'].map(agent => [agent, populated.data.filter((row: any) => row.agent_name === agent).length]))).toEqual({ Odoo: 3, 'Support Bot': 7, 'Mitchell Admin': 8 });
    expect(new Set(populated.data.map((row: any) => String(row.start_date).slice(0, 10)))).toEqual(new Set(['2026-08-10', '2026-08-27', '2026-08-31', '2026-09-04', '2026-09-05', '2026-09-09', '2026-09-10']));
    expect((await repository.querySource(source, { ...range, q: 'Belgium' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...range, from_date: '2026-09-01' }, 0, 50)).data).toHaveLength(11);
    const pivoted = await repository.querySource(source, range, 0, 50, undefined, undefined, {
      rows: ['agent_name'],
      columns: ['rating_text'],
      measures: [{ field: 'session_count', aggregate: 'sum', label: 'Sessions' }],
    });
    expect(pivoted.data).toHaveLength(3);
    expect(pivoted.meta.pivotColumns).toHaveLength(4);
    expect(Object.fromEntries(pivoted.data.map((row: any) => [row.agent_name, Object.values(row).filter(value => typeof value === 'number').reduce((sum: number, value: unknown) => sum + Number(value), 0)]))).toEqual({ Odoo: 3, 'Support Bot': 7, 'Mitchell Admin': 8 });
    expect((await repository.querySource(source, { ...range, q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...range, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('declares Odoo measures/groupings, read permission, and transport failure contract', async () => {
    const api = yaml('api/analysis.yaml');
    const page = yaml('pages/analysis.yaml');
    const source = api.datasources[0];
    const pivotFields = source.pivot.fields;
    expect(source.permission).toBe('livechat.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_REPORT_SESSIONS_UNAVAILABLE' });
    expect(pivotFields).toEqual(expect.arrayContaining(['channel_name', 'agent_name', 'start_date', 'country_name', 'rating_text', 'session_count', 'time_to_answer', 'duration', 'rating', 'number_of_calls', 'call_duration_hour']));
    expect(page.components[0].group_by).toEqual(expect.arrayContaining([
      { field: 'channel_name', label: 'Channel' },
      { field: 'agent_name', label: 'Agent' },
      { field: 'rating_text', label: 'Rating' },
      { field: 'country_name', label: 'Country' },
      { field: 'session_outcome', label: 'Status' },
    ]));
    expect(String(source.query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/i);
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_report_sessions_error_test_migrations', ['schema', 'data']);
    expect(source.error_states.unauthorized).toMatchObject({ status: 401 });
    expect(source.error_states.forbidden).toMatchObject({ status: 403 });
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_REPORT_SESSIONS_UNAVAILABLE' });
    database.close();
  });
});
