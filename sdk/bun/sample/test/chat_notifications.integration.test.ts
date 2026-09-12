import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Discuss Notifications parity', () => {
  test('joins the configuration menu, page, and API by page.id', () => {
    const page = yaml('pages/notifications.yaml');
    const api = yaml('api/notifications.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Notifications');
    const view = page.components[0];

    expect(page.page).toMatchObject({ id: 'chat-notifications', route: '/chat/notifications', auth: { require: ['chat.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('chat-notifications')).toEqual(['chat_notification_settings']);
    expect(menu).toMatchObject({ path: '/chat/notifications', permission: 'chat.read' });
    expect(view).toMatchObject({ type: 'SettingsView', source: 'chat_notification_settings', save_action: 'save_chat_notification_settings' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Channel Notifications', 'Message sound']);
    expect(view.tabs[0].sections[0].fields[0].options.map((option: any) => option.label)).toEqual(['All Messages', 'Mentions Only', 'Nothing']);
  });

  test('seeds deterministic settings and supports empty and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_notifications_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_notifications_migrations', ['schema', 'data']);
    const source = yaml('api/notifications.yaml').datasources[0];

    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'chat-notification-settings', row_version: 1, channel_notifications: 'mentions', message_sound: true } });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'CHAT_NOTIFICATIONS_UNAVAILABLE' });
    database.close();
  });

  test('persists valid choices and rejects invalid, stale, and missing updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_notifications_mutations', ['schema', 'data']);
    const mutation = yaml('api/notifications.yaml').actions[0].mutation;
    const values = { channel_notifications: 'all', message_sound: false };

    expect(await repository.executeMutation(mutation, { id: 'chat-notification-settings', expected_row_version: 1, values })).toMatchObject({ id: 'chat-notification-settings', row_version: 2, ...values });
    await expect(repository.executeMutation(mutation, { id: 'chat-notification-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'CHAT_NOTIFICATIONS_STALE' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'CHAT_NOTIFICATIONS_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { id: 'chat-notification-settings', expected_row_version: 2, values: { channel_notifications: 'invalid', message_sound: false } })).rejects.toMatchObject({ status: 422, code: 'CHAT_NOTIFICATIONS_VALUES_INVALID' });
    database.close();
  });
});
