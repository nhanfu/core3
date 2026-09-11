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

describe('Events attendee email parity', () => {
  test('binds the Odoo Send by Email action through the detail page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/attendee-detail.yaml');
    const api = yaml('api/attendee-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const send = action('attendee-detail.yaml', 'send_attendee_email');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(form.header_actions[0]).toMatchObject({ id: 'send_attendee_email', label: 'Send by Email', permission: 'events.write' });
    expect(api.page.id).toBe('event-attendee-detail');
    expect(discovered.pageDatasources.get('event-attendee-detail')).toContain('event_attendee_detail');
    expect(send).toMatchObject({
      type: 'server_form',
      modal_style: 'mail_composer',
      title: 'Compose Email',
      submit_label: 'Send',
      cancel_label: 'Discard',
      permission: 'events.write',
      action: 'events.registrations.send_email',
      handler: 'yaml_mutation',
      operation: 'create',
    });
    expect(send.fields.map((field: any) => [field.field, field.type])).toEqual([
      ['registration_id', 'hidden'],
      ['recipient_name', 'mail_recipient'],
      ['recipient_email', 'hidden'],
      ['subject', 'text'],
      ['body_html', 'mail_body'],
      ['attachment_name', 'mail_attachment'],
    ]);
    expect(send.mutation.table).toBe('event_registration_emails');
  });

  test('seeds deterministic mail audit rows and guards the send mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_email_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_attendee_email_test_migrations', ['schema', 'data']);

    const detail = source('attendee-detail.yaml', 'event_attendee_detail');
    const attendee = await repository.querySource(detail, { id: 'registration-demo-unconfirmed', fixture_state: null }, 0, 1);
    expect(attendee.data).toMatchObject({
      id: 'registration-demo-unconfirmed',
      event_schedule: '05 Dec 2026 10:00 - 12:00',
      event_venue: 'Private venue',
    });

    const mutation = action('attendee-detail.yaml', 'send_attendee_email').mutation;
    const sent = await repository.executeMutation(mutation, {
      values: {
        registration_id: 'registration-demo-unconfirmed',
        recipient_name: 'Unconfirmed Guest',
        recipient_email: 'unconfirmed.guest@example.com',
        subject: 'Your badge for An unpublished event',
        body_html: '<p>Hello Unconfirmed Guest</p>',
        attachment_name: 'Badge - An unpublished event - Unconfirmed Guest.pdf',
      },
    });
    expect(sent).toMatchObject({
      id: 'event-registration-email-registration-demo-unconfirmed-1',
      registration_id: 'registration-demo-unconfirmed',
      state: 'Sent',
      row_version: 1,
    });
    expect((await repository.query('SELECT COUNT(*) AS count FROM event_registration_emails WHERE registration_id = \'registration-demo-unconfirmed\''))[0].count).toBe(1);

    await expect(repository.executeMutation(mutation, {
      values: {
        registration_id: 'registration-demo-unconfirmed',
        recipient_name: 'Unconfirmed Guest',
        recipient_email: 'unconfirmed.guest@example.com',
        subject: '',
        body_html: '<p>Hello</p>',
        attachment_name: 'Badge.pdf',
      },
    })).rejects.toMatchObject({ status: 400, message: 'subject is required' });
    await expect(repository.executeMutation(mutation, {
      values: {
        registration_id: 'missing-registration',
        recipient_name: 'Missing Guest',
        recipient_email: 'missing@example.com',
        subject: 'Missing',
        body_html: '<p>Missing</p>',
        attachment_name: 'Badge.pdf',
      },
    })).rejects.toMatchObject({ status: 404, code: 'EVENT_ATTENDEE_NOT_FOUND' });
    database.close();
  });

  test('keeps the email fixture and action free of runtime-dependent values', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911190000-022-event-attendee-email.yaml'), 'utf8');
    const api = readFileSync(join(serviceRoot, 'api/attendee-detail.yaml'), 'utf8');
    expect(migration).toContain('version: 0.0.22');
    expect(migration).toContain('2026-01-15 09:05:00');
    expect(`${migration}\n${api}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
  });
});
