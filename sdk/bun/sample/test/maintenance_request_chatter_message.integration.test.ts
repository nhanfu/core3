import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === id);
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);

describe('Maintenance request Chatter message parity', () => {
  test('maps the Odoo public chatter composer to the request detail page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/models/maintenance.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const form = page.components[0];
    const send = action('send_maintenance_request_message');

    expect(sourceModel).toContain("_inherit = ['mail.thread.cc', 'mail.activity.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ message_source: 'maintenance_request_activity', message_action: 'send_maintenance_request_message', message_label: 'Send message', note_action: 'log_maintenance_request_note' });
    expect(api.datasources.find((entry: any) => entry.id === 'maintenance_request_activity')?.query).toContain('FROM maintenance_request_messages');
    expect(send).toMatchObject({ type: 'server_form', permission: 'maintenance.write', action: 'maintenance.requests.chatter.message', handler: 'order_chatter', operation: 'message' });
    expect(send.params).toMatchObject({ id: '{state.maintenance_request_detail.id}', expected_row_version: '{state.maintenance_request_detail.row_version}' });
    expect(send.mutation.concurrency).toEqual({ required: true });
  });

  test('sends a durable message, advances the request version, and keeps the note/activity timeline', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_chatter_message_crud');
    const send = action('send_maintenance_request_message');
    const timeline = yaml('api/request-detail.yaml').datasources.find((entry: any) => entry.id === 'maintenance_request_activity');
    const before = (await repository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))[0].row_version;
    const created = await repository.executeMutation(send.mutation, { id: 'maintenance-demo-001', expected_row_version: before, current_user_id: 'user-maintenance', current_user_name: 'Maintenance User', values: { content: 'Please confirm the replacement part is ready for handover.' } }) as any;

    expect(created).toMatchObject({ id: 'maintenance-message-maintenance-demo-001-2', request_id: 'maintenance-demo-001', actor_name: 'Maintenance User', action: 'maintenance.requests.chatter.message', action_label: 'Message', detail: 'Please confirm the replacement part is ready for handover.' });
    expect(await repository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
      .toEqual([{ row_version: before + 1 }]);
    expect((await repository.querySource(timeline, { id: 'maintenance-demo-001' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, action: 'maintenance.requests.chatter.message', action_label: 'Message', detail: created.detail })]));
    await database.close();
  });

  test('rejects anonymous, blank, missing, archived, and stale sends atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_chatter_message_guards');
    const send = action('send_maintenance_request_message');
    const before = (await repository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))[0].row_version;
    const base = { id: 'maintenance-demo-001', expected_row_version: before, current_user_id: 'user-maintenance', current_user_name: 'Maintenance User', values: { content: 'A valid maintenance message' } };

    await expect(repository.executeMutation(send.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'MAINTENANCE_MESSAGE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_MESSAGE_CONTENT_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...base, id: 'missing-request' })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_MESSAGE_PARENT_CHANGED' });
    await repository.query("UPDATE maintenance_requests SET archived = TRUE WHERE id = 'maintenance-demo-004'");
    await expect(repository.executeMutation(send.mutation, { ...base, id: 'maintenance-demo-004', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_MESSAGE_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM maintenance_request_messages WHERE request_id = 'maintenance-demo-001'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('preserves the seeded public message through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-maintenance-chatter-message-'));
    const databasePath = join(directory, 'maintenance.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'maintenance_chatter_message_restart');
      await migrate(firstRepository, 'maintenance_chatter_message_restart');
      const send = action('send_maintenance_request_message');
      await firstRepository.executeMutation(send.mutation, { id: 'maintenance-demo-001', expected_row_version: 1, current_user_id: 'user-manager', current_user_name: 'Maintenance Manager', values: { content: 'Restart-safe public maintenance message.' } });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(secondDatabase);
      await migrate(secondRepository, 'maintenance_chatter_message_restart');
      expect(await secondRepository.query("SELECT request_id, actor_name, action, detail FROM maintenance_request_messages WHERE id = 'maintenance-message-maintenance-demo-001-2'"))
        .toEqual([{ request_id: 'maintenance-demo-001', actor_name: 'Maintenance Manager', action: 'maintenance.requests.chatter.message', detail: 'Restart-safe public maintenance message.' }]);
      expect(await secondRepository.query("SELECT COUNT(*) AS count FROM maintenance_request_messages WHERE id = 'maintenance-message-maintenance-demo-003-2'"))
        .toEqual([{ count: 1 }]);
      expect(await secondRepository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
        .toEqual([{ row_version: 2 }]);
      await secondDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
