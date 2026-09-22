import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Discuss Technical Messages parity', () => {
  test('maps action_view_mail_message and joins page/API fragments by page.id', () => {
    const page = yaml('pages/messages.yaml');
    const detail = yaml('pages/message-detail.yaml');
    const api = yaml('api/messages.yaml');
    const detailApi = yaml('api/message-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'chat-mail-messages', route: '/chat/messages', auth: { require: ['chat.technical'] } });
    expect(detail.page).toMatchObject({ id: 'chat-mail-message-detail', route: '/chat/messages/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Form']);
    expect(discovered.pageDatasources.get('chat-mail-messages')).toContain('chat_mail_messages');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/chat/messages', page: 'chat-mail-messages', module: 'chat' }),
      expect.objectContaining({ path: '/chat/messages/detail', page: 'chat-mail-message-detail', module: 'chat' }),
    ]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'technical').items)
      .toContainEqual({ path: '/chat/messages', label: 'Messages', icon: 'message', permission: 'chat.technical' });
  });

  test('seeds message metadata idempotently and supports search, detail, and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_mail_messages_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_mail_messages_test', ['schema', 'data']);
    const source = yaml('api/messages.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data.length).toBeGreaterThanOrEqual(3);
    expect(rows.data.find((row: any) => row.id === 'chat-team-message-01')).toMatchObject({
      author_id: 'user-ops', author_name: 'Operations User', model: 'discuss.channel', res_id: 'chat-team-thread', record_name: 'Operations team',
    });
    expect((await repository.querySource(source, { q: 'delivery schedule', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toContain('chat-team-message-01');
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/message-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'chat-team-message-01', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'chat-team-message-01', subject: 'The delivery schedule is ready.', body: 'The delivery schedule is ready.' },
    });
    expect(await repository.querySource(detail, { id: 'missing-chat-message', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    database.close();
  });

  test('keeps the technical action behind its dedicated permission', () => {
    expect(yaml('permissions.yaml').permissions).toContain('chat.technical');
    expect(yaml('api/messages.yaml').datasources[0].permission).toBe('chat.technical');
    expect(yaml('api/messages.yaml').actions[0]).toMatchObject({ id: 'view_chat_mail_message', type: 'navigate', permission: 'chat.technical' });
    expect(yaml('api/message-detail.yaml').datasources[0].permission).toBe('chat.technical');
    expect(yaml('api/message-detail.yaml').datasources[0].error_states.missing_record.status).toBe(404);
  });
});
