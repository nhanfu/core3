import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events attendee creation parity', () => {
  test('exposes the create form from the page-owned attendee list', () => {
    const page = yaml('pages/attendees.yaml');
    const api = yaml('api/attendees.yaml');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_event_attendee');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.components[0]).toMatchObject({ source: 'event_attendees', create_action: 'create_event_attendee' });
    expect(create).toMatchObject({ type: 'server_form', permission: 'events.write', action: 'events.registrations.create', handler: 'yaml_mutation', operation: 'create' });
    const eventRegistration = yaml('pages/events.yaml').actions.find((candidate: any) => candidate.id === 'register_event_attendee');
    expect(eventRegistration).toMatchObject({ action: 'events.registrations.register', operation: 'register' });
    expect(eventRegistration.action).not.toBe(create.action);
    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'event_registrations', required: ['event_id', 'attendee_name'] });
    expect(discovered.pageDatasources.get('attendees')).toContain('event_attendees');
  });

  test('persists registration, increments event seats, and rejects invalid boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_attendee_create_migrations', ['schema', 'data']);
    const create = yaml('api/attendees.yaml').actions.find((candidate: any) => candidate.id === 'create_event_attendee');
    const values = { event_id: 'event-demo-002', attendee_name: 'Created Guest', attendee_email: 'created@example.com', attendee_phone: '+1 202 555 0188', company_name: 'Created Company', ticket_type: 'General Admission' };

    const before = await repository.query('SELECT registration_count, row_version FROM events WHERE id = ?', ['event-demo-002']);
    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'registration-event-demo-002-3', event_id: values.event_id, event_name: 'Conference for Architects', attendee_name: values.attendee_name, state: 'Registered', row_version: 1 });
    expect((await repository.query('SELECT registration_count, row_version FROM events WHERE id = ?', ['event-demo-002']))[0]).toMatchObject({ registration_count: before[0].registration_count + 1, row_version: before[0].row_version + 1 });
    expect((await repository.query('SELECT attendee_name, attendee_email FROM event_registrations WHERE id = ?', [created.id]))[0]).toEqual({ attendee_name: values.attendee_name, attendee_email: values.attendee_email });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, attendee_name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_ATTENDEE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, attendee_name: 'Bad Email Guest', attendee_email: 'invalid-email' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_ATTENDEE_EMAIL_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, event_id: 'event-demo-001', attendee_name: 'Closed Event Guest' } })).rejects.toMatchObject({ status: 409, code: 'EVENT_REGISTRATION_NOT_OPEN' });
    database.close();
  });
});
