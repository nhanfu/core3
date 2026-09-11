import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/event-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Events event communication CRUD parity', () => {
  test('creates, edits, and deletes an event communication with parent and line concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_communication_crud_migrations', ['schema', 'data']);

    const eventId = 'event-demo-001';
    const initialEvent = (await repository.query('SELECT row_version FROM events WHERE id = ?', [eventId]))[0];
    const initialParentVersion = Number(initialEvent.row_version);
    const created = await repository.executeMutation(action('add_event_detail_communication').mutation, {
      id: eventId,
      parent_expected_row_version: initialParentVersion,
      values: {
        template_ref: 'Event: Reminder',
        interval_nbr: 2,
        interval_unit: 'Days',
        interval_type: 'Before the event starts',
      },
    });
    expect(created).toMatchObject({ event_id: eventId, template_ref: 'Event: Reminder', interval_nbr: 2, interval_unit: 'days', interval_type: 'before_event' });
    expect((await repository.query('SELECT row_version FROM events WHERE id = ?', [eventId]))[0].row_version).toBe(initialParentVersion + 1);

    const edited = await repository.executeMutation(action('edit_event_detail_communication').mutation, {
      id: eventId,
      line_id: created.id,
      parent_expected_row_version: initialParentVersion + 1,
      expected_row_version: created.row_version,
      values: {
        template_ref: 'Event: Reminder',
        interval_nbr: 1,
        interval_unit: 'Weeks',
        interval_type: 'After the event ended',
      },
    });
    expect(edited).toMatchObject({ id: created.id, template_ref: 'Event: Reminder', interval_unit: 'weeks', interval_type: 'after_event' });
    expect((await repository.query('SELECT row_version FROM events WHERE id = ?', [eventId]))[0].row_version).toBe(initialParentVersion + 2);

    await expect(repository.executeMutation(action('delete_event_detail_communication').mutation, {
      id: eventId, line_id: created.id, parent_expected_row_version: initialParentVersion + 1, expected_row_version: edited.row_version,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_event_detail_communication').mutation, {
      id: eventId, line_id: created.id, parent_expected_row_version: initialParentVersion + 2, expected_row_version: edited.row_version,
    });
    expect((await repository.query('SELECT id FROM event_mail_schedulers WHERE id = ?', [created.id]))).toEqual([]);
  });
});
