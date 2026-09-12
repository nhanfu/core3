import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Technical sessions handled by bot action parity', () => {
  test('maps the Odoo action and joins separate page/API fragments', () => {
    const page = yaml('pages/technical-handled-by-bot-sessions.yaml');
    const detail = yaml('pages/technical-handled-by-bot-session-detail.yaml');
    const api = yaml('api/technical-handled-by-bot-sessions.yaml');
    const detailApi = yaml('api/technical-handled-by-bot-session-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const technical = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'technical');
    expect(page.page).toMatchObject({ id: 'livechat-technical-handled-by-bot-sessions', route: '/livechat/technical/ongoing-sessions/handled-by-bot', auth: { require: ['livechat.manage'] } });
    expect(detail.page).toMatchObject({ id: 'livechat-technical-handled-by-bot-session-detail', route: '/livechat/technical/ongoing-sessions/handled-by-bot/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detail.page.id });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_technical_handled_by_bot_sessions');
    expect(discovered.pageDatasources.get(detail.page.id)).toContain('livechat_technical_handled_by_bot_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: page.page.route, page: page.page.id, module: 'livechat' }),
      expect.objectContaining({ path: detail.page.route, page: detail.page.id, module: 'livechat' }),
    ]));
    expect(technical.items).toContainEqual({ path: page.page.route, label: 'Sessions Handled by Bot', icon: 'message', permission: 'livechat.manage' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'livechat_technical_handled_by_bot_sessions', default_filters: { status: 'ongoing', handled_by_bot: true }, row_open_action: 'view_livechat_technical_handled_by_bot_session' });
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_technical_handled_by_bot_session_detail', editable: false });
  });

  test('proves bot semantics, filters, states, detail, and idempotent migration', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_handled_by_bot_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_handled_by_bot_sessions_test_migrations', ['schema', 'data']);
    const source = yaml('api/technical-handled-by-bot-sessions.yaml').datasources[0];
    const params = { q: null, country_name: null, rating_text: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-bot-session-001', 'livechat-bot-session-002', 'livechat-bot-session-003']);
    expect((await repository.querySource(source, { ...params, country_name: 'Belgium' }, 0, 50)).data[0].customer_name).toBe('Visiteur');
    expect((await repository.querySource(source, { ...params, rating_text: 'Happy' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, q: 'not-a-real-session' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_HANDLED_BY_BOT_SESSIONS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_HANDLED_BY_BOT_SESSIONS_UNAVAILABLE' });
    const detail = yaml('api/technical-handled-by-bot-session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-bot-session-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { customer_name: 'Visitor', rating_text: '' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-bot-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-bot-session-001', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_HANDLED_BY_BOT_SESSION_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(detail, { id: 'livechat-bot-session-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_HANDLED_BY_BOT_SESSION_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps manager navigation, read permission, and no-CRUD boundary explicit', () => {
    const api = yaml('api/technical-handled-by-bot-sessions.yaml');
    const detailApi = yaml('api/technical-handled-by-bot-session-detail.yaml');
    expect(api.datasources[0].permission).toBe('livechat.read');
    expect(detailApi.datasources[0].permission).toBe('livechat.read');
    expect(api.actions).toEqual([{ id: 'view_livechat_technical_handled_by_bot_session', type: 'navigate', permission: 'livechat.manage', navigate_to: '/livechat/technical/ongoing-sessions/handled-by-bot/detail', params: { id: '{row.id}' } }]);
    expect(api.actions.some((candidate: any) => ['create', 'update', 'delete', 'server', 'server_form'].includes(candidate.type))).toBe(false);
    expect(detailApi.actions).toBeUndefined();
    expect(yaml('pages/technical-handled-by-bot-session-detail.yaml').components[0].editable).toBe(false);
    expect(api.datasources[0].query).toContain("status = 'ongoing' AND handled_by_bot = TRUE");
  });
});
