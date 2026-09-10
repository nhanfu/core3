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
const action = (id: string) => yaml('api/sessions.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Live Chat Conversations — Sessions parity', () => {
  test('keeps session list/detail layout separate and joins API fragments by page.id', () => {
    const listPage = yaml('pages/sessions.yaml');
    const detailPage = yaml('pages/session-detail.yaml');
    const listApi = yaml('api/sessions.yaml');
    const detailApi = yaml('api/session-detail.yaml');
    const discovered = discoverPages(sampleRoot);

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'livechat-sessions', route: '/livechat-sessions' });
    expect(detailPage.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('livechat-sessions')).toContain('livechat_sessions');
    expect(discovered.pageDatasources.get('livechat-session-detail')).toContain('livechat_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat-sessions', page: 'livechat-sessions', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat-session-detail', page: 'livechat-session-detail', module: 'livechat' }),
    ]));
  });

  test('seeds populated sessions and supports date/search-empty, empty, and detail states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_sessions_test_migrations', ['schema', 'data']);

    const source = yaml('api/sessions.yaml').datasources.find((item: any) => item.id === 'livechat_sessions');
    const populated = await repository.querySource(source, { q: null, session_date: 'last_30_days', fixture_state: null }, 0, 50);
    expect(populated.data.length).toBeGreaterThanOrEqual(8);
    expect(populated.data.map((row: any) => row.visitor_display)).toEqual(expect.arrayContaining(['Visitor', 'Visitor #301', 'Visiteur']));
    expect(populated.data.find((row: any) => row.id === 'livechat-session-demo-003')).toMatchObject({ message_count: 8, country_name: 'United States', status_label: 'Success' });
    expect((await repository.querySource(source, { q: 'does-not-exist', session_date: 'last_30_days', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, session_date: 'last_30_days', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-session-demo-003', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'livechat-session-demo-003', visitor_display: 'Visitor #301', message_count: 8, status_label: 'Success' },
    });
    expect(await repository.querySource(detail, { id: 'missing-livechat-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
  });

  test('keeps workflow permissions, transport errors, and action contracts explicit', () => {
    const page = yaml('pages/sessions.yaml');
    const list = page.components[0];
    const api = yaml('api/sessions.yaml');
    const detailApi = yaml('api/session-detail.yaml');

    expect(list.source).toBe('livechat_sessions');
    expect(list.views[0]).toMatchObject({ id: 'card', label: 'Kanban' });
    expect(list.views[0].card.fields.map((field: any) => field.field)).toEqual(['duration_label', 'message_label', 'status_label', 'country_name']);
    expect(api.datasources.find((item: any) => item.id === 'livechat_sessions')).toMatchObject({
      permission: 'livechat.read',
      workflow: 'livechat_sessions',
      error_states: { transport_error: { status: 503, code: 'LIVECHAT_SESSIONS_UNAVAILABLE' } },
    });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_SESSION_DETAIL_UNAVAILABLE' });
    expect(action('view_livechat_session')).toMatchObject({ permission: 'livechat.read', navigate_to: '/livechat-session-detail' });
    for (const id of ['wait_livechat_session', 'resume_livechat_session', 'help_livechat_session', 'close_livechat_session']) {
      expect(action(id), id).toMatchObject({ permission: 'livechat.write', handler: 'order_transition', workflow: 'livechat_sessions' });
    }
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.write']));
  });
});
