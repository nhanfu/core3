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
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['chat.read', 'chat.write']));
  });
});
