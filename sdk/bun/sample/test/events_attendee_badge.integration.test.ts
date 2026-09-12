import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events attendee badge parity', () => {
  test('binds the Badge report through separate page and API page ids', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/attendee-badge.yaml');
    const api = yaml('api/attendee-badge.yaml');
    const attendeePage = yaml('pages/attendee-detail.yaml');
    const attendeeApi = yaml('api/attendee-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('event-attendee-badge');
    expect(api.page.id).toBe('event-attendee-badge');
    expect(discovered.pageDatasources.get('event-attendee-badge')).toEqual(['event_attendee_badge', 'event_attendee_badge_answers']);
    expect(attendeePage.components[0].header_actions[0]).toMatchObject({ id: 'print_attendee_badge', label: 'Print Badge', permission: 'events.read' });
    expect(attendeeApi.actions.find((action: any) => action.id === 'print_attendee_badge')).toMatchObject({ type: 'client', permission: 'events.read' });
    expect(page.components[0].header_actions[0]).toMatchObject({ id: 'print_attendee_badge_document', label: 'Print' });
  });

  test('seeds deterministic badges and supports ready, empty, missing, transport, and state guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_badge_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_badge_test_migrations', ['schema', 'data']);
    const source = yaml('api/attendee-badge.yaml').datasources[0];
    expect(await repository.querySource(source, { id: 'registration-demo-004', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ attendee_name: 'Douglas Fletcher', barcode: 'CORE3-REG-0004', print_status: 'Ready' }) });
    expect((await repository.querySource(source, { id: 'registration-demo-004', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'missing-registration', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'registration-demo-004', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_ATTENDEE_BADGE_UNAVAILABLE' });
    const validate = yaml('api/attendee-badge.yaml').actions.find((action: any) => action.id === 'validate_print_attendee_badge').mutation;
    await expect(repository.executeMutation(validate, { id: 'registration-demo-004', expected_row_version: 1 })).resolves.toMatchObject({ barcode: 'CORE3-REG-0004' });
    await expect(repository.executeMutation(validate, { id: 'registration-demo-unconfirmed', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_BADGE_UNAVAILABLE' });
    await expect(repository.executeMutation(validate, { id: 'missing-registration', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'EVENT_ATTENDEE_BADGE_NOT_FOUND' });
    database.close();
  });

  test('keeps the report fixture free of runtime-dependent values', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260912100000-025-event-attendee-badges.yaml'), 'utf8');
    const api = readFileSync(join(serviceRoot, 'api/attendee-badge.yaml'), 'utf8');
    expect(migration).toContain('version: 0.0.25');
    expect(`${migration}\n${api}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
  });
});
