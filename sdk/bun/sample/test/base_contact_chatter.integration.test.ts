import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Base contact chatter parity slice', () => {
  test('declares Odoo message and internal-note composers on the API-owned detail contract', () => {
    const page = yaml('pages/contact-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(form).toMatchObject({
      message_source: 'contact_messages',
      message_action: 'send_contact_message',
      note_action: 'log_contact_note',
      message_label: 'Send message',
      note_label: 'Log note',
    });
    const actions = yaml('api/contact-detail.yaml').actions;
    expect(actions.find((action: any) => action.id === 'send_contact_message')).toMatchObject({
      type: 'server_form', permission: 'base.contacts.write', handler: 'order_chatter', operation: 'message',
    });
    expect(actions.find((action: any) => action.id === 'log_contact_note')).toMatchObject({
      type: 'server_form', permission: 'base.contacts.write', handler: 'order_chatter', operation: 'note',
    });
  });

  test('persists sent messages and internal notes across restart with scope and content guards', async () => {
    const root = mkdtempSync(join(tmpdir(), 'core3-base-contact-chatter-'));
    const databasePath = join(root, 'base.duckdb');
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      const migrations = 'base_contact_chatter_restart_migrations';
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrations, ['schema', 'data']);
      const actions = yaml('api/contact-detail.yaml').actions;
      const send = actions.find((action: any) => action.id === 'send_contact_message');
      const note = actions.find((action: any) => action.id === 'log_contact_note');
      const message = await repository.executeMutation(send.mutation, {
        id: 'contact-demo', current_company_id: 'company-demo', current_user_id: 'user-qa', current_user_name: 'QA User', content: 'Please confirm the billing contact.',
      }) as any;
      const internalNote = await repository.executeMutation(note.mutation, {
        id: 'contact-demo', current_company_id: 'company-demo', current_user_id: 'user-qa', current_user_name: 'QA User', content: 'Internal follow-up recorded.',
      }) as any;
      expect(message).toMatchObject({ contact_id: 'contact-demo', actor_name: 'QA User', action: 'base.contacts.message', action_label: 'Message', detail: 'Please confirm the billing contact.' });
      expect(internalNote).toMatchObject({ contact_id: 'contact-demo', actor_name: 'QA User', action: 'base.contacts.note', action_label: 'Internal note', detail: 'Internal follow-up recorded.' });
      await expect(repository.executeMutation(send.mutation, { id: 'contact-demo', current_company_id: 'company-demo', content: '   ' })).rejects.toMatchObject({ status: 400, code: 'BASE_CONTACT_MESSAGE_LENGTH' });
      await expect(repository.executeMutation(note.mutation, { id: 'missing-contact', current_company_id: 'company-demo', content: 'missing' })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_NOT_FOUND' });
      await expect(repository.executeMutation(note.mutation, { id: 'contact-demo', current_company_id: 'company-vietnam', content: 'wrong company' })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_COMPANY_FORBIDDEN' });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrations, ['schema', 'data']);
      const messages = await repository.querySource(source('contact-detail.yaml', 'contact_messages'), { id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null }, 0, 50);
      expect(messages.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: message.id, action: 'base.contacts.message', detail: 'Please confirm the billing contact.' }),
        expect.objectContaining({ id: internalNote.id, action: 'base.contacts.note', detail: 'Internal follow-up recorded.' }),
      ]));
      const hidden = await repository.querySource(source('contact-detail.yaml', 'contact_messages'), { id: 'contact-demo', current_company_id: 'company-vietnam', fixture_state: null }, 0, 50);
      expect(hidden.data).toEqual([]);
    } finally {
      database?.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('persists follower add/remove actions, refreshes candidates, and records scope guards', async () => {
    const root = mkdtempSync(join(tmpdir(), 'core3-base-contact-followers-'));
    const databasePath = join(root, 'base.duckdb');
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      const migrations = 'base_contact_followers_migrations';
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrations, ['schema', 'data']);
      const api = yaml('api/contact-detail.yaml');
      const add = api.actions.find((action: any) => action.id === 'add_contact_follower');
      const remove = api.actions.find((action: any) => action.id === 'remove_contact_follower');
      expect(add).toMatchObject({ type: 'server', permission: 'base.contacts.write', handler: 'order_chatter', operation: 'follower_add' });
      expect(remove).toMatchObject({ type: 'server', permission: 'base.contacts.write', handler: 'order_chatter', operation: 'follower_remove' });
      expect(yaml('pages/contact-detail.yaml').components[0]).toMatchObject({
        follower_source: 'contact_followers',
        follower_candidates_source: 'contact_follower_candidates',
        follower_add_action: 'add_contact_follower',
        follower_remove_action: 'remove_contact_follower',
      });

      const candidates = await repository.querySource(source('contact-detail.yaml', 'contact_follower_candidates'), {
        id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null,
      }, 0, 50);
      expect(candidates.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ value: 'user-qa', label: 'QA User · qa@core3.local' }),
      ]));

      const added = await repository.executeMutation(add.mutation, {
        id: 'contact-demo', user_id: 'user-qa', expected_row_version: 1,
        current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      }) as any;
      expect(added).toMatchObject({ user_id: 'user-qa', name: 'QA User', removed: false });
      const afterAdd = await repository.querySource(source('contact-detail.yaml', 'contact_followers'), {
        id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null,
      }, 0, 50);
      expect(afterAdd.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ user_id: 'user-admin', name: 'Administrator' }),
        expect.objectContaining({ user_id: 'user-qa', name: 'QA User' }),
      ]));
      await expect(repository.executeMutation(add.mutation, {
        id: 'contact-demo', user_id: 'user-qa', expected_row_version: 2,
        current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_FOLLOWER_EXISTS' });
      await expect(repository.executeMutation(remove.mutation, {
        id: 'contact-demo', user_id: 'user-qa', expected_row_version: 1,
        current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

      const removed = await repository.executeMutation(remove.mutation, {
        id: 'contact-demo', user_id: 'user-qa', expected_row_version: 2,
        current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      }) as any;
      expect(removed).toMatchObject({ user_id: 'user-qa', name: 'QA User', removed: true });
      const afterRemove = await repository.querySource(source('contact-detail.yaml', 'contact_followers'), {
        id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null,
      }, 0, 50);
      expect(afterRemove.data).toEqual([expect.objectContaining({ user_id: 'user-admin' })]);
      const messages = await repository.querySource(source('contact-detail.yaml', 'contact_messages'), {
        id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null,
      }, 0, 50);
      expect(messages.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ action: 'base.contacts.followers.add', detail: 'QA User now follows Demo Contact' }),
        expect.objectContaining({ action: 'base.contacts.followers.remove', detail: 'QA User no longer follows Demo Contact' }),
      ]));
      await expect(repository.executeMutation(add.mutation, {
        id: 'contact-demo', user_id: 'user-qa', expected_row_version: 3,
        current_company_id: 'company-vietnam', current_user_id: 'user-admin', current_user_name: 'Administrator',
      })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_FOLLOWER_CONTACT_NOT_FOUND' });
    } finally {
      database?.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
