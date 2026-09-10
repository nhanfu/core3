import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events Registration Desk parity slice', () => {
  test('preserves the client-action route and page-id API ownership', () => {
    const page = yaml('pages/registration-desk.yaml');
    const api = yaml('api/registration-desk.yaml');
    const scanner = page.components.find((component: any) => component.type === 'ScannerView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.route).toBe('/events/registration-desk');
    expect(scanner).toMatchObject({
      client_action: 'event_barcode_action_main_view',
      scan_action: 'scan_registration_badge',
      source: 'event_registration_desk',
      fullscreen: true,
    });
    expect(api.page.id).toBe('registration-desk');
    expect(api.datasources[0]).toMatchObject({ id: 'event_registration_desk', permission: 'events.read', single: true });
    expect(discovered.pages.get('registration-desk')?.config.page.route).toBe('/events/registration-desk');
    expect(discovered.pageDatasources.get('registration-desk')).toEqual(['event_registration_desk']);
    expect(page.actions.find((action: any) => action.id === 'scan_registration_badge')).toMatchObject({
      type: 'server', permission: 'events.write', action: 'events.registrations.scan',
    });
    expect(page.actions.some((action: any) => String(action.action || '').startsWith('event.'))).toBe(false);
  });

  test('returns deterministic ready, invalid, duplicate, capacity, and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_registration_desk_schema_migrations', ['schema', 'data']);
    const source = yaml('api/registration-desk.yaml').datasources[0];

    const ready = await repository.querySource(source, { fixture_state: null }, 0, 1);
    expect(ready.data).toMatchObject({ desk_state: 'ready', event_id: 'event-demo-002', remaining: 177 });
    for (const state of ['invalid', 'duplicate', 'capacity', 'empty']) {
      const result = await repository.querySource(source, { fixture_state: state }, 0, 1);
      expect(result.data.desk_state, state).toBe(state);
    }
  });

  test('guards barcode scan and manual registration mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_registration_desk_mutation_migrations', ['schema', 'data']);
    const page = yaml('pages/registration-desk.yaml');
    const scan = page.actions.find((action: any) => action.id === 'scan_registration_badge');
    const register = page.actions.find((action: any) => action.id === 'register_event_from_desk');

    await expect(repository.executeMutation(scan.mutation, { values: { barcode: 'BADGE-NOT-FOUND' }, barcode: 'BADGE-NOT-FOUND' }))
      .rejects.toMatchObject({ status: 404 });
    await expect(repository.executeMutation(scan.mutation, { values: { barcode: 'BADGE-ATTENDED-001' }, barcode: 'BADGE-ATTENDED-001' }))
      .rejects.toMatchObject({ status: 409 });

    const checkedIn = await repository.executeMutation(scan.mutation, { values: { barcode: 'BADGE-REGISTERED-002' }, barcode: 'BADGE-REGISTERED-002' });
    expect(checkedIn).toMatchObject({ attendee_name: 'Jamie Lee', state: 'Attended', barcode: 'BADGE-REGISTERED-002' });

    const baseValues = { event_id: 'event-demo-002', event_name: 'Conference for Architects', attendee_name: 'New Guest', attendee_email: 'new.guest@example.com', ticket_type: 'General Admission' };
    const registered = await repository.executeMutation(register.mutation, { values: baseValues });
    expect(registered).toMatchObject({ attendee_name: 'New Guest', state: 'Registered' });

    await expect(repository.executeMutation(register.mutation, { values: { ...baseValues, attendee_name: 'Duplicate Guest' } }))
      .rejects.toMatchObject({ status: 409 });
    await repository.run("UPDATE events SET capacity = registration_count WHERE id = 'event-demo-002'");
    await expect(repository.executeMutation(register.mutation, { values: { ...baseValues, attendee_name: 'Capacity Guest', attendee_email: 'capacity@example.com' } }))
      .rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(register.mutation, { values: { ...baseValues, event_id: 'event-demo-008', event_name: 'An unpublished event', attendee_email: 'closed@example.com' } }))
      .rejects.toMatchObject({ status: 404 });
  });
});
