import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events attendee Full Page Ticket parity', () => {
  test('binds the attendee report through page.id and the detail Print action', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/attendee-full-page-ticket.yaml');
    const api = yaml('api/attendee-full-page-ticket.yaml');
    const detail = yaml('pages/attendee-detail.yaml');
    expect(page.page.route).toBe('/events/attendees/full-page-ticket');
    expect(api.page.id).toBe('event-attendee-full-page-ticket');
    expect(discovered.pageDatasources.get('event-attendee-full-page-ticket')).toEqual(['event_attendee_full_page_ticket', 'event_attendee_full_page_ticket_blocks']);
    expect(detail.components[0].header_actions).toContainEqual({ id: 'print_attendee_full_page_ticket', label: 'Full Page Ticket', variant: 'secondary', permission: 'events.read' });
    expect(page.components[1]).toMatchObject({ type: 'TemplatePreview', template_source: 'event_registration_report_template_full_page_ticket' });
  });

  test('returns deterministic attendee report fields and ordered barcode blocks', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_full_page_ticket_migrations', ['schema', 'data']);
    const api = yaml('api/attendee-full-page-ticket.yaml');
    const ticket = await repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: null }, 0, 1);
    const blocks = await repository.querySource(api.datasources[1], { id: 'registration-demo-004', fixture_state: null }, 0, 20);
    expect(ticket.data).toMatchObject({ event_name: 'Live Music Festival', attendee_name: 'Douglas Fletcher', ticket_type: 'Free', barcode: 'BADGE-MUSIC-004', status: 'Ready' });
    expect(blocks.data).toHaveLength(9);
    expect(blocks.data[6]).toMatchObject({ label: 'QR Code', token_key: 'qr', content: 'BADGE-MUSIC-004' });
    expect(blocks.data[7]).toMatchObject({ label: 'Barcode', token_key: 'code128', content: 'BADGE-MUSIC-004' });
    database.close();
  });

  test('covers empty, missing, transport, and read-only report boundaries', async () => {
    const api = yaml('api/attendee-full-page-ticket.yaml');
    expect(api.actions).toBeUndefined();
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_full_page_ticket_state_migrations', ['schema', 'data']);
    expect((await repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(api.datasources[0], { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_ATTENDEE_FULL_PAGE_TICKET_UNAVAILABLE' });
    database.close();
  });
});
