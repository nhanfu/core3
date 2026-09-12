import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Chat Discuss sidebar parity batch', () => {
  test('keeps the page layout-only and joins its API fragment by page.id', () => {
    const page = yaml('pages/chat.yaml');
    const api = yaml('api/chat.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('chat')?.config.page.id).toBe('chat');
    expect(discovered.pageDatasources.get('chat')).toEqual(['chat_sidebar', 'chat_threads', 'chat_messages', 'chat_attachments']);
    expect(api.datasources.find((source: any) => source.id === 'chat_threads')?.query).toContain('JOIN chat_participants current_participant');
    expect(api.datasources.find((source: any) => source.id === 'chat_messages')?.query).toContain('m.thread_id = :thread_id');
  });

  test('provides deterministic Discuss navigation and fixture states', () => {
    const api = yaml('api/chat.yaml');
    const sidebar = api.datasources.find((source: any) => source.id === 'chat_sidebar');
    const threads = api.datasources.find((source: any) => source.id === 'chat_threads');

    expect(sidebar.mock_data.default.map((row: any) => row.label)).toEqual(['Inbox', 'Starred', 'History', 'Channels', 'Direct Messages']);
    expect(sidebar.mock_data.states.offline[0]).toMatchObject({ kind: 'status', status: 'offline' });
    expect(threads.query).toContain('fixture_state');
    expect(threads.query).toContain('starred');
    expect(threads.query).toContain('history');
    expect(yaml('migrations/20260910180000-006-chat-sidebar-flags.yaml').version).toBe('0.0.6');
  });

  test('keeps read/write boundaries explicit', () => {
    const api = yaml('api/chat.yaml');
    expect(api.datasources.every((source: any) => source.permission === 'chat.read')).toBe(true);
    expect(api.actions.find((action: any) => action.id === 'create_thread').permission).toBe('chat.write');
    expect(api.actions.find((action: any) => action.id === 'send_message').permission).toBe('chat.write');
    expect(api.actions.find((action: any) => action.id === 'mark_thread_unread')).toMatchObject({ permission: 'chat.write', action: 'chat.threads.mark_unread' });
    expect(api.actions.find((action: any) => action.id === 'toggle_thread_star')).toMatchObject({ permission: 'chat.write', action: 'chat.threads.toggle_star' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['chat.read', 'chat.write']));
  });

  test('declares inbox state controls with deterministic mutation boundaries', () => {
    const page = yaml('pages/chat.yaml');
    const api = yaml('api/chat.yaml');
    const workspace = page.components.find((component: any) => component.type === 'ChatWorkspace');
    expect(workspace).toMatchObject({ mark_read_action: 'mark_thread_read', mark_unread_action: 'mark_thread_unread', toggle_star_action: 'toggle_thread_star' });
    for (const id of ['mark_thread_read', 'mark_thread_unread', 'toggle_thread_star']) {
      expect(api.actions.find((action: any) => action.id === id)?.permission, id).toBe('chat.write');
      expect(api.actions.find((action: any) => action.id === id)?.handler, id).toBe('chat');
    }
    expect(api.actions.find((action: any) => action.id === 'toggle_thread_star')?.mutation.steps[0].query).toContain('NOT starred');
    expect(api.actions.find((action: any) => action.id === 'toggle_thread_star')?.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 409 })]));
  });

  test('queries persisted conversations and enforces participant ownership for mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_runtime_test', ['schema', 'data']);

    const threads = { ...yaml('api/chat.yaml').datasources.find((source: any) => source.id === 'chat_threads') };
    delete threads.enrich;
    const messages = yaml('api/chat.yaml').datasources.find((source: any) => source.id === 'chat_messages');
    const visible = await repository.querySource(threads, { q: null, fixture_state: null, current_user_id: 'user-admin' }, 0, 50);
    expect(visible.data.map((row: any) => row.id)).toEqual(['chat-fleet-thread', 'chat-demo-thread', 'chat-team-thread']);
    expect(visible.data[1]).toMatchObject({ participant_user_ids: 'user-admin,user-disp', preview: 'This message was seeded through the event bus.' });
    expect((await repository.querySource(messages, { thread_id: 'chat-demo-thread', fixture_state: null, current_user_id: 'user-admin' }, 0, 50)).data).toHaveLength(2);

    const api = yaml('api/chat.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_thread');
    const created = await repository.executeMutation(create.mutation, {
      values: { title: 'QA conversation', participant_emails: 'dispatcher@tms.local' },
      current_user_id: 'user-admin',
    });
    expect(created).toMatchObject({ title: 'QA conversation' });
    expect((await repository.query('SELECT user_id FROM chat_participants WHERE thread_id = ?', [created.id])).map((row: any) => row.user_id)).toEqual(['user-admin']);

    const send = api.actions.find((action: any) => action.id === 'send_message');
    await expect(repository.executeMutation(send.mutation, { thread_id: 'chat-demo-thread', current_user_id: 'user-fleet', values: { content: 'forbidden' } }))
      .rejects.toMatchObject({ status: 403, code: 'CHAT_THREAD_FORBIDDEN' });
    database.close();
  });
});
