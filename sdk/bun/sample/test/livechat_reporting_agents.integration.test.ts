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

describe('Live Chat Reporting — Agents parity', () => {
  test('maps Odoo action 772 and keeps page/API fragments joined by page.id', () => {
    const page = yaml('pages/agent-analysis.yaml');
    const api = yaml('api/agent-analysis.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components[0];
    const discovered = discoverPages(sampleRoot);

    expect(page.page).toMatchObject({ id: 'livechat-agent-analysis', route: '/livechat/agent-analysis', breadcrumb: ['Website', 'Live Chat', 'Reporting', 'Agents'], auth: { require: ['livechat.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(reporting.items).toContainEqual({ path: '/livechat/agent-analysis', label: 'Agents', icon: 'users', permission: 'livechat.read' });
    expect(list).toMatchObject({ source: 'livechat_agent_history', variant: 'odoo', view_navigation: 'tabs', default_group_by: 'agent_name', show_pager: false });
    expect(list.views.map((view: any) => view.id)).toEqual(['pivot', 'graph']);
    expect(list.date_range).toMatchObject({ label: 'Date', default_preset: 'last_month', presets: ['last_month', 'week', 'month', 'year'] });
    expect(list.views[0]).toMatchObject({ label: 'Pivot', show_leaf_rows: false, pivot: { default: { rows: ['agent_name'] } } });
    expect(list.views[0].pivot.default.measures).toEqual(expect.arrayContaining([
      { field: 'session_count', aggregate: 'sum', column: 'Count' },
      { field: 'response_time_hour', aggregate: 'avg', column: 'Response Time' },
      { field: 'session_duration_hour', aggregate: 'avg', column: 'Session Duration' },
      { field: 'rating', aggregate: 'avg', column: 'Rating (%)' },
      { field: 'call_count', aggregate: 'sum', column: '# of Sessions with Calls' },
    ]));
    expect(discovered.pageDatasources.get('livechat-agent-analysis')).toContain('livechat_agent_history');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/livechat/agent-analysis', page: 'livechat-agent-analysis', module: 'livechat' });
  });

  test('returns deterministic Odoo-shaped agent histories and report aggregates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_agent_history_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_agent_history_test_migrations', ['schema', 'data']);
    const source = yaml('api/agent-analysis.yaml').datasources[0];
    const range = { q: null, agent_name: null, channel_name: null, country_name: null, rating_text: null, session_outcome: null, help_status: null, from_date: '2026-08-11', to_date: '2026-09-11', fixture_state: null };
    const populated = await repository.querySource(source, range, 0, 50);
    expect(populated.data).toHaveLength(13);
    expect(populated.data[0]).toMatchObject({ id: 'livechat-agent-history-002', agent_name: 'Marc Demo', channel_name: 'Website Support', session_count: 1 });
    expect(Object.fromEntries(['OdooBot', 'Marc Demo', 'Mitchell Admin'].map(agent => [agent, populated.data.filter((row: any) => row.agent_name === agent).length]))).toEqual({ OdooBot: 1, 'Marc Demo': 1, 'Mitchell Admin': 11 });
    expect((await repository.querySource(source, { ...range, q: 'Belgium' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { ...range, q: 'missing-agent' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...range, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...range, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);

    const pivot = await repository.querySource(source, range, 0, 50, undefined, undefined, {
      rows: ['agent_name'],
      columns: [],
      measures: [
        { field: 'session_count', aggregate: 'sum', label: 'Count' },
        { field: 'response_time_hour', aggregate: 'avg', label: 'Response Time' },
        { field: 'session_duration_hour', aggregate: 'avg', label: 'Session Duration' },
        { field: 'rating', aggregate: 'avg', label: 'Rating (%)' },
        { field: 'call_count', aggregate: 'sum', label: '# of Sessions with Calls' },
      ],
    });
    expect(pivot.data).toHaveLength(3);
    expect(pivot.data.map((row: any) => row.agent_name)).toEqual(['Marc Demo', 'Mitchell Admin', 'OdooBot']);
    const total = await repository.querySource(source, range, 0, 50, undefined, undefined, {
      rows: [],
      columns: [],
      measures: [{ field: 'session_count', aggregate: 'sum', label: 'Count' }, { field: 'response_time_hour', aggregate: 'avg', label: 'Response Time' }, { field: 'session_duration_hour', aggregate: 'avg', label: 'Session Duration' }, { field: 'rating', aggregate: 'avg', label: 'Rating (%)' }, { field: 'call_count', aggregate: 'sum', label: '# of Sessions with Calls' }],
    });
    expect(total.data[0]).toMatchObject({ Count: 13, Response_Time: expect.closeTo(0.008333333333, 6), Rating_: expect.closeTo(58.3, 6), _of_Sessions_with_Calls: 4 });
    database.close();
  });

  test('declares read-only permissions and deterministic failure boundaries', async () => {
    const api = yaml('api/agent-analysis.yaml');
    const page = yaml('pages/agent-analysis.yaml');
    const source = api.datasources[0];
    expect(source.permission).toBe('livechat.read');
    expect(source.error_states).toEqual(expect.objectContaining({
      unauthorized: { status: 401, code: 'LIVECHAT_AGENT_HISTORY_UNAUTHORIZED', message: 'Sign in to view live chat agent reporting.' },
      forbidden: { status: 403, code: 'LIVECHAT_AGENT_HISTORY_FORBIDDEN', message: 'You do not have permission to view live chat agent reporting.' },
      transport_error: { status: 503, code: 'LIVECHAT_AGENT_HISTORY_UNAVAILABLE', message: 'Live chat agent reporting is temporarily unavailable.' },
    }));
    expect(api.actions).toBeUndefined();
    expect(page.components[0].actions).toBeUndefined();
    expect(String(source.query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/i);
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_agent_history_error_test_migrations', ['schema', 'data']);
    await expect(repository.querySource(source, { fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_AGENT_HISTORY_FORBIDDEN' });
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_AGENT_HISTORY_UNAVAILABLE' });
    database.close();
  });
});
