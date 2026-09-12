import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/channels.yaml').actions.find((item: any) => item.id === id);

describe('Discuss Channels parity', () => {
  test('joins page and API contracts and preserves Odoo modes', () => {
    const page = yaml('pages/channels.yaml');
    const detail = yaml('pages/channel-detail.yaml');
    const api = yaml('api/channels.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'chat-channels', route: '/chat/channels' });
    expect(detail.page.id).toBe('chat-channel-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['Kanban', 'Form']);
    expect(discovered.pageDatasources.get('chat-channels')).toContain('chat_channels');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/chat/channels', page: 'chat-channels', module: 'chat' })]));
  });

  test('seeds active, archived, member, empty, and search states idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_channels_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_channels_test', ['schema', 'data']);
    const source = yaml('api/channels.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, active: null, current_user_id: 'user-admin', fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data[0]).toMatchObject({ name: 'operations', is_member: true, membership_action: 'Leave' });
    expect(rows.data[1]).toMatchObject({ name: 'release-notes', active_label: 'Archived', is_member: false });
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('declares Odoo permissions, error boundaries, CRUD and member actions', () => {
    const api = yaml('api/channels.yaml');
    expect(api.datasources[0].error_states).toMatchObject({ forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_chat_channel', 'save_chat_channel', 'join_chat_channel', 'leave_chat_channel']) expect(action(id).permission).toBe('chat.write');
    expect(action('save_chat_channel').mutation.concurrency).toEqual({ required: true });
    expect(action('save_chat_channel').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 })]));
  });
});
