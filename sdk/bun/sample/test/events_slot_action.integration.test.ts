import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events event-scoped Slots action parity', () => {
  test('binds the Odoo slot calendar action to separate page and API ids', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-slots.yaml');
    const api = yaml('api/event-slots.yaml');
    const source = page.components[0];
    expect(page.page).toMatchObject({ id: 'event-slots', route: '/events/slots', auth: { require: ['events.read'] } });
    expect(source).toMatchObject({ source: 'event_slots', create_action: 'create_event_slot_from_action', row_open_action: 'view_event_slot_from_action' });
    expect(source.views.map((view: any) => view.id)).toEqual(['calendar', 'list']);
    expect(source.views[0]).toMatchObject({ date_field: 'start_at', end_date_field: 'end_at', mobile: false });
    expect(page.actions.find((action: any) => action.id === 'create_event_slot_from_action')).toMatchObject({ permission: 'events.write', params: { event_id: '{query.event_id}' } });
    expect(api.page.id).toBe('event-slots');
    expect(discovered.pageDatasources.get('event-slots')).toEqual(['event_slots']);
  });

  test('reads deterministic event-scoped slots and guards CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_slot_action_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_slot_action_test_migrations', ['schema', 'data']);

    const source = yaml('api/event-slots.yaml').datasources[0];
    const rows = await repository.querySource(source, { event_id: 'event-slot-action-20260115', fixture_state: null, q: null }, 0, 50);
    expect(rows.data).toHaveLength(2);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Opening session', 'Closing session']);
    expect((await repository.querySource(source, { event_id: 'event-slot-action-20260115', fixture_state: null, q: 'missing' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { event_id: 'does-not-exist', fixture_state: 'not_found', q: null }, 0, 50)).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });

    const create = yaml('pages/event-slots.yaml').actions.find((action: any) => action.id === 'create_event_slot_from_action');
    expect(create.permission).toBe('events.write');
    const created = await repository.executeMutation(create.mutation, { values: {
      event_id: 'event-slot-action-20260115', name: 'Midday session', start_at: '2026-01-15 14:00:00', end_at: '2026-01-15 15:00:00', seats: 20, date_tz: 'Europe/Brussels', color: '#714B67',
    } });
    expect(created).toMatchObject({ name: 'Midday session', seats: 20, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: {
      event_id: 'missing-event', name: 'Orphan slot', start_at: '2026-01-15 09:00:00', end_at: '2026-01-15 10:00:00', seats: 20,
    } })).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: {
      event_id: 'event-slot-action-20260115', name: 'Invalid slot', start_at: '2026-01-15 14:00:00', end_at: '2026-01-15 13:00:00', seats: 20,
    } })).rejects.toMatchObject({ status: 422, code: 'EVENT_SLOT_TIME_RANGE_INVALID' });
  });
});
