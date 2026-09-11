import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events registration statistics parity', () => {
  test('binds the event-scoped Odoo action to a page and API by page.id', () => {
    const page = yaml('pages/event-registration-statistics.yaml');
    const list = page.components[0];
    const api = yaml('api/event-registration-statistics.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.route).toBe('/events/registration-statistics');
    expect(page.page.breadcrumb).toEqual(['Marketing', 'Events', 'Event', 'Registration statistics']);
    expect(list).toMatchObject({ source: 'event_registration_statistics', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'kanban', 'list']);
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'registration_date', measure_field: 'registration_count', type: 'bar' });
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ mobile: true, group_by: 'registration_date_label' });
    expect(api.page.id).toBe('event-registration-statistics');
    expect(api.datasources.map((source: any) => source.id)).toEqual(['event_registration_statistics', 'event_registration_statistics_event']);
    expect(discovered.pages.get('event-registration-statistics')?.config.page.route).toBe('/events/registration-statistics');
    expect(discovered.pageDatasources.get('event-registration-statistics')).toEqual(['event_registration_statistics', 'event_registration_statistics_event']);
  });

  test('reads the fixed Design Fair fixture with the Odoo default registered filter', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_registration_statistics_read_migrations', ['schema', 'data']);
    const source = yaml('api/event-registration-statistics.yaml').datasources[0];
    const rows = await repository.querySource(source, { event_id: 'event-demo-001', state: 'Registered', fixture_state: null, q: null }, 0, 50);

    expect(rows.data).toHaveLength(3);
    expect(rows.data.map((row: any) => row.attendee_name)).toEqual(['Ron Gibson', 'Samar Basra', 'Willie Burke']);
    expect(rows.data.map((row: any) => row.ticket_type)).toEqual(['Standard', 'Free', 'Standard']);
    expect(rows.data.every((row: any) => row.registration_date_label === '08 Sep 2026')).toBe(true);
    expect(await repository.querySource(source, { event_id: 'event-demo-001', state: 'Attended', fixture_state: null, q: null }, 0, 50)).toMatchObject({ data: [] });
    database.close();
  });

  test('keeps empty, missing, and transport contracts explicit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_registration_statistics_error_migrations', ['schema', 'data']);
    const source = yaml('api/event-registration-statistics.yaml').datasources[0];

    expect(await repository.querySource(source, { event_id: 'event-demo-001', state: 'Registered', fixture_state: 'empty', q: null }, 0, 50)).toMatchObject({ data: [] });
    await expect(repository.querySource(source, { event_id: 'event-demo-001', state: 'Registered', fixture_state: 'not_found', q: null }, 0, 50)).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
    await expect(repository.querySource(source, { event_id: 'event-demo-001', state: 'Registered', fixture_state: 'transport_error', q: null }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EVENT_REGISTRATION_STATISTICS_UNAVAILABLE' });
    database.close();
  });
});
