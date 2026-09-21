import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Events activity parity', () => {
  test('maps the Odoo activity mixin and chatter to the page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const page = yaml('pages/event-detail.yaml');
    const api = yaml('api/event-detail.yaml');
    const form = page.components[0];

    expect(sourceModel).toContain("_inherit = ['mail.thread', 'mail.activity.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(sourceView).toContain('<field name="activity_ids"');
    expect(page.page.id).toBe('event-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({
      source: 'event_detail',
      message_source: 'event_detail_chatter',
      activity_action: 'schedule_event_detail_activity',
      activity_complete_action: 'complete_event_detail_activity',
    });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'schedule_event_detail_activity', permission: 'events.write' }));
    expect(api.datasources.find((source: any) => source.id === 'event_detail_activities')?.query).toContain('FROM event_activities');
    expect(action(api, 'schedule_event_detail_activity')).toMatchObject({ type: 'server_form', permission: 'events.write', handler: 'yaml_mutation' });
    expect(action(api, 'complete_event_detail_activity')).toMatchObject({ type: 'server', permission: 'events.write', handler: 'yaml_mutation' });
  });

  test('schedules and completes activities with actor, state, parent, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'events_activity_guards');
    const api = yaml('api/event-detail.yaml');
    const activities = api.datasources.find((source: any) => source.id === 'event_detail_activities');
    const schedule = action(api, 'schedule_event_detail_activity');
    const complete = action(api, 'complete_event_detail_activity');
    const before = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version;

    await expect(repository.executeMutation(schedule.mutation, {
      id: 'event-demo-001', expected_row_version: before, current_user_id: '',
      values: { content: 'Call venue', activity_type: 'call', activity_date: '2026-01-17' },
    })).rejects.toMatchObject({ status: 403, code: 'EVENT_ACTIVITY_ACTOR_REQUIRED' });

    const created = await repository.executeMutation(schedule.mutation, {
      id: 'event-demo-001', expected_row_version: before, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { content: 'Call venue', activity_type: 'call', activity_date: '2026-01-17', activity_user: 'Admin User' },
    });
    expect(created).toMatchObject({ id: 'event-demo-001-activity-2', event_id: 'event-demo-001', state: 'planned', activity_type: 'call', summary: 'Call venue' });
    expect((await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version).toBe(before + 1);
    expect((await repository.querySource(activities, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, summary: 'Call venue', state: 'planned' })]));

    await expect(repository.executeMutation(schedule.mutation, {
      id: 'event-demo-001', expected_row_version: before, current_user_id: 'user-admin',
      values: { content: 'Stale schedule', activity_type: 'todo', activity_date: '2026-01-17' },
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_ACTIVITY_PARENT_CHANGED' });
    await expect(repository.executeMutation(schedule.mutation, {
      id: 'event-demo-001', expected_row_version: before + 1, current_user_id: 'user-admin',
      values: { content: 'Invalid type', activity_type: 'invalid', activity_date: '2026-01-17' },
    })).rejects.toMatchObject({ status: 422, code: 'EVENT_ACTIVITY_TYPE_INVALID' });

    await expect(repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: '',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    })).rejects.toMatchObject({ status: 403, code: 'EVENT_ACTIVITY_ACTOR_REQUIRED' });
    const completed = await repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    });
    expect(completed).toMatchObject({ id: created.id, state: 'done', row_version: 2, action_label: 'Activity completed' });
    await expect(repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_ACTIVITY_STALE' });
    await database.close();
  });

  test('preserves scheduled and completed activity state through restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-events-activity-'));
    const databasePath = join(directory, 'events.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'events_activity_restart');
      const api = yaml('api/event-detail.yaml');
      const schedule = action(api, 'schedule_event_detail_activity');
      const complete = action(api, 'complete_event_detail_activity');
      const before = (await firstRepository.query("SELECT row_version FROM events WHERE id = 'event-demo-002'"))[0].row_version;
      const created = await firstRepository.executeMutation(schedule.mutation, {
        id: 'event-demo-002', expected_row_version: before, current_user_id: 'user-admin',
        values: { content: 'Restart-safe event review', activity_type: 'meeting', activity_date: '2026-01-18' },
      });
      await firstRepository.executeMutation(complete.mutation, {
        id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
        values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrate(reopenedRepository, 'events_activity_restart');
      expect(await reopenedRepository.query("SELECT event_id, activity_type, summary, state, row_version FROM event_activities WHERE id = ?", [created.id]))
        .toEqual([{ event_id: 'event-demo-002', activity_type: 'meeting', summary: 'Restart-safe event review', state: 'done', row_version: 2 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
