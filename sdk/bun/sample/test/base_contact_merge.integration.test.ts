import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrations = join(serviceRoot, 'migrations');

describe('Base contact merge wizard parity', () => {
  test('binds the Odoo list Merge action through the page/API contract', () => {
    const page = yaml('pages/contacts.yaml');
    const api = yaml('api/contacts.yaml');
    const list = page.components[0];
    const merge = action(api, 'merge_contacts');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'contacts' });
    expect(discovered.pageDatasources.get('contacts')).toContain('contact_merge_destinations');
    expect(list.bulk_actions).toEqual([{ id: 'merge_contacts', label: 'Merge', permission: 'base.contacts.manage' }]);
    expect(merge).toMatchObject({
      type: 'server_form', title: 'Merge Contacts', action: 'base.contacts.merge',
      permission: 'base.contacts.manage', operation: 'merge', submit_label: 'Merge Contacts',
    });
    expect(merge.fields).toEqual([
      { field: 'destination_id', label: 'Destination contact', type: 'select', options_source: 'contact_merge_destinations', required: true },
      { field: 'expected_destination_row_version', label: 'Destination row version', type: 'hidden', default: 1, required: true },
    ]);
  });

  test('merges contacts, reparents owned relations, preserves destination data, and audits the operation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'base_contact_merge_migrations', ['schema', 'data']);
    const merge = action(yaml('api/contacts.yaml'), 'merge_contacts');
    await repository.run("INSERT INTO base_contact_messages(id, contact_id, actor_id, actor_name, action, action_label, detail) VALUES ('merge-message-source', 'contact-merge-source', 'user-admin', 'Administrator', 'base.contacts.note', 'Internal note', 'Source note')");
    await repository.run("INSERT INTO base_contact_attachments(id, contact_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES ('merge-attachment-source', 'contact-merge-source', 'source.txt', 'text/plain', 11, 'merge/source.txt', 'user-admin')");
    await repository.run("INSERT INTO base_contact_followers(contact_id, user_id, name, email, added_by) VALUES ('contact-merge-source', 'user-qa', 'QA User', 'qa@core3.local', 'user-admin')");
    await repository.run("INSERT INTO base_partner_bank_accounts(id, acc_number, partner_id, partner_name) VALUES ('merge-bank-source', 'DE12500105170648489890', 'contact-merge-source', 'Demo Contact Duplicate')");

    await repository.executeMutation(merge.mutation, {
      selectedIds: ['contact-demo', 'contact-merge-source'],
      values: { destination_id: 'contact-demo', expected_destination_row_version: 1 },
      current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
    });

    expect(await repository.query("SELECT id, name, row_version FROM base_contacts WHERE id IN ('contact-demo', 'contact-merge-source') ORDER BY id")).toEqual([
      { id: 'contact-demo', name: 'Demo Contact', row_version: 2 },
    ]);
    expect(await repository.query("SELECT category_id FROM base_contact_categories_rel WHERE contact_id = 'contact-demo' ORDER BY category_id")).toEqual([
      { category_id: 'category-partner' },
      { category_id: 'category-vendor' },
    ]);
    expect(await repository.query("SELECT contact_id FROM base_activities WHERE id = 'activity-merge-source'")).toEqual([{ contact_id: 'contact-demo' }]);
    expect(await repository.query("SELECT contact_id FROM base_contact_messages WHERE id = 'merge-message-source'")).toEqual([{ contact_id: 'contact-demo' }]);
    expect(await repository.query("SELECT contact_id FROM base_contact_attachments WHERE id = 'merge-attachment-source'")).toEqual([{ contact_id: 'contact-demo' }]);
    expect(await repository.query("SELECT contact_id FROM base_contact_followers WHERE user_id = 'user-qa'")).toEqual([{ contact_id: 'contact-demo' }]);
    expect(await repository.query("SELECT partner_id, partner_name FROM base_partner_bank_accounts WHERE id = 'merge-bank-source'")).toEqual([{ partner_id: 'contact-demo', partner_name: 'Demo Contact' }]);
    expect(await repository.query("SELECT destination_id, source_ids, actor_id FROM base_contact_merge_log")).toEqual([
      { destination_id: 'contact-demo', source_ids: 'contact-merge-source', actor_id: 'user-admin' },
    ]);

    await expect(repository.executeMutation(merge.mutation, {
      selectedIds: ['contact-demo'], values: { destination_id: 'contact-demo', expected_destination_row_version: 2 }, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 400, code: 'BASE_CONTACT_MERGE_SELECTION_REQUIRED' });
    await expect(repository.executeMutation(merge.mutation, {
      selectedIds: ['contact-demo', 'contact-merge-source'], values: { destination_id: 'contact-demo', expected_destination_row_version: 1 }, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 400, code: 'BASE_CONTACT_MERGE_SELECTION_REQUIRED' });
    database.close();
  });

  test('rejects hierarchy, email, destination, and stale guards without partial writes', async () => {
    const databasePath = `/tmp/core3-base-contact-merge-${crypto.randomUUID()}.duckdb`;
    const migrationName = `base_contact_merge_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const api = yaml('api/contacts.yaml');
      const merge = action(api, 'merge_contacts');

      await expect(repository.executeMutation(merge.mutation, {
        selectedIds: ['contact-demo', 'contact-merge-source'], values: { destination_id: 'contact-demo', expected_destination_row_version: 0 }, current_company_id: 'company-demo',
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_MERGE_DESTINATION_STALE' });
      await repository.run("UPDATE base_contacts SET email = 'different@core3.local' WHERE id = 'contact-merge-source'");
      await expect(repository.executeMutation(merge.mutation, {
        selectedIds: ['contact-demo', 'contact-merge-source'], values: { destination_id: 'contact-demo', expected_destination_row_version: 1 }, current_company_id: 'company-demo',
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_MERGE_EMAIL_MISMATCH' });
      await repository.run("UPDATE base_contacts SET email = 'demo@core3.local' WHERE id = 'contact-merge-source'");
      await expect(repository.executeMutation(merge.mutation, {
        selectedIds: ['company-azure', 'contact-azure-brandon'], values: { destination_id: 'contact-azure-brandon', expected_destination_row_version: 1 }, current_company_id: 'company-demo',
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_MERGE_HIERARCHY' });
      await expect(repository.executeMutation(merge.mutation, {
        selectedIds: ['contact-demo', 'company-vietnam'], values: { destination_id: 'contact-demo', expected_destination_row_version: 1 }, current_company_id: 'company-demo',
      })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_MERGE_SCOPE' });
      await repository.executeMutation(merge.mutation, {
        selectedIds: ['contact-demo', 'contact-merge-source'], values: { destination_id: 'contact-demo', expected_destination_row_version: 1 }, current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await repository.query("SELECT COUNT(*) AS count FROM base_contact_merge_log WHERE destination_id = 'contact-demo'")).toEqual([{ count: 1 }]);
      expect(await repository.query("SELECT COUNT(*) AS count FROM base_contacts WHERE id = 'contact-merge-source'")).toEqual([{ count: 0 }]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
