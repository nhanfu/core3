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
  test('keeps the existing route, menu label, and page/API join aligned with Odoo action 825', () => {
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
    expect(list.views[0]).toMatchObject({ label: 'Graph', category_field: 'start_date_label', measure_field: 'session_count', type: 'line' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['channel_name'], columns: ['rating_text'] });
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
    expect(populated.data).toHaveLength(13);
    expect(populated.data[0]).toMatchObject({ id: 'livechat-report-session-001', channel_name: 'Website Support', rating_text: 'Happy', session_count: 1 });
    expect(populated.data.filter((row: any) => row.rating_text === 'Happy')).toHaveLength(4);
    expect(populated.data.filter((row: any) => row.rating_text === 'Neutral')).toHaveLength(3);
    expect((await repository.querySource(source, { ...range, q: 'Belgium' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...range, from_date: '2026-09-01' }, 0, 50)).data).toHaveLength(4);
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
    expect(pivotFields).toEqual(expect.arrayContaining(['channel_name', 'agent_name', 'start_date', 'country_name', 'rating_text', 'session_count', 'response_time', 'duration', 'rating', 'number_of_calls', 'call_duration_hour']));
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
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_REPORT_SESSIONS_UNAVAILABLE' });
    database.close();
  });
});
