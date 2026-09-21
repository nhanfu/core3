import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM lead chatter message and note parity', () => {
  test('keeps the Odoo chatter composer controls in the separate lead-detail page/API contract', () => {
    const page = yaml('pages/lead-detail.yaml');
    const api = yaml('api/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(api.page).toEqual({ id: 'lead-detail' });
    expect(() => validatePageDefinition({
      ...page,
      actions: [...(api.actions || []), ...(page.actions || [])],
    }, { allowExternalSources: true })).not.toThrow();
    expect(form).toMatchObject({
      message_source: 'crm_lead_timeline',
      message_label: 'Send message',
      note_label: 'Log note',
      message_action: 'send_lead_message',
      note_action: 'log_lead_note',
    });
    expect(api.datasources.map((entry: any) => entry.id)).toContain('crm_lead_timeline');
    expect(action(api, 'send_lead_message')).toMatchObject({
      action: 'crm.chatter.send',
      permission: 'crm.write',
      operation: 'message',
    });
    expect(action(api, 'log_lead_note')).toMatchObject({
      action: 'crm.chatter.note',
      permission: 'crm.write',
      operation: 'note',
    });
  });

  test('persists messages and notes, rejects invalid or missing posts, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-chatter-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    const api = yaml('api/lead-detail.yaml');
    const message = action(api, 'send_lead_message');
    const note = action(api, 'log_lead_note');
    const input = {
      id: 'crm-demo-001',
      current_user_id: 'user-admin',
      current_user_name: 'Admin User',
    };

    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_chatter_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_chatter_migrations', ['schema', 'data']);

    await expect(repository.executeMutation(message.mutation, { ...input, content: 'Customer requested a revised proposal.' }))
      .resolves.toMatchObject({ id: 'crm-demo-001', action: 'crm.message', detail: 'Customer requested a revised proposal.' });
    await expect(repository.executeMutation(note.mutation, { ...input, content: 'Internal note: confirm pricing with the sales manager.' }))
      .resolves.toMatchObject({ id: 'crm-demo-001', action: 'crm.note', detail: 'Internal note: confirm pricing with the sales manager.' });

    expect(await repository.query(
      "SELECT actor_id, actor_name, action, resource, resource_id, detail FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND detail IN ('Customer requested a revised proposal.', 'Internal note: confirm pricing with the sales manager.') ORDER BY detail",
    )).toEqual([
      {
        actor_id: 'user-admin',
        actor_name: 'Admin User',
        action: 'crm.message',
        resource: 'crm_leads',
        resource_id: 'crm-demo-001',
        detail: 'Customer requested a revised proposal.',
      },
      {
        actor_id: 'user-admin',
        actor_name: 'Admin User',
        action: 'crm.note',
        resource: 'crm_leads',
        resource_id: 'crm-demo-001',
        detail: 'Internal note: confirm pricing with the sales manager.',
      },
    ]);

    const timeline = api.datasources.find((source: any) => source.id === 'crm_lead_timeline');
    expect((await repository.querySource(timeline, { id: 'crm-demo-001' })).data)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ actor_name: 'Admin User', action: 'crm.message', action_label: 'Message', detail: 'Customer requested a revised proposal.' }),
        expect.objectContaining({ actor_name: 'Admin User', action: 'crm.note', action_label: 'Note', detail: 'Internal note: confirm pricing with the sales manager.' }),
      ]));

    await expect(repository.executeMutation(message.mutation, { ...input, content: '   ' }))
      .rejects.toMatchObject({ status: 400, message: 'Message content must be between 1 and 4000 characters' });
    await expect(repository.executeMutation(note.mutation, { ...input, content: 'x'.repeat(4001) }))
      .rejects.toMatchObject({ status: 400, message: 'Note content must be between 1 and 4000 characters' });
    await expect(repository.executeMutation(message.mutation, { ...input, id: 'missing-lead', content: 'Should not persist.' }))
      .rejects.toMatchObject({ status: 404, message: 'Opportunity not found' });

    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_lead_chatter_migrations', ['schema', 'data']);
    expect(await restartedRepository.query(
      "SELECT action, detail FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND detail IN ('Customer requested a revised proposal.', 'Internal note: confirm pricing with the sales manager.') ORDER BY detail",
    )).toEqual([
      { action: 'crm.message', detail: 'Customer requested a revised proposal.' },
      { action: 'crm.note', detail: 'Internal note: confirm pricing with the sales manager.' },
    ]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
