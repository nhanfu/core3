import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Live Chat All Conversations action parity', () => {
  test('maps discuss_channel_action and joins page/API fragments', () => {
    const page = yaml('pages/all-conversations.yaml');
    const detail = yaml('pages/all-conversation-detail.yaml');
    const api = yaml('api/all-conversations.yaml');
    const detailApi = yaml('api/all-conversation-detail.yaml');
    const menu = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'conversations');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'livechat-all-conversations', route: '/livechat-sessions/all', auth: { require: ['livechat.read'] } });
    expect(detail.page).toMatchObject({ id: 'livechat-all-conversation-detail', route: '/livechat-sessions/all/detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(detailApi.page).toEqual({ id: detail.page.id });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_all_conversations');
    expect(discovered.pageDatasources.get(detail.page.id)).toContain('livechat_all_conversation_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat-sessions/all', page: page.page.id, module: 'livechat' }),
      expect.objectContaining({ path: '/livechat-sessions/all/detail', page: detail.page.id, module: 'livechat' }),
    ]));
    expect(menu.items).toContainEqual({ path: '/livechat-sessions/all', label: 'All Conversations', icon: 'message', permission: 'livechat.read' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'livechat_all_conversations' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'pivot', 'graph']);
    expect(page.components[0].create_action).toBeUndefined();
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_all_conversation_detail', editable: false });
  });

  test('returns fixed history, filters, detail, and explicit failures', async () => {
    const db = await DuckDbDatabase.open(':memory:');
    const repo = new YamlRepository(db);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repo, migrations, undefined, 'livechat_all_conversations_test', ['schema', 'data']);
    await migrateDatabase(repo, migrations, undefined, 'livechat_all_conversations_test', ['schema', 'data']);
    const source = yaml('api/all-conversations.yaml').datasources[0];
    const params = { q: null, rating_text: null, session_date: 'last_365_days', fixture_state: null };
    const rows = await repo.querySource(source, params, 0, 50);
    expect(rows.data).toHaveLength(6);
    expect(rows.data[0]).toMatchObject({ id: 'livechat-conversation-001', customer_display: 'Visitor #306', duration_label: '00:05:30' });
    expect((await repo.querySource(source, { ...params, rating_text: 'Unrated' }, 0, 50)).data).toHaveLength(2);
    expect((await repo.querySource(source, { ...params, session_date: 'last_30_days' }, 0, 50)).data).toHaveLength(5);
    expect((await repo.querySource(source, { ...params, q: 'technical' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-conversation-002']);
    expect((await repo.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repo.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repo.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_ALL_CONVERSATIONS_FORBIDDEN' });
    await expect(repo.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_ALL_CONVERSATIONS_UNAVAILABLE' });
    const detail = yaml('api/all-conversation-detail.yaml').datasources[0];
    expect(await repo.querySource(detail, { id: 'livechat-conversation-002', fixture_state: null }, 0, 1)).toMatchObject({ data: { customer_display: 'Visiteur #402', rating_text: 'Unhappy' } });
    expect(await repo.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    db.close();
  }, 15000);

  test('keeps source read-only and permission/error metadata explicit', () => {
    const api = yaml('api/all-conversations.yaml');
    expect(api.datasources[0].permission).toBe('livechat.read');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(api.actions).toHaveLength(1);
    expect(api.actions[0]).toMatchObject({ id: 'view_livechat_conversation', type: 'navigate', permission: 'livechat.read' });
    expect(api.actions.some((action: any) => ['create', 'update', 'delete', 'server'].includes(action.type))).toBe(false);
    expect(String(api.datasources[0].query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/i);
  });
});
