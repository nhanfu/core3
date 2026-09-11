import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat Technical Escalated Sessions action parity', () => {
  test('maps Odoo action 878 and joins layout/API fragments by page.id', () => {
    const page = yaml('pages/technical-escalated-sessions.yaml');
    const detailPage = yaml('pages/technical-escalated-session-detail.yaml');
    const api = yaml('api/technical-escalated-sessions.yaml');
    const detailApi = yaml('api/technical-escalated-session-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const technical = manifest.menu.groups.find((group: any) => group.id === 'technical');
    const list = page.components[0];

    expect(page.page).toMatchObject({
      id: 'livechat-technical-escalated-sessions',
      route: '/livechat/technical/escalated-sessions',
      breadcrumb: ['Website', 'Live Chat', 'Technical', 'Escalated Sessions'],
      auth: { require: ['livechat.manage'] },
    });
    expect(detailPage.page).toMatchObject({
      id: 'livechat-technical-escalated-session-detail',
      route: '/livechat/technical/escalated-sessions/detail',
    });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detailPage.page.id });
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_technical_escalated_sessions');
    expect(discovered.pageDatasources.get(detailPage.page.id)).toContain('livechat_technical_escalated_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/technical/escalated-sessions', page: page.page.id, module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/technical/escalated-sessions/detail', page: detailPage.page.id, module: 'livechat' }),
    ]));
    expect(technical.items).toContainEqual({ path: '/livechat/technical/escalated-sessions', label: 'Escalated Sessions', icon: 'message', permission: 'livechat.manage' });
    expect(list).toMatchObject({
      type: 'ListView',
      variant: 'odoo',
      source: 'livechat_technical_escalated_sessions',
      row_open_action: 'view_livechat_technical_escalated_session',
      default_filters: { status: 'ongoing', escalated: true },
    });
    expect(list.create_action).toBeUndefined();
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(list.form_view).toEqual({ page: 'apps/services/livechat/pages/technical-escalated-session-detail.yaml', side_panel: false });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Date', 'Customer', 'Agents', 'Requesting Help', 'Providing Help', 'Chatbot',
      'Country', 'Language', 'Expertise', 'Tags', 'Channel', 'Duration', 'Messages', 'Rating', 'Comment',
    ]);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_technical_escalated_session_detail', editable: false });
  });

  test('seeds only ongoing escalated rows, supports filters and deterministic empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_technical_escalated_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_technical_escalated_sessions_test_migrations', ['schema', 'data']);

    const source = yaml('api/technical-escalated-sessions.yaml').datasources[0];
    const params = { q: null, status: 'ongoing', escalated: 'true', country_name: null, rating_text: null, session_date: null, fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data).toHaveLength(5);
    expect(populated.data.every((row: any) => row.status === 'ongoing' && row.is_escalated === true)).toBe(true);
    expect(populated.data.map((row: any) => row.id)).toEqual([
      'livechat-escalated-session-001',
      'livechat-escalated-session-002',
      'livechat-escalated-session-003',
      'livechat-escalated-session-004',
      'livechat-escalated-session-005',
    ]);
    expect((await repository.querySource(source, { ...params, country_name: 'Belgium' }, 0, 50)).data.map((row: any) => row.customer_name)).toEqual(['Visiteur']);
    expect((await repository.querySource(source, { ...params, rating_text: 'Unhappy' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-escalated-session-003']);
    expect((await repository.querySource(source, { ...params, q: 'technical' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-escalated-session-003']);
    expect((await repository.querySource(source, { ...params, q: 'not-a-real-session' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_ESCALATED_SESSIONS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_ESCALATED_SESSIONS_UNAVAILABLE' });

    const detail = yaml('api/technical-escalated-session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-escalated-session-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { customer_name: 'Visiteur', rating_text: '' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-escalated-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    await expect(repository.querySource(detail, { id: 'livechat-escalated-session-001', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_ESCALATED_SESSION_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(detail, { id: 'livechat-escalated-session-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_ESCALATED_SESSION_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps the technical manager/read-only boundary explicit', () => {
    const api = yaml('api/technical-escalated-sessions.yaml');
    const detailApi = yaml('api/technical-escalated-session-detail.yaml');
    const source = api.datasources[0];
    expect(source.permission).toBe('livechat.read');
    expect(detailApi.datasources[0].permission).toBe('livechat.read');
    expect(source.query).toContain("status = 'ongoing'");
    expect(source.query).toContain('is_escalated = TRUE');
    expect(api.actions).toHaveLength(1);
    expect(api.actions[0]).toMatchObject({ id: 'view_livechat_technical_escalated_session', type: 'navigate', permission: 'livechat.manage' });
    expect(api.actions.some((candidate: any) => ['create', 'update', 'delete', 'server', 'server_form'].includes(candidate.type))).toBe(false);
    expect(detailApi.actions).toBeUndefined();
    expect(yaml('pages/technical-escalated-session-detail.yaml').components[0]).toMatchObject({ editable: false });
  });
});
