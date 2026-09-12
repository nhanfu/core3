import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/mailing-contacts.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'import_mailing_contacts');

describe('Email Marketing mailing contact import wizard', () => {
  test('matches the Odoo modal and keeps page/API ownership', () => {
    const page = yaml('pages/mailing-contacts.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ selectable: true, bulk_actions: [{ id: 'import_mailing_contacts', label: 'Import', permission: 'email_marketing.manage' }] });
    expect(api.page.id).toBe('mailing-contacts');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('mailing-contacts')).toContain('mailing_subscriptions');
    expect(action).toMatchObject({ type: 'server_form', title: 'Import Mailing Contacts', permission: 'email_marketing.manage', submit_label: 'Import', cancel_label: 'Discard', handler: 'yaml_mutation' });
    expect(action.fields.map((field: any) => field.label)).toEqual(['Import contacts in', 'Contact List']);
  });

  test('imports named and plain addresses idempotently and updates list counts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'email_mailing_import_test', ['schema', 'data']);
    await expect(repository.executeMutation(action.mutation, { values: { mailing_list_id: 'mailing-list-missing', contact_list: 'valid@example.com' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_IMPORT_LIST_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { mailing_list_id: 'mailing-list-empty-001', contact_list: 'not-an-email' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_IMPORT_EMAIL_INVALID' });
    const values = { mailing_list_id: 'mailing-list-empty-001', contact_list: '"New Person" <new.person@example.com>\nplain.person@example.com\nplain.person@example.com' };
    await repository.executeMutation(action.mutation, { values });
    await repository.executeMutation(action.mutation, { values });
    expect(await repository.query('SELECT name, email FROM mailing_contacts WHERE email IN (?, ?) ORDER BY email', ['new.person@example.com', 'plain.person@example.com']))
      .toEqual([{ name: 'New Person', email: 'new.person@example.com' }, { name: 'plain.person@example.com', email: 'plain.person@example.com' }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM mailing_subscriptions WHERE list_id = ? AND contact_id IN (SELECT id FROM mailing_contacts WHERE email IN (?, ?))', ['mailing-list-empty-001', 'new.person@example.com', 'plain.person@example.com']))
      .toEqual([{ count: 2 }]);
    expect(await repository.query('SELECT subscriber_count, contact_count FROM mailing_lists WHERE id = ?', ['mailing-list-empty-001']))
      .toEqual([{ subscriber_count: 2, contact_count: 2 }]);
  });

  test('enforces list, email, permission, transport, and deferred upload boundaries', () => {
    expect(action.permission).toBe('email_marketing.manage');
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual(['EMAIL_MAILING_IMPORT_LIST_INVALID', 'EMAIL_MAILING_IMPORT_CONTACTS_REQUIRED', 'EMAIL_MAILING_IMPORT_EMAIL_INVALID']);
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
    expect(action.fields[1].type).toBe('textarea');
    expect(action.fields.some((field: any) => field.field === 'upload_file')).toBe(false);
  });
});
