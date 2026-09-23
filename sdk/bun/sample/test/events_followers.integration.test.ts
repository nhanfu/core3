import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/event-detail.yaml').actions.find((entry: any) => entry.id === id);
const migrate = (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Events follower parity', () => {
  test('maps Odoo mail.thread followers through the event detail page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const page = yaml('pages/event-detail.yaml');
    const api = yaml('api/event-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(sourceModel).toContain("_inherit = ['mail.thread', 'mail.activity.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(page.page.id).toBe('event-detail');
    expect(api.page).toEqual({ id: page.page.id });
    expect(form).toMatchObject({
      message_source: 'event_detail_chatter',
      follower_source: 'event_followers',
      follower_candidates_source: 'event_follower_candidates',
      follower_add_action: 'add_event_follower',
      follower_remove_action: 'remove_event_follower',
      follower_label: 'Followers',
    });
    expect(api.datasources.find((source: any) => source.id === 'event_followers')?.query).toContain('FROM event_followers');
    expect(api.datasources.find((source: any) => source.id === 'event_follower_candidates')?.query).toContain('FROM event_follower_catalog');
    expect(action('add_event_follower')).toMatchObject({ permission: 'events.write', handler: 'order_chatter', operation: 'follower_add' });
    expect(action('remove_event_follower')).toMatchObject({ permission: 'events.write', handler: 'order_chatter', operation: 'follower_remove' });
    expect(action('add_event_follower').mutation.concurrency).toEqual({ required: true });
    expect(action('add_event_follower').params).toMatchObject({ expected_row_version: '{state.event_detail.row_version}' });
  });

  test('persists add/remove subscriptions, records chatter, and guards stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'events_followers_crud');
    const followers = yaml('api/event-detail.yaml').datasources.find((source: any) => source.id === 'event_followers');
    const candidates = yaml('api/event-detail.yaml').datasources.find((source: any) => source.id === 'event_follower_candidates');
    const add = action('add_event_follower');
    const remove = action('remove_event_follower');
    const initialVersion = Number((await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version);

    expect((await repository.querySource(followers, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual([expect.objectContaining({ user_id: 'user-marc-demo', name: 'Marc Demo', email: 'marc.demo@example.com' })]);
    expect((await repository.querySource(candidates, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ value: 'user-admin' }), expect.objectContaining({ value: 'user-events-manager' })]));

    const added = await repository.executeMutation(add.mutation, {
      id: 'event-demo-001', user_id: 'user-admin', expected_row_version: initialVersion,
      current_user_id: 'user-events-manager', current_user_name: 'Events Manager',
    }) as any;
    expect(added).toMatchObject({ user_id: 'user-admin', name: 'Administrator', removed: false });
    expect(Number((await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version)).toBe(initialVersion + 1);
    expect(await repository.query("SELECT action, detail FROM event_messages WHERE event_id = 'event-demo-001' AND action = 'events.records.followers.add'"))
      .toEqual([{ action: 'events.records.followers.add', detail: 'Administrator now follows Design Fair Los Angeles' }]);
    await expect(repository.executeMutation(add.mutation, {
      id: 'event-demo-001', user_id: 'user-events-manager', expected_row_version: initialVersion,
      current_user_id: 'user-events-manager', current_user_name: 'Events Manager',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_FOLLOWER_PARENT_CHANGED' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'event-demo-001', user_id: 'user-admin', expected_row_version: initialVersion + 1,
      current_user_id: 'user-events-manager', current_user_name: 'Events Manager',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_FOLLOWER_EXISTS' });

    const removed = await repository.executeMutation(remove.mutation, {
      id: 'event-demo-001', user_id: 'user-admin', expected_row_version: initialVersion + 1,
      current_user_id: 'user-events-manager', current_user_name: 'Events Manager',
    }) as any;
    expect(removed).toMatchObject({ user_id: 'user-admin', name: 'Administrator', removed: true });
    expect((await repository.querySource(followers, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual([expect.objectContaining({ user_id: 'user-marc-demo' })]);
    expect(await repository.query("SELECT action, detail FROM event_messages WHERE event_id = 'event-demo-001' AND action = 'events.records.followers.remove'"))
      .toEqual([{ action: 'events.records.followers.remove', detail: 'Administrator no longer follows Design Fair Los Angeles' }]);
    await database.close();
  });

  test('rejects anonymous, missing, cancelled, and missing-follower mutations without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'events_followers_guards');
    const add = action('add_event_follower');
    const remove = action('remove_event_follower');
    const version = Number((await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version);
    const base = { id: 'event-demo-001', user_id: 'user-admin', expected_row_version: version, current_user_id: 'user-events-manager', current_user_name: 'Events Manager' };

    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EVENT_FOLLOWER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, user_id: 'missing-user' })).rejects.toMatchObject({ status: 404, code: 'EVENT_FOLLOWER_USER_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { ...base, user_id: 'missing-user' })).rejects.toMatchObject({ status: 404, code: 'EVENT_FOLLOWER_NOT_FOUND' });
    await repository.query("UPDATE events SET state = 'Cancelled' WHERE id = 'event-demo-001'");
    await expect(repository.executeMutation(add.mutation, { ...base, user_id: 'user-events-manager' })).rejects.toMatchObject({ status: 409, code: 'EVENT_FOLLOWER_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM event_followers WHERE event_id = 'event-demo-001'"))
      .toEqual([{ count: 1 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM event_messages WHERE event_id = 'event-demo-001' AND action LIKE 'events.records.followers.%'"))
      .toEqual([{ count: 0 }]);
    await database.close();
  });

  test('replays the migration and retains subscriptions and follower audit through restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-events-followers-'));
    const databasePath = join(directory, 'events.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'events_followers_restart');
      await firstRepository.executeMutation(action('add_event_follower').mutation, {
        id: 'event-demo-002', user_id: 'user-admin', expected_row_version: 1,
        current_user_id: 'user-events-manager', current_user_name: 'Events Manager',
      });
      await firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrate(reopenedRepository, 'events_followers_restart');
      expect(await reopenedRepository.query("SELECT event_id, user_id, name FROM event_followers WHERE event_id = 'event-demo-002'"))
        .toEqual([{ event_id: 'event-demo-002', user_id: 'user-admin', name: 'Administrator' }]);
      expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM event_follower_catalog")).toEqual([{ count: 3 }]);
      expect(await reopenedRepository.query("SELECT action FROM event_messages WHERE event_id = 'event-demo-002' AND action = 'events.records.followers.add'"))
        .toEqual([{ action: 'events.records.followers.add' }]);
      await reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
