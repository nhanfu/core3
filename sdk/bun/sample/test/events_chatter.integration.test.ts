import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/event-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Events chatter message parity', () => {
  test('maps the Odoo event mail.thread chatter to the event detail page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const page = yaml('pages/event-detail.yaml');
    const api = yaml('api/event-detail.yaml');

    expect(sourceModel).toContain("_inherit = ['mail.thread', 'mail.activity.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(page.page.id).toBe('event-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({
      message_source: 'event_detail_chatter',
      message_action: 'send_event_detail_message',
      note_action: 'log_event_detail_note',
      activity_action: 'schedule_event_detail_activity',
    });
    expect(api.datasources.find((source: any) => source.id === 'event_detail_chatter')?.query).toContain('FROM event_messages');
    expect(api.datasources.find((source: any) => source.id === 'event_detail_chatter')?.query).toContain('FROM event_activities');
    expect(action('send_event_detail_message')).toMatchObject({ type: 'server_form', permission: 'events.write', handler: 'order_chatter', operation: 'message' });
    expect(action('log_event_detail_note')).toMatchObject({ type: 'server_form', permission: 'events.write', handler: 'order_chatter', operation: 'note' });
    expect(action('send_event_detail_message').mutation.concurrency).toEqual({ required: true });
    expect(action('send_event_detail_message').params).toMatchObject({ expected_row_version: '{state.event_detail.row_version}' });
  });

  test('persists messages and notes, advances the event version, and keeps the activity stream', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'events_chatter_crud');
    const api = yaml('api/event-detail.yaml');
    const timeline = api.datasources.find((source: any) => source.id === 'event_detail_chatter');
    const send = action('send_event_detail_message');
    const note = action('log_event_detail_note');
    const before = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version;

    expect((await repository.querySource(timeline, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'events.records.created', detail: 'Event created' }), expect.objectContaining({ action: 'events.records.activity.schedule' })]));

    const message = await repository.executeMutation(send.mutation, {
      id: 'event-demo-001', expected_row_version: before, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { content: 'Please confirm the venue access plan.' },
    }) as any;
    expect(message).toMatchObject({ id: 'event-message-event-demo-001-2', event_id: 'event-demo-001', action: 'events.records.chatter.message', action_label: 'Message', detail: 'Please confirm the venue access plan.' });
    expect(await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'")).toEqual([{ row_version: before + 1 }]);

    const internalNote = await repository.executeMutation(note.mutation, {
      id: 'event-demo-001', expected_row_version: before + 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { content: 'Internal note: keep the loading dock clear.' },
    }) as any;
    expect(internalNote).toMatchObject({ id: 'event-message-event-demo-001-3', action: 'events.records.chatter.note', action_label: 'Note', detail: 'Internal note: keep the loading dock clear.' });
    expect((await repository.querySource(timeline, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'events.records.chatter.message' }), expect.objectContaining({ action: 'events.records.chatter.note' }), expect.objectContaining({ action: 'events.records.activity.schedule' })]));
    await database.close();
  });

  test('rejects anonymous, blank, stale, and cancelled chatter writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'events_chatter_guards');
    const send = action('send_event_detail_message');
    const initialVersion = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version;
    const base = { id: 'event-demo-001', expected_row_version: initialVersion, current_user_id: 'user-admin', current_user_name: 'Admin User', values: { content: 'A valid event message' } };

    await expect(repository.executeMutation(send.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EVENT_CHATTER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_CHATTER_CONTENT_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'EVENT_CHATTER_PARENT_CHANGED' });
    await repository.query("UPDATE events SET state = 'Cancelled' WHERE id = 'event-demo-001'");
    await expect(repository.executeMutation(send.mutation, base)).rejects.toMatchObject({ status: 409, code: 'EVENT_CHATTER_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM event_messages WHERE event_id = 'event-demo-001'")).toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'")).toEqual([{ row_version: initialVersion }]);
    await database.close();
  });

  test('preserves the seeded and newly posted chatter through restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-events-chatter-'));
    const databasePath = join(directory, 'events.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'events_chatter_restart');
      await firstRepository.executeMutation(action('log_event_detail_note').mutation, {
        id: 'event-demo-002', expected_row_version: 1, current_user_id: 'user-manager', current_user_name: 'Events Manager',
        values: { content: 'Restart-safe event note' },
      });
      await firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrate(reopenedRepository, 'events_chatter_restart');
      expect(await reopenedRepository.query("SELECT event_id, actor_name, action, detail FROM event_messages WHERE id = 'event-message-event-demo-002-1'")).toEqual([
        { event_id: 'event-demo-002', actor_name: 'Events Manager', action: 'events.records.chatter.note', detail: 'Restart-safe event note' },
      ]);
      expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM event_messages WHERE id = 'event-message-event-demo-001-1'")).toEqual([{ count: 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM events WHERE id = 'event-demo-002'")).toEqual([{ row_version: 2 }]);
      await reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
