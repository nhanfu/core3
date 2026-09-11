import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);

describe('Events attendee confirmation parity', () => {
  test('keeps attendee pages presentation-only and binds confirmation actions by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/attendees.yaml');
    const detail = yaml('pages/attendee-detail.yaml');
    const listApi = yaml('api/attendees.yaml');
    const detailApi = yaml('api/attendee-detail.yaml');
    const listView = list.components.find((component: any) => component.type === 'ListView');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');

    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(listView.filters[0].options.map((option: any) => option.id)).toEqual(['Unconfirmed', 'Registered', 'Attended', 'Cancelled']);
    expect(listView.columns.find((column: any) => column.field === 'actions').actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'confirm_event_attendee', label: 'Registered', show_if: "row.state === 'Unconfirmed'" }),
    ]));
    expect(form.statusbar.map((state: any) => state.value)).toEqual(['Unconfirmed', 'Registered', 'Attended', 'Cancelled']);
    expect(form.header_actions.map((candidate: any) => candidate.id)).toContain('confirm_attendee_detail');
    expect(listApi.page.id).toBe('attendees');
    expect(detailApi.page.id).toBe('event-attendee-detail');
    expect(discovered.pageDatasources.get('attendees')).toEqual(['event_attendees']);
    expect(discovered.pageDatasources.get('event-attendee-detail')).toContain('event_attendee_detail');
    expect(action('attendees.yaml', 'confirm_event_attendee')).toMatchObject({ permission: 'events.write', action: 'events.registrations.confirm' });
    expect(action('attendee-detail.yaml', 'confirm_attendee_detail')).toMatchObject({ permission: 'events.write', action: 'events.registrations.confirm' });
  });

  test('seeds a fixed unconfirmed registration and exposes deterministic empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_registration_confirmation_read_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_registration_confirmation_read_migrations', ['schema', 'data']);

    const list = source('attendees.yaml', 'event_attendees');
    const params = { q: null, state: 'Unconfirmed', fixture_state: null };
    const rows = await repository.querySource(list, params, 0, 50);
    expect(rows.data).toEqual([expect.objectContaining({ id: 'registration-demo-unconfirmed', attendee_name: 'Unconfirmed Guest', state: 'Unconfirmed', row_version: 1 })]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EVENTS_ATTENDEES_UNAVAILABLE' });

    const detail = source('attendee-detail.yaml', 'event_attendee_detail');
    expect(await repository.querySource(detail, { id: 'registration-demo-unconfirmed', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ state: 'Unconfirmed', row_version: 1 }) });
    expect((await repository.querySource(detail, { id: 'missing-registration', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'registration-demo-unconfirmed', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_ATTENDEE_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('confirms only current unconfirmed registrations and preserves stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_registration_confirmation_mutation_migrations', ['schema', 'data']);

    const confirm = action('attendees.yaml', 'confirm_event_attendee').mutation;
    const detailConfirm = action('attendee-detail.yaml', 'confirm_attendee_detail').mutation;
    const attend = action('attendees.yaml', 'mark_attendee_attended').mutation;
    const cancel = action('attendees.yaml', 'cancel_event_attendee').mutation;
    expect([confirm, detailConfirm, attend, cancel].every((mutation: any) => mutation.guards.some((guard: any) => String(guard.query).includes('expected_row_version')))).toBe(true);

    const confirmed = await repository.executeMutation(confirm, { id: 'registration-demo-unconfirmed', expected_row_version: 1 });
    expect(confirmed).toMatchObject({ id: 'registration-demo-unconfirmed', state: 'Registered', row_version: 2 });
    await expect(repository.executeMutation(confirm, { id: 'registration-demo-unconfirmed', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_STALE_OR_INVALID' });
    await expect(repository.executeMutation(detailConfirm, { id: 'registration-demo-unconfirmed', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_STALE_OR_INVALID' });

    const attended = await repository.executeMutation(attend, { id: 'registration-demo-unconfirmed', expected_row_version: 2 });
    expect(attended).toMatchObject({ state: 'Attended', row_version: 3 });
    await expect(repository.executeMutation(attend, { id: 'registration-demo-unconfirmed', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_STALE_OR_INVALID' });
    await expect(repository.executeMutation(confirm, { id: 'missing-registration', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'EVENT_ATTENDEE_NOT_FOUND' });

    await expect(repository.executeMutation(cancel, { id: 'registration-demo-004', expected_row_version: 1 })).resolves.toMatchObject({ state: 'Cancelled', row_version: 2 });
    await expect(repository.executeMutation(cancel, { id: 'registration-demo-004', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_STALE_OR_INVALID' });
    database.close();
  });

  test('keeps the fixture migration deterministic and event-owned', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911160000-019-event-registration-confirmation.yaml'), 'utf8');
    expect(migration).toContain("'Unconfirmed'");
    expect(migration).toContain('2026-01-15');
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
    expect(yaml('manifest.yaml').id).toBe('events');
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['events.read', 'events.write']));
  });
});
