import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Events attendee reopen parity', () => {
  test('keeps the cancelled-to-unconfirmed action page/API separated', async () => {
    const listPage = yaml('pages/attendees.yaml');
    const detailPage = yaml('pages/attendee-detail.yaml');
    const listApi = yaml('api/attendees.yaml');
    const detailApi = yaml('api/attendee-detail.yaml');
    const listActions = listPage.components[0].columns.find((column: any) => column.field === 'actions').actions;
    const formActions = detailPage.components[0].header_actions;

    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reopen_event_attendee', label: 'Reopen registration', show_if: "row.state === 'Cancelled'" }),
    ]));
    expect(formActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reopen_event_attendee_detail', label: 'Reopen Registration', show_if: "record.state === 'Cancelled'" }),
    ]));
    expect(listApi.page.id).toBe('attendees');
    expect(detailApi.page.id).toBe('event-attendee-detail');
    expect((await discoverPages(join(import.meta.dir, '..'))).pageDatasources.get('attendees')).toEqual(['event_attendees']);
    expect(action('attendees.yaml', 'reopen_event_attendee')).toMatchObject({
      permission: 'events.write',
      action: 'events.registrations.reset_draft',
    });
    expect(action('attendee-detail.yaml', 'reopen_event_attendee_detail')).toMatchObject({
      permission: 'events.write',
      action: 'events.registrations.reset_draft',
    });
  });

  test('reopens only a current cancelled registration and advances the row version', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_reopen_migrations', ['schema', 'data']);

    const cancel = action('attendees.yaml', 'cancel_event_attendee').mutation;
    const reopen = action('attendees.yaml', 'reopen_event_attendee').mutation;
    const cancelled = await repository.executeMutation(cancel, { id: 'registration-demo-004', expected_row_version: 1 });
    expect(cancelled).toMatchObject({ id: 'registration-demo-004', state: 'Cancelled', row_version: 2 });

    const reopened = await repository.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 2 });
    expect(reopened).toMatchObject({ id: 'registration-demo-004', state: 'Unconfirmed', row_version: 3 });
    expect((await repository.query("SELECT state, row_version FROM event_registrations WHERE id = 'registration-demo-004'")).at(0)).toEqual({ state: 'Unconfirmed', row_version: 3 });

    await expect(repository.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_REOPEN_INVALID' });
    await expect(repository.executeMutation(reopen, { id: 'registration-demo-unconfirmed', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_REOPEN_INVALID' });
    await expect(repository.executeMutation(reopen, { id: 'missing-registration', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'EVENT_ATTENDEE_NOT_FOUND' });
    database.close();
  });

  test('uses the detail action with the same stale-write boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_reopen_detail_migrations', ['schema', 'data']);

    const cancel = action('attendees.yaml', 'cancel_event_attendee').mutation;
    const reopen = action('attendee-detail.yaml', 'reopen_event_attendee_detail').mutation;
    await repository.executeMutation(cancel, { id: 'registration-demo-004', expected_row_version: 1 });
    await expect(repository.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_REOPEN_INVALID' });
    expect(await repository.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 2 })).toMatchObject({ state: 'Unconfirmed', row_version: 3 });
    database.close();
  });

  test('persists a reopened registration across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-events-attendee-reopen-'));
    const databasePath = join(directory, 'events.duckdb');
    const migrationName = 'events_attendee_reopen_restart_migrations';
    const cancel = action('attendees.yaml', 'cancel_event_attendee').mutation;
    const reopen = action('attendees.yaml', 'reopen_event_attendee').mutation;
    const first = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await repository.executeMutation(cancel, { id: 'registration-demo-004', expected_row_version: 1 });
    expect(await repository.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 2 })).toMatchObject({ state: 'Unconfirmed', row_version: 3 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const reopened = new YamlRepository(second);
    await migrateDatabase(reopened, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await reopened.query("SELECT state, row_version FROM event_registrations WHERE id = 'registration-demo-004'")).at(0)).toEqual({ state: 'Unconfirmed', row_version: 3 });
    await expect(reopened.executeMutation(reopen, { id: 'registration-demo-004', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_REOPEN_INVALID' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
