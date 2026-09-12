import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/mailing-contacts.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('SMS Marketing Mailing List Contacts action parity', () => {
  test('joins the SMS contact action to its layout and menu', () => {
    const page = yaml('pages/mailing-contacts.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page.id).toBe('sms-mailing-contacts');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(discovered.pageDatasources.get('sms-mailing-contacts')).toEqual(['sms_subscriptions', 'sms_subscription_lists', 'sms_subscription_contacts']);
    expect(yaml('manifest.yaml').menu.groups[0].items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/sms-mailing-contacts', label: 'Mailing List Contacts' })]));
  });

  test('seeds idempotently and supports SMS filters plus empty results', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_contacts_test', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_contacts_test', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'sms_subscriptions');
    const all = await repository.querySource(source, { q: null, list_id: null, status: null, valid_sms: null, phone_sanitized_blacklisted: false, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => `${row.list_name}:${row.contact_name}`)).toEqual(['Opt-in Customers:Aristide Antario', 'Opt-in Customers:Beverly Bridge', 'Opt-in Customers:Carol Cartridge', 'VIP Customers:Franz Faubourg']);
    expect((await repository.querySource(source, { q: null, list_id: null, status: 'Blacklisted', valid_sms: null, phone_sanitized_blacklisted: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ contact_name: 'Elsa Ericson', valid_sms: false });
    expect((await repository.querySource(source, { q: 'Franz', list_id: 'sms-list-demo-002', status: 'Subscribed', valid_sms: true, phone_sanitized_blacklisted: false, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ mobile: '+33 6 98 76 54 32', status: 'Subscribed' });
    expect((await repository.querySource(source, { q: null, list_id: null, status: null, valid_sms: null, phone_sanitized_blacklisted: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('guards add, opt-out/resubscribe, blacklist, stale rows, and explicit failure contracts', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_contacts_workflow_test', ['schema', 'data']);
    const create = action('create_sms_subscription');
    const created = await repository.executeMutation(create.mutation, { values: { contact_id: 'sms-contact-franz-001', list_id: 'sms-list-demo-001' } });
    expect(created).toMatchObject({ row_version: 1, opt_out: false });
    await expect(repository.executeMutation(create.mutation, { values: { contact_id: 'sms-contact-franz-001', list_id: 'sms-list-demo-001' } })).rejects.toMatchObject({ status: 409, code: 'SMS_SUBSCRIPTION_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { contact_id: 'sms-contact-elsa-001', list_id: 'sms-list-demo-002' } })).rejects.toMatchObject({ status: 409, code: 'SMS_CONTACT_BLACKLISTED' });
    const unsubscribe = action('unsubscribe_sms_subscription');
    const optedOut = await repository.executeMutation(unsubscribe.mutation, { id: created.id, expected_row_version: 1 });
    expect(optedOut).toMatchObject({ opt_out: true, row_version: 2 });
    await expect(repository.executeMutation(unsubscribe.mutation, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SMS_SUBSCRIPTION_STATE_CHANGED' });
    const subscribe = action('subscribe_sms_subscription');
    expect(await repository.executeMutation(subscribe.mutation, { id: created.id, expected_row_version: 2 })).toMatchObject({ opt_out: false, row_version: 3 });
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'SMS_MAILING_CONTACTS_UNAVAILABLE' });
    expect(action('edit_sms_subscription').mutation.concurrency).toEqual({ required: true });
  });
});
