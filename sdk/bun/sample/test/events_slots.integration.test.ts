import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`pages/${file}`).actions.find((candidate: any) => candidate.id === id);
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);

describe('Events event slots parity', () => {
  test('binds the event-scoped list/form workflow through page IDs', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const eventPage = yaml('pages/event-detail.yaml');
    const slots = eventPage.components.find((component: any) => component.type === 'TabGroup').tabs.find((tab: any) => tab.id === 'slots').components[0];
    const detail = yaml('pages/event-slot-detail.yaml');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');

    expect(eventPage.datasources).toBeUndefined();
    expect(slots).toMatchObject({ source: 'event_detail_slots', create_action: 'create_event_slot', row_open_action: 'view_event_slot', row_double_click_action: 'view_event_slot' });
    expect(eventPage.actions.find((candidate: any) => candidate.id === 'view_event_slot')).toMatchObject({ navigate_to: '/events/slots/detail', permission: 'events.read' });
    expect(detail.page).toMatchObject({ id: 'event-slot-detail', route: '/events/slots/detail', auth: { require: ['events.read'] } });
    expect(form.header_actions.map((candidate: any) => candidate.id)).toEqual(['back_to_event_slots', 'edit_event_slot', 'delete_event_slot']);
    expect(yaml('api/event-slot-detail.yaml').page.id).toBe('event-slot-detail');
    expect(discovered.pageDatasources.get('event-slot-detail')).toEqual(['event_slot_detail']);
  });

  test('seeds deterministic slot availability and guards CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_slots_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_slots_test_migrations', ['schema', 'data']);

    const list = await repository.querySource(source('event-detail.yaml', 'event_detail_slots'), { id: 'event-demo-007', fixture_state: null }, 0, 50);
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ id: 'slot-event-007-main', name: 'Main session', row_version: 1, date_tz: 'Europe/Brussels', color: '#875A7B' });

    const detail = source('event-slot-detail.yaml', 'event_slot_detail');
    expect(await repository.querySource(detail, { id: 'slot-event-007-main', fixture_state: null }, 0, 1)).toMatchObject({ data: { event_name: 'OpenWood Collection Online Reveal', availability: 'Unlimited' } });
    expect((await repository.querySource(detail, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail, { id: 'slot-event-007-main', fixture_state: 'empty' }, 0, 1)).data).toEqual({});

    const create = action('event-detail.yaml', 'create_event_slot');
    const update = action('event-slot-detail.yaml', 'edit_event_slot');
    const remove = action('event-slot-detail.yaml', 'delete_event_slot');
    expect(create.permission).toBe('events.write');
    expect(update.permission).toBe('events.write');
    expect(remove.permission).toBe('events.write');

    const created = await repository.executeMutation(create.mutation, { values: {
      event_id: 'event-demo-007', name: 'Closing session', start_at: '2026-09-28 16:45:00', end_at: '2026-09-28 17:15:00', seats: 25, date_tz: 'Europe/Brussels', color: '#00A09D',
    } });
    expect(created).toMatchObject({ name: 'Closing session', seats: 25, row_version: 1 });

    await expect(repository.executeMutation(create.mutation, { values: {
      event_id: 'event-demo-007', name: 'Outside event', start_at: '2026-09-27 17:45:00', end_at: '2026-09-27 18:30:00', seats: 25,
    } })).rejects.toMatchObject({ status: 422, code: 'EVENT_SLOT_OUTSIDE_EVENT' });
    await expect(repository.executeMutation(create.mutation, { values: {
      event_id: 'event-demo-007', name: 'Invalid range', start_at: '2026-09-28 18:30:00', end_at: '2026-09-28 17:45:00', seats: 25,
    } })).rejects.toMatchObject({ status: 422, code: 'EVENT_SLOT_TIME_RANGE_INVALID' });

    const updated = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: {
      name: 'Closing session updated', start_at: '2026-09-28 16:45:00', end_at: '2026-09-28 17:20:00', seats: 30, date_tz: 'Europe/Brussels', color: '#714B67',
    } });
    expect(updated).toMatchObject({ id: created.id, name: 'Closing session updated', seats: 30, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale slot', start_at: '2026-09-28 16:45:00', end_at: '2026-09-28 17:15:00', seats: 30 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await expect(repository.executeMutation(remove.mutation, { id: 'slot-event-007-main', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_SLOT_HAS_REGISTRATIONS' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toEqual({});
  });
});
