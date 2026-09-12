import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Technical in-call sessions action parity', () => {
  test('maps Odoo agents-in-call action 879 and keeps page/API fragments joined', () => {
    const page = yaml('pages/technical-in-call-sessions.yaml');
    const detailPage = yaml('pages/technical-in-call-session-detail.yaml');
    const api = yaml('api/technical-in-call-sessions.yaml');
    const detailApi = yaml('api/technical-in-call-session-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const technical = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'technical');
    expect(page.page).toMatchObject({ id: 'livechat-technical-in-call-sessions', route: '/livechat/technical/ongoing-sessions/in-call', auth: { require: ['livechat.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'livechat-technical-in-call-session-detail', route: '/livechat/technical/ongoing-sessions/in-call/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_technical_in_call_sessions');
    expect(discovered.pageDatasources.get(detailPage.page.id)).toContain('livechat_technical_in_call_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/technical/ongoing-sessions/in-call', page: page.page.id, module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/technical/ongoing-sessions/in-call/detail', page: detailPage.page.id, module: 'livechat' }),
    ]));
    expect(technical.items).toContainEqual({ path: '/livechat/technical/ongoing-sessions/in-call', label: 'Ongoing Call Sessions', icon: 'message', permission: 'livechat.manage' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'livechat_technical_in_call_sessions', default_filters: { status: 'ongoing', in_call: true }, row_open_action: 'view_livechat_technical_in_call_session' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_technical_in_call_session_detail', editable: false });
    expect(api.datasources[0].query).toContain('status = \'ongoing\' AND in_call = TRUE');
  });

  test('seeds matching, closed, and non-call rows with search, empty, and failure states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_in_call_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_in_call_sessions_test_migrations', ['schema', 'data']);
    const source = yaml('api/technical-in-call-sessions.yaml').datasources[0];
    const params = { q: null, country_name: null, rating_text: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-in-call-session-001', 'livechat-in-call-session-002', 'livechat-in-call-session-003']);
    expect((await repository.querySource(source, { ...params, country_name: 'Belgium' }, 0, 50)).data.map((row: any) => row.customer_name)).toEqual(['Visiteur']);
    expect((await repository.querySource(source, { ...params, rating_text: 'Happy' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, q: 'not-a-real-call' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_IN_CALL_SESSIONS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_IN_CALL_SESSIONS_UNAVAILABLE' });
    const detail = yaml('api/technical-in-call-session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-in-call-session-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { customer_name: 'Visitor' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-in-call-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-in-call-session-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503 });
    database.close();
  });

  test('keeps manager navigation, read datasource, and no-CRUD boundary explicit', () => {
    const api = yaml('api/technical-in-call-sessions.yaml');
    expect(api.datasources[0].permission).toBe('livechat.read');
    expect(api.actions).toHaveLength(1);
    expect(api.actions[0]).toMatchObject({ id: 'view_livechat_technical_in_call_session', type: 'navigate', permission: 'livechat.manage' });
    expect(api.actions.some((candidate: any) => ['create', 'update', 'delete', 'server', 'server_form'].includes(candidate.type))).toBe(false);
    expect(yaml('pages/technical-in-call-session-detail.yaml').components[0].editable).toBe(false);
  });
});
