import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = yaml('api/mailing-contacts.yaml').actions.find((candidate: any) => candidate.id === 'add_selected_contacts_to_mailing_list');
const isolatedDiscovery = () => {
  const sandbox = join(tmpdir(), `core3-email-marketing-add-discovery-${crypto.randomUUID()}`);
  mkdirSync(join(sandbox, 'services'), { recursive: true });
  cpSync(root, join(sandbox, 'services/email-marketing'), { recursive: true });
  const discovered = discoverPages(sandbox);
  rmSync(sandbox, { recursive: true, force: true });
  return discovered;
};

describe('Email Marketing add selected contacts to mailing list wizard', () => {
  test('maps the Odoo wizard through the selected-contacts page/API contract', () => {
    const page = yaml('pages/mailing-contacts.yaml');
    const api = yaml('api/mailing-contacts.yaml');
    const list = page.components[0];
    const discovered = isolatedDiscovery();

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe('mailing-contacts');
    expect(discovered.pageDatasources.get('mailing-contacts')).toContain('mailing_subscriptions');
    expect(list.bulk_actions).toEqual(expect.arrayContaining([
      { id: 'add_selected_contacts_to_mailing_list', label: 'Add to List', permission: 'email_marketing.manage' },
    ]));
    expect(action).toMatchObject({
      type: 'server_form',
      title: 'Add Selected Contacts to a Mailing List',
      permission: 'email_marketing.manage',
      action: 'mass_mailing.mailing_contact_to_list_action',
      submit_label: 'Add',
      cancel_label: 'Cancel',
      handler: 'yaml_mutation',
    });
    expect(action.fields).toEqual([{ field: 'mailing_list_id', label: 'Mailing List', type: 'select', options_source: 'mailing_subscription_lists', required: true }]);
    expect(action.mutation.steps[0].query).toContain('ON CONFLICT (contact_id, list_id) DO NOTHING');
  });

  test('adds only new selected contacts, skips existing membership, and refreshes counts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'email_mailing_add_contacts_test', ['schema', 'data']);

    const selectedIds = ['mailing-subscription-aristide-customers', 'mailing-subscription-franz-imported'];
    const result = await repository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-empty-001' }) as any;
    expect(result).toMatchObject({ mailing_list_id: 'mailing-list-empty-001', selected_count: 2, subscriber_count: 2 });
    expect(await repository.query('SELECT c.name, s.list_id FROM mailing_subscriptions s JOIN mailing_contacts c ON c.id = s.contact_id WHERE s.list_id = ? ORDER BY c.name', ['mailing-list-empty-001'])).toEqual([
      { name: 'Aristide Antario', list_id: 'mailing-list-empty-001' },
      { name: 'Franz Faubourg', list_id: 'mailing-list-empty-001' },
    ]);

    const replay = await repository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-empty-001' }) as any;
    expect(replay).toMatchObject({ selected_count: 2, subscriber_count: 2 });
    expect(await repository.query('SELECT subscriber_count, contact_count FROM mailing_lists WHERE id = ?', ['mailing-list-empty-001'])).toEqual([{ subscriber_count: 2, contact_count: 2 }]);
    database.close();
  });

  test('preserves durable membership across restart and rejects invalid state or scope', async () => {
    const databasePath = `/tmp/core3-email-add-contacts-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `email_mailing_add_contacts_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const selectedIds = ['mailing-subscription-aristide-customers'];
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-empty-001' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM mailing_subscriptions WHERE contact_id = ? AND list_id = ?', ['mailing-contact-aristide-001', 'mailing-list-empty-001'])).toEqual([{ count: 1 }]);
    await expect(secondRepository.executeMutation(action.mutation, { selectedIds: [], mailing_list_id: 'mailing-list-empty-001' })).rejects.toMatchObject({ status: 400, code: 'EMAIL_MAILING_ADD_SELECTION_REQUIRED' });
    await expect(secondRepository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-missing' })).rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_ADD_LIST_INVALID' });
    await secondRepository.run("UPDATE mailing_contacts SET active = false WHERE id = 'mailing-contact-aristide-001'");
    await expect(secondRepository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-imported-001' })).rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_ADD_CONTACT_INACTIVE' });
    await secondRepository.run("UPDATE mailing_contacts SET active = true WHERE id = 'mailing-contact-aristide-001'");
    await secondRepository.run("INSERT INTO mailing_lists (id, name, description, subscriber_count, state, row_version, active, favorite, is_public, company_name, contact_count, mailing_count, bounce_count, optout_count, blacklist_count, created_at, updated_at) VALUES ('mailing-list-other-001', 'Other Company List', 'Foreign audience', 0, 'Active', 1, true, false, true, 'Other Company', 0, 0, 0, 0, 0, TIMESTAMP '2026-01-15 09:00:00', TIMESTAMP '2026-01-15 09:00:00')");
    await expect(secondRepository.executeMutation(action.mutation, { selectedIds, mailing_list_id: 'mailing-list-other-001', current_company_name: 'Core3 Vietnam' })).rejects.toMatchObject({ status: 403, code: 'EMAIL_MAILING_ADD_LIST_SCOPE_REQUIRED' });
    await expect(secondRepository.executeMutation(action.mutation, { selectedIds: ['mailing-subscription-missing'], mailing_list_id: 'mailing-list-empty-001' })).rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_ADD_CONTACTS_INVALID' });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('declares permissions, transport state, idempotence, and the separate deferred send branch', () => {
    expect(action.permission).toBe('email_marketing.manage');
    expect(action.refresh).toEqual(['mailing_subscriptions', 'mailing_subscription_lists']);
    expect(yaml('api/mailing-contacts.yaml').datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMAIL_MAILING_CONTACTS_UNAVAILABLE' });
    expect(action.mutation.steps[0].query).toMatch(/ON CONFLICT \(contact_id, list_id\) DO NOTHING/);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'EMAIL_MAILING_ADD_SELECTION_REQUIRED',
      'EMAIL_MAILING_ADD_LIST_INVALID',
      'EMAIL_MAILING_ADD_LIST_SCOPE_REQUIRED',
      'EMAIL_MAILING_ADD_CONTACT_SCOPE_REQUIRED',
      'EMAIL_MAILING_ADD_CONTACT_INACTIVE',
      'EMAIL_MAILING_ADD_CONTACTS_INVALID',
    ]);
    expect(action.submit_label).toBe('Add');
    expect(action.cancel_label).toBe('Cancel');
  });
});
