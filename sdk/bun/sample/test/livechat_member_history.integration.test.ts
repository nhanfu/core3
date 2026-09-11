import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Member History action parity', () => {
  test('maps Odoo action 800 and joins read-only list/detail fragments by page.id', () => {
    const page = yaml('pages/member-history.yaml');
    const detailPage = yaml('pages/member-history-detail.yaml');
    const api = yaml('api/member-history.yaml');
    const detailApi = yaml('api/member-history-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const technical = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'technical');

    expect(page.page).toMatchObject({
      id: 'livechat-member-history',
      route: '/livechat/member-history',
      breadcrumb: ['Website', 'Live Chat', 'Technical', 'Member History'],
      auth: { require: ['livechat.technical'] },
    });
    expect(detailPage.page).toMatchObject({ id: 'livechat-member-history-detail', route: '/livechat/member-history/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_member_history');
    expect(discovered.pageDatasources.get(detailPage.page.id)).toContain('livechat_member_history_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/member-history', page: 'livechat-member-history', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/member-history/detail', page: 'livechat-member-history-detail', module: 'livechat' }),
    ]));
    expect(technical.items).toContainEqual({ path: '/livechat/member-history', label: 'Member History', icon: 'history', permission: 'livechat.technical' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'livechat_member_history', row_open_action: 'view_livechat_member_history' });
    expect(page.components[0].create_action).toBeUndefined();
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_member_history_detail', editable: false });
  });

  test('seeds 55 deterministic history rows and covers search, empty, missing, forbidden, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_member_history_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_member_history_test_migrations', ['schema', 'data']);

    const source = yaml('api/member-history.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, livechat_member_type: null, session_outcome: null, fixture_state: null }, 0, 80)).data).toHaveLength(55);
    expect((await repository.querySource(source, { q: 'Support Bot', livechat_member_type: null, session_outcome: null, fixture_state: null }, 0, 80)).data[0])
      .toMatchObject({ chatbot_script_name: 'Support Bot', livechat_member_type: 'Chatbot' });
    expect((await repository.querySource(source, { q: 'does-not-exist', livechat_member_type: null, session_outcome: null, fixture_state: null }, 0, 80)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, livechat_member_type: null, session_outcome: null, fixture_state: 'empty' }, 0, 80)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, livechat_member_type: null, session_outcome: null, fixture_state: 'no_results' }, 0, 80)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, livechat_member_type: null, session_outcome: null, fixture_state: 'forbidden' }, 0, 80))
      .rejects.toMatchObject({ status: 403, code: 'LIVECHAT_MEMBER_HISTORY_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, livechat_member_type: null, session_outcome: null, fixture_state: 'transport_error' }, 0, 80))
      .rejects.toMatchObject({ status: 503, code: 'LIVECHAT_MEMBER_HISTORY_UNAVAILABLE' });

    const detail = yaml('api/member-history-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-member-history-001', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { member_display_name: 'Visitor, Mitchell Admin', livechat_member_type: 'Agent', session_outcome: 'Success' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-member-history', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-member-history-001', fixture_state: 'forbidden' }, 0, 1))
      .rejects.toMatchObject({ status: 403, code: 'LIVECHAT_MEMBER_HISTORY_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(detail, { id: 'livechat-member-history-001', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'LIVECHAT_MEMBER_HISTORY_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps the source read-only ACL and excludes every CRUD action', () => {
    const api = yaml('api/member-history.yaml');
    const detailApi = yaml('api/member-history-detail.yaml');
    expect(api.datasources[0].permission).toBe('livechat.read');
    expect(detailApi.datasources[0].permission).toBe('livechat.read');
    expect(api.actions).toHaveLength(1);
    expect(api.actions[0]).toMatchObject({ id: 'view_livechat_member_history', type: 'navigate', permission: 'livechat.technical' });
    expect(api.actions.some((candidate: any) => ['create', 'update', 'delete', 'server', 'server_form'].includes(candidate.type))).toBe(false);
    expect(detailApi.actions).toBeUndefined();
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.technical']));
    expect(detailApi.datasources[0].error_states).toEqual(expect.objectContaining({ unauthorized: expect.objectContaining({ status: 401 }), forbidden: expect.objectContaining({ status: 403 }), transport_error: expect.objectContaining({ status: 503 }) }));
    expect(detailApi.datasources[0].query).toContain('id = :id');
  });
});
