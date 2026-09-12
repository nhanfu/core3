import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

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
  });

  test('provides deterministic Discuss navigation and fixture states', () => {
    const api = yaml('api/chat.yaml');
    const sidebar = api.datasources.find((source: any) => source.id === 'chat_sidebar');
    const threads = api.datasources.find((source: any) => source.id === 'chat_threads');

    expect(sidebar.mock_data.default.map((row: any) => row.label)).toEqual(['Inbox', 'Starred', 'History', 'Channels', 'Direct Messages']);
    expect(sidebar.mock_data.states.offline[0]).toMatchObject({ kind: 'status', status: 'offline' });
    expect(threads.mock_data.states.starred.map((row: any) => row.id)).toEqual(['chat-demo-thread']);
    expect(threads.mock_data.states.history.map((row: any) => row.id)).toEqual(['chat-team-thread']);
    expect(threads.mock_data.states.empty).toEqual([]);
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
});
