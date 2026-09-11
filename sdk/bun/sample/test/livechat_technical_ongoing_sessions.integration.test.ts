import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Technical Ongoing Sessions action parity', () => {
  test('maps Odoo action 877 and joins list/detail fragments by page.id', () => {
    const page = yaml('pages/technical-ongoing-sessions.yaml');
    const detailPage = yaml('pages/technical-ongoing-session-detail.yaml');
    const api = yaml('api/technical-ongoing-sessions.yaml');
    const detailApi = yaml('api/technical-ongoing-session-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const technical = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'technical');

    expect(page.page).toMatchObject({ id: 'livechat-technical-ongoing-sessions', route: '/livechat/technical/ongoing-sessions', breadcrumb: ['Website', 'Live Chat', 'Technical', 'Ongoing Sessions'], auth: { require: ['livechat.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'livechat-technical-ongoing-session-detail', route: '/livechat/technical/ongoing-sessions/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_technical_ongoing_sessions');
    expect(discovered.pageDatasources.get(detailPage.page.id)).toContain('livechat_technical_ongoing_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/technical/ongoing-sessions', page: 'livechat-technical-ongoing-sessions', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/technical/ongoing-sessions/detail', page: 'livechat-technical-ongoing-session-detail', module: 'livechat' }),
    ]));
    expect(technical.items).toContainEqual({ path: '/livechat/technical/ongoing-sessions', label: 'Ongoing Sessions', icon: 'message', permission: 'livechat.manage' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'livechat_technical_ongoing_sessions', row_open_action: 'view_livechat_technical_ongoing_session', default_filters: { status: 'ongoing' } });
    expect(page.components[0].filters).toContainEqual({ field: 'status', label: 'Status', options: [{ id: 'ongoing', label: 'Ongoing' }] });
    expect(page.components[0].create_action).toBeUndefined();
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_technical_ongoing_session_detail', editable: false });
  });

  test('seeds 12 ongoing live-chat rows and covers filtering, empty, missing, forbidden, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_technical_ongoing_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_technical_ongoing_sessions_test_migrations', ['schema', 'data']);

    const source = yaml('api/technical-ongoing-sessions.yaml').datasources[0];
    const params = { q: null, country_name: null, rating_text: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data).toHaveLength(12);
    expect((await repository.querySource(source, { ...params, country_name: 'Belgium' }, 0, 50)).data.map((row: any) => row.customer_name)).toEqual(['Visiteur']);
    expect((await repository.querySource(source, { ...params, rating_text: 'Happy' }, 0, 50)).data.length).toBeGreaterThan(0);
    expect((await repository.querySource(source, { ...params, q: 'not-a-real-session' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_ONGOING_SESSIONS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_ONGOING_SESSIONS_UNAVAILABLE' });

    const detail = yaml('api/technical-ongoing-session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-ongoing-session-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { customer_name: 'Visitor', rating_text: '' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-ongoing-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-ongoing-session-001', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_ONGOING_SESSION_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(detail, { id: 'livechat-ongoing-session-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_ONGOING_SESSION_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps manager/read permissions and the Odoo no-CRUD boundary explicit', () => {
    const api = yaml('api/technical-ongoing-sessions.yaml');
    const detailApi = yaml('api/technical-ongoing-session-detail.yaml');
    expect(api.datasources[0].permission).toBe('livechat.read');
    expect(detailApi.datasources[0].permission).toBe('livechat.read');
    expect(api.actions).toHaveLength(1);
    expect(api.actions[0]).toMatchObject({ id: 'view_livechat_technical_ongoing_session', type: 'navigate', permission: 'livechat.manage' });
    expect(api.actions.some((candidate: any) => ['create', 'update', 'delete', 'server', 'server_form'].includes(candidate.type))).toBe(false);
    expect(detailApi.actions).toBeUndefined();
    expect(yaml('pages/technical-ongoing-session-detail.yaml').components[0]).toMatchObject({ editable: false });
    expect(api.datasources[0].query).toContain("status = 'ongoing'");
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'technical').items)
      .toContainEqual({ path: '/livechat/technical/ongoing-sessions', label: 'Ongoing Sessions', icon: 'message', permission: 'livechat.manage' });
  });
});
