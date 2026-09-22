import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Discuss Scheduled Messages parity', () => {
  test('maps mail_message_schedule_action and joins page/API fragments by page.id', () => {
    const page = yaml('pages/scheduled-messages.yaml');
    const detail = yaml('pages/scheduled-message-detail.yaml');
    const api = yaml('api/scheduled-messages.yaml');
    const detailApi = yaml('api/scheduled-message-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'chat-scheduled-messages', route: '/chat/scheduled-messages', auth: { require: ['chat.technical'] } });
    expect(detail.page).toMatchObject({ id: 'chat-scheduled-message-detail', route: '/chat/scheduled-messages/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Form']);
    expect(discovered.pageDatasources.get('chat-scheduled-messages')).toContain('chat_scheduled_messages');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/chat/scheduled-messages', page: 'chat-scheduled-messages', module: 'chat' }),
      expect.objectContaining({ path: '/chat/scheduled-messages/detail', page: 'chat-scheduled-message-detail', module: 'chat' }),
    ]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'technical').items)
      .toContainEqual({ path: '/chat/scheduled-messages', label: 'Scheduled Messages', icon: 'clock', permission: 'chat.technical' });
  });

  test('seeds schedules idempotently, supports search, edit guards, and force send', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_scheduled_messages_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_scheduled_messages_test', ['schema', 'data']);
    const source = yaml('api/scheduled-messages.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data[0]).toMatchObject({ id: 'chat-schedule-operations', status: 'Scheduled', message_label: 'The delivery schedule is ready.' });
    expect((await repository.querySource(source, { q: 'event store', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['chat-schedule-demo']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const save = action('scheduled-message-detail.yaml', 'save_scheduled_message');
    const updated = await repository.executeMutation(save.mutation, {
      id: 'chat-schedule-demo', expected_row_version: 1,
      values: { scheduled_datetime: '2099-01-17 11:00:00', notification_parameters: '{"message_type":"email"}' },
    });
    expect(updated).toMatchObject({ id: 'chat-schedule-demo', row_version: 2, scheduled_datetime: expect.stringContaining('2099-01-17') });
    await expect(repository.executeMutation(save.mutation, { id: 'chat-schedule-demo', expected_row_version: 1, values: { scheduled_datetime: '2099-01-18 11:00:00' } }))
      .rejects.toMatchObject({ status: 409, code: 'CHAT_SCHEDULED_MESSAGE_STALE' });
    await expect(repository.executeMutation(save.mutation, { id: 'chat-schedule-demo', expected_row_version: 2, values: { scheduled_datetime: '2020-01-01 00:00:00' } }))
      .rejects.toMatchObject({ status: 422, code: 'CHAT_SCHEDULED_DATE_INVALID' });

    const forceSend = action('scheduled-messages.yaml', 'force_send_scheduled_message');
    expect(await repository.executeMutation(forceSend.mutation, { id: 'chat-schedule-demo', expected_row_version: 2, current_user_id: 'user-admin' }))
      .toMatchObject({ id: 'chat-schedule-demo', sent: true });
    expect(await repository.query("SELECT actor_id, action, resource, resource_id FROM system_activity WHERE action = 'force_send' AND resource_id = 'chat-schedule-demo'"))
      .toEqual([{ actor_id: 'user-admin', action: 'force_send', resource: 'mail.message.schedule', resource_id: 'chat-schedule-demo' }]);
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['chat-schedule-operations']);
    await expect(repository.executeMutation(forceSend.mutation, { id: 'chat-schedule-demo', expected_row_version: 2, current_user_id: 'user-admin' }))
      .rejects.toMatchObject({ status: 404, code: 'CHAT_SCHEDULED_MESSAGE_NOT_FOUND' });
    database.close();
  });

  test('keeps the technical action behind its dedicated permission', () => {
    expect(yaml('permissions.yaml').permissions).toContain('chat.technical');
    expect(yaml('api/scheduled-messages.yaml').datasources[0].permission).toBe('chat.technical');
    expect(action('scheduled-messages.yaml', 'force_send_scheduled_message').permission).toBe('chat.technical');
    expect(action('scheduled-message-detail.yaml', 'save_scheduled_message').permission).toBe('chat.technical');
    expect(yaml('api/scheduled-message-detail.yaml').datasources[0].error_states.missing_record.status).toBe(404);
  });
});
