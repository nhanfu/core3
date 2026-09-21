import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/lists.yaml');
const api = yaml('api/lists.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'merge_mailing_lists');
const migrationRoot = join(serviceRoot, 'migrations');

describe('Email Marketing mailing list merge wizard', () => {
  test('maps the Odoo form action through the page/API contract', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = page.components[0];

    expect(page.page.id).toBe('mailing-lists');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('mailing-lists')).toContain('mailing_lists');
    expect(list.bulk_actions).toContainEqual({ id: 'merge_mailing_lists', label: 'Merge', permission: 'email_marketing.manage' });
    expect(action).toMatchObject({
      type: 'server_form',
      title: 'Merge Mass Mailing List',
      action: 'mailing_list_merge_action',
      permission: 'email_marketing.manage',
      submit_label: 'Merge',
      cancel_label: 'Cancel',
      handler: 'yaml_mutation',
    });
    expect(action.fields).toEqual([
      expect.objectContaining({ field: 'merge_options', label: 'Merge Option', required: true }),
      expect.objectContaining({ field: 'new_list_name', label: 'New Mailing List Name' }),
      expect.objectContaining({ field: 'dest_list_id', label: 'Destination Mailing List', options_source: 'mailing_list_merge_destinations' }),
      expect.objectContaining({ field: 'archive_src_lists', label: 'Archive source mailing lists', type: 'checkbox' }),
    ]);
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/wizard/mailing_list_merge_views.xml', 'utf8'))
      .toMatch(/binding_model_id.*model_mailing_list/s);
  });

  test('merges opted-in, non-blacklisted contacts into an existing destination without duplicates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrationRoot, undefined, 'email_mailing_list_merge_test', ['schema', 'data']);

    const result = await repository.executeMutation(action.mutation, {
      selectedIds: ['mailing-list-demo-001', 'mailing-list-imported-001'],
      values: { merge_options: 'existing', dest_list_id: 'mailing-list-empty-001', archive_src_lists: false },
      current_company_name: 'Core3 Vietnam',
    }) as any;

    expect(result).toMatchObject({ id: 'mailing-list-empty-001', name: 'Empty list', active: true, merged_subscription_count: 4, archived_source_count: 0 });
    expect(await repository.query("SELECT c.email FROM mailing_subscriptions s JOIN mailing_contacts c ON c.id = s.contact_id WHERE s.list_id = 'mailing-list-empty-001' ORDER BY c.email"))
      .toEqual([
        { email: 'alexandre.antario@example.com' },
        { email: 'beverly.bridge@example.com' },
        { email: 'carol.cartridge@example.com' },
        { email: 'franz.faubourg@example.com' },
      ]);

    const replay = await repository.executeMutation(action.mutation, {
      selectedIds: ['mailing-list-demo-001', 'mailing-list-imported-001'],
      values: { merge_options: 'existing', dest_list_id: 'mailing-list-empty-001', archive_src_lists: false },
      current_company_name: 'Core3 Vietnam',
    }) as any;
    expect(replay).toMatchObject({ id: 'mailing-list-empty-001', merged_subscription_count: 4 });
    expect(await repository.query("SELECT COUNT(*) AS count FROM mailing_subscriptions WHERE list_id = 'mailing-list-empty-001'"))
      .toEqual([{ count: 4 }]);
    database.close();
  });

  test('creates a durable destination and archives source lists when requested', async () => {
    const databasePath = `/tmp/core3-email-mailing-list-merge-${crypto.randomUUID()}.duckdb`;
    const migrationName = `email_mailing_list_merge_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, migrationRoot, undefined, migrationName, ['schema', 'data']);

    const created = await firstRepository.executeMutation(action.mutation, {
      selectedIds: ['mailing-list-demo-001', 'mailing-list-imported-001'],
      values: { merge_options: 'new', new_list_name: 'Merged Audience', archive_src_lists: true },
      current_company_name: 'Core3 Vietnam',
    }) as any;
    expect(created).toMatchObject({ id: 'mailing-list-merge-merged-audience', name: 'Merged Audience', active: true, state: 'Active', merged_subscription_count: 4, archived_source_count: 2 });
    expect(await firstRepository.query("SELECT id, active, state FROM mailing_lists WHERE id IN ('mailing-list-demo-001', 'mailing-list-imported-001') ORDER BY id"))
      .toEqual([
        { id: 'mailing-list-demo-001', active: false, state: 'Archived' },
        { id: 'mailing-list-imported-001', active: false, state: 'Archived' },
      ]);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, migrationRoot, undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query("SELECT name, subscriber_count, contact_count FROM mailing_lists WHERE id = 'mailing-list-merge-merged-audience'"))
      .toEqual([{ name: 'Merged Audience', subscriber_count: 4, contact_count: 4 }]);
    second.close();
    rmSync(databasePath);
  });

  test('rejects empty, invalid, stale, duplicate, and cross-company selections without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrationRoot, undefined, 'email_mailing_list_merge_guards_test', ['schema', 'data']);
    const base = { selectedIds: ['mailing-list-demo-001', 'mailing-list-imported-001'], current_company_name: 'Core3 Vietnam' };

    await expect(repository.executeMutation(action.mutation, { ...base, selectedIds: [], values: { merge_options: 'new', new_list_name: 'No Selection' } }))
      .rejects.toMatchObject({ status: 400, code: 'EMAIL_MAILING_MERGE_SELECTION_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, selectedIds: ['mailing-list-demo-001'], values: { merge_options: 'new', new_list_name: 'One List' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_MERGE_SELECTION_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...base, values: { merge_options: 'new', new_list_name: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_MERGE_NAME_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, values: { merge_options: 'new', new_list_name: 'Customers' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_MERGE_NAME_EXISTS' });
    await expect(repository.executeMutation(action.mutation, { ...base, values: { merge_options: 'existing', dest_list_id: 'mailing-list-missing', archive_src_lists: false } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_MERGE_DESTINATION_INVALID' });
    await repository.run("UPDATE mailing_lists SET active = false, state = 'Archived' WHERE id = 'mailing-list-imported-001'");
    await expect(repository.executeMutation(action.mutation, { ...base, values: { merge_options: 'existing', dest_list_id: 'mailing-list-empty-001', archive_src_lists: false } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_MERGE_STALE' });
    await repository.run("UPDATE mailing_lists SET active = true, state = 'Active' WHERE id = 'mailing-list-imported-001'");
    await repository.run("INSERT INTO mailing_lists(id, name, description, subscriber_count, contact_count, mailing_count, bounce_count, optout_count, blacklist_count, company_name, is_public, favorite, active, state, row_version, created_at, updated_at) VALUES ('mailing-list-other-merge-001', 'Other Company Merge List', '', 0, 0, 0, 0, 0, 0, 'Other Company', true, false, true, 'Active', 1, TIMESTAMP '2026-01-15 09:00:00', TIMESTAMP '2026-01-15 09:00:00')");
    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company', values: { merge_options: 'existing', dest_list_id: 'mailing-list-other-merge-001', archive_src_lists: false } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_MERGE_SELECTION_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM mailing_lists WHERE id = 'mailing-list-merge-no-selection'"))
      .toEqual([{ count: 0 }]);
    database.close();
  });
});
