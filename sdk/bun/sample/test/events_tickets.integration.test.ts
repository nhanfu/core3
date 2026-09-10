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

describe('Events ticket catalog parity', () => {
  test('binds the ticket form and embedded list through page IDs', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const eventPage = yaml('pages/event-detail.yaml');
    const tickets = eventPage.components.find((component: any) => component.type === 'TabGroup').tabs.find((tab: any) => tab.id === 'tickets').components[0];
    expect(eventPage.datasources).toBeUndefined();
    expect(tickets).toMatchObject({ create_action: 'create_event_ticket', row_open_action: 'view_event_ticket', row_double_click_action: 'view_event_ticket' });
    expect(yaml('api/event-detail.yaml').page.id).toBe('event-detail');
    expect(yaml('api/ticket-detail.yaml').page.id).toBe('event-ticket-detail');
    expect(discovered.pages.get('event-ticket-detail')?.config.page.id).toBe('event-ticket-detail');
    expect(discovered.pageDatasources.get('event-ticket-detail')).toEqual(['event_ticket_detail']);
  });

  test('seeds stable availability and supports empty or missing detail fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_ticket_test_schema_migrations', ['schema', 'data']);

    const list = await repository.querySource(source('event-detail.yaml', 'event_tickets'), { id: 'event-demo-007', fixture_state: null }, 0, 50);
    expect(list.data.map((row: any) => row.id)).toEqual(['ticket-event-007-general', 'ticket-event-007-standard', 'ticket-event-007-vip']);
    expect(list.data.find((row: any) => row.id === 'ticket-event-007-general')).toMatchObject({ name: 'General Admission', availability: 'Available', seats_available: 50 });

    const detail = source('ticket-detail.yaml', 'event_ticket_detail');
    expect(await repository.querySource(detail, { id: 'ticket-event-007-vip', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ event_name: 'OpenWood Collection Online Reveal', availability: 'Available' }) });
    expect((await repository.querySource(detail, { id: 'ticket-event-007-vip', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail, { id: 'ticket-does-not-exist', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
  });

  test('guards ticket create, update, delete, and stale-row boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_ticket_mutation_test_schema_migrations', ['schema', 'data']);
    const create = action('event-detail.yaml', 'create_event_ticket');
    const update = action('ticket-detail.yaml', 'edit_event_ticket');
    const remove = action('ticket-detail.yaml', 'delete_event_ticket');
    expect(create.permission).toBe('events.write');
    expect(update.permission).toBe('events.write');
    expect(remove.permission).toBe('events.write');

    const created = await repository.executeMutation(create.mutation, { values: { event_id: 'event-demo-007', name: 'Workshop Pass', registration_start: '2026-09-01 00:00:00', registration_end: '2026-09-20 00:00:00', maximum: 20, limit_max_per_order: 2 } });
    expect(created).toMatchObject({ name: 'Workshop Pass', maximum: 20 });
    await expect(repository.executeMutation(create.mutation, { values: { event_id: 'event-demo-007', name: 'Invalid Window', registration_start: '2026-09-20 00:00:00', registration_end: '2026-09-01 00:00:00' } })).rejects.toMatchObject({ status: 422 });

    const ticket = await repository.querySource(source('ticket-detail.yaml', 'event_ticket_detail'), { id: 'ticket-event-007-general', fixture_state: null }, 0, 1);
    const row = ticket.data;
    const updated = await repository.executeMutation(update.mutation, { id: row.id, expected_row_version: row.row_version, values: { name: 'General Admission Plus', price: 25, maximum: 50, limit_max_per_order: 2 } });
    expect(updated).toMatchObject({ id: row.id, name: 'General Admission Plus', price: 25 });
    await expect(repository.executeMutation(update.mutation, { id: row.id, expected_row_version: row.row_version, values: { name: 'Stale Ticket' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(remove.mutation, { id: 'ticket-event-007-vip', expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: created.row_version });
    expect((await repository.querySource(detailForTest(), { id: created.id, fixture_state: null }, 0, 1)).data).toEqual({});
  });
});

function detailForTest() {
  return source('ticket-detail.yaml', 'event_ticket_detail');
}
