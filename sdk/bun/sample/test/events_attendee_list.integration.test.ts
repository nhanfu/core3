import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events attendee list report parity', () => {
  test('keeps the report presentation separate and joins API by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/event-attendee-list.yaml');
    const api = yaml('api/event-attendee-list.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('event-attendee-list');
    expect(api.page.id).toBe('event-attendee-list');
    expect(discovered.pageDatasources.get('event-attendee-list')).toEqual(['event_attendee_list', 'event_attendee_list_rows']);
    expect(page.components[1].columns.map((column: any) => column.label)).toEqual(['Name', 'Company', 'Ticket type', 'Phone number', 'QR Code']);
    expect(api.actions[0]).toMatchObject({ id: 'print_event_attendee_list', type: 'client', permission: 'events.read' });
  });

  test('renders deterministic event and attendee data with empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_attendee_list_migrations', ['schema', 'data']);
    const event = yaml('api/event-attendee-list.yaml').datasources[0];
    const rows = yaml('api/event-attendee-list.yaml').datasources[1];
    expect(await repository.querySource(event, { id: 'event-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { event_name: 'Design Fair Los Angeles', event_schedule: '09 Oct 2026 16:30 - 19:30' } });
    expect((await repository.querySource(rows, { id: 'event-demo-001', fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ attendee_name: 'Ron Gibson', ticket_type: 'Standard' })]));
    expect((await repository.querySource(rows, { id: 'event-demo-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(event, { id: 'missing-event', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(event, { id: 'event-demo-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_ATTENDEE_LIST_UNAVAILABLE' });
    database.close();
  });

  test('keeps the source action read-only and fixture dates runtime-independent', () => {
    const page = yaml('pages/event-detail.yaml');
    const action = page.actions.find((candidate: any) => candidate.id === 'print_event_attendee_list');
    expect(action).toMatchObject({ type: 'navigate', permission: 'events.read', navigate_to: '/events/attendee-list' });
    expect(readFileSync(join(root, 'api/event-attendee-list.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random\(\)|gen_random_uuid\(\)/i);
  });
});
