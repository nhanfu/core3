import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/mailing-contacts.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Email Marketing mailing contacts and subscriptions slice', () => {
  test('keeps the contacts page layout-only and discovers the API by page.id', () => {
    const page = yaml('pages/mailing-contacts.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.id).toBe('mailing-contacts');
    expect(page.page.route).toBe('/mailing-contacts');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('mailing-contacts')).toEqual(expect.arrayContaining([
      'mailing_subscriptions',
      'mailing_subscription_lists',
      'mailing_subscription_contacts',
      'mailing_subscription_optout_reasons',
    ]));
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'campaigns').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/mailing-contacts', permission: 'email_marketing.read' })]));
    expect(yaml('api/list-detail.yaml').actions.find((candidate: any) => candidate.id === 'mailing_list_subscribers'))
      .toMatchObject({ navigate_to: '/mailing-contacts', params: { list_id: '{state.mailing_list_detail.id}' } });
  });

  test('seeds deterministic Odoo contacts and supports filtering plus empty results', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_contacts_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_contacts_test', ['schema', 'data']);

    const source = api.datasources.find((candidate: any) => candidate.id === 'mailing_subscriptions');
    const all = await repository.querySource(source, { q: null, list_id: null, status: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => `${row.list_name}:${row.contact_name}`)).toEqual([
      'Customers:Aristide Antario',
      'Customers:Beverly Bridge',
      'Customers:Carol Cartridge',
      'Customers:David Dawson',
      'Customers:Elsa Ericson',
      'Imported Contacts:Carol Cartridge',
      'Imported Contacts:Franz Faubourg',
      'Imported Contacts:Gilbert Gilson',
    ]);
    expect(all.data.find((row: any) => row.contact_name === 'Elsa Ericson')).toMatchObject({ is_blacklisted: true, message_bounce: 5, status: 'Opted out' });
    expect((await repository.querySource(source, { q: 'Franz', list_id: 'mailing-list-imported-001', status: 'Subscribed', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['mailing-subscription-franz-imported']);
    expect((await repository.querySource(source, { q: null, list_id: 'mailing-list-empty-001', status: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, list_id: null, status: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('guards add/edit/unsubscribe/resubscribe/delete with permissions, blacklist, and stale rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_contacts_workflow_test', ['schema', 'data']);

    const create = action('create_mailing_subscription');
    const created = await repository.executeMutation(create.mutation, {
      values: { contact_id: 'mailing-contact-franz-001', list_id: 'mailing-list-empty-001' },
    });
    expect(created).toMatchObject({ id: 'mailing-subscription-mailing-contact-franz-001-mailing-list-empty-001', row_version: 1, opt_out: false });
    expect(await repository.query('SELECT subscriber_count, contact_count FROM mailing_lists WHERE id = ?', ['mailing-list-empty-001']))
      .toEqual([{ subscriber_count: 1, contact_count: 1 }]);
    await expect(repository.executeMutation(create.mutation, { values: { contact_id: 'mailing-contact-franz-001', list_id: 'mailing-list-empty-001' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_SUBSCRIPTION_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { contact_id: 'mailing-contact-elsa-001', list_id: 'mailing-list-empty-001' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_CONTACT_BLACKLISTED' });
    await expect(repository.executeMutation(create.mutation, { values: { contact_id: 'mailing-contact-missing', list_id: 'mailing-list-empty-001' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_CONTACT_INVALID' });

    const unsubscribe = action('unsubscribe_mailing_subscription');
    const optedOut = await repository.executeMutation(unsubscribe.mutation, {
      id: created.id,
      expected_row_version: 1,
      opt_out_reason_id: 'email-optout-changed-mind',
    });
    expect(optedOut).toMatchObject({ id: created.id, opt_out: true, opt_out_reason_id: 'email-optout-changed-mind', row_version: 2 });
    await expect(repository.executeMutation(unsubscribe.mutation, { id: created.id, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_SUBSCRIPTION_STATE_CHANGED' });

    const subscribe = action('subscribe_mailing_subscription');
    const resubscribed = await repository.executeMutation(subscribe.mutation, { id: created.id, expected_row_version: 2 });
    expect(resubscribed).toMatchObject({ id: created.id, opt_out: false, opt_out_reason_id: null, row_version: 3 });
    await expect(repository.executeMutation(subscribe.mutation, { id: created.id, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_SUBSCRIPTION_STATE_CHANGED' });

    const edit = action('edit_mailing_subscription');
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 3,
      values: { opt_out: true, opt_out_reason_id: 'email-optout-other', opt_out_datetime: '2026-01-15 11:15:00' },
    });
    expect(edited).toMatchObject({ opt_out: true, opt_out_reason_id: 'email-optout-other', row_version: 4 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 3, values: { opt_out: false } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'mailing-subscription-missing', expected_row_version: 1, values: { opt_out: false } }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_SUBSCRIPTION_NOT_FOUND' });

    const remove = action('delete_mailing_subscription');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    expect(await repository.query('SELECT subscriber_count, contact_count FROM mailing_lists WHERE id = ?', ['mailing-list-empty-001']))
      .toEqual([{ subscriber_count: 0, contact_count: 0 }]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_SUBSCRIPTION_NOT_FOUND' });
  });

  test('keeps transport-error, CRUD, workflow, and concurrency contracts explicit', () => {
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_MAILING_CONTACTS_UNAVAILABLE' });
    for (const id of ['create_mailing_subscription', 'edit_mailing_subscription', 'unsubscribe_mailing_subscription', 'subscribe_mailing_subscription', 'delete_mailing_subscription']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toMatch(/^email_marketing\.(read|write|manage)$/);
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('create_mailing_subscription').permission).toBe('email_marketing.manage');
    expect(action('unsubscribe_mailing_subscription').permission).toBe('email_marketing.write');
    expect(action('edit_mailing_subscription').mutation.concurrency).toEqual({ required: true });
    expect(action('delete_mailing_subscription').mutation.concurrency).toEqual({ required: true });
    expect(action('unsubscribe_mailing_subscription').mutation.steps[0].expect_changed).toBe(true);
    expect(action('subscribe_mailing_subscription').mutation.steps[0].expect_changed).toBe(true);
    for (const file of ['20260910270000-006-email-mailing-contacts.yaml', '20260910271000-007-email-mailing-contact-demo.yaml']) {
      expect(readFileSync(join(serviceRoot, 'migrations', file), 'utf8')).not.toMatch(/CURRENT_TIMESTAMP|CURRENT_DATE|gen_random_uuid|random_uuid/i);
    }
  });
});
