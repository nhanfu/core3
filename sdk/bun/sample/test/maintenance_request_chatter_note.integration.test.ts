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

describe('Maintenance request Chatter note parity', () => {
  test('maps the Odoo mail.thread chatter note to the existing request detail page/API pair', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/models/maintenance.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const form = page.components[0];
    const note = action('log_maintenance_request_note');

    expect(sourceModel).toContain("_inherit = ['mail.thread.cc', 'mail.activity.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ message_source: 'maintenance_request_activity', note_action: 'log_maintenance_request_note', note_label: 'Log note' });
    expect(api.datasources.find((entry: any) => entry.id === 'maintenance_request_activity')?.query).toContain('FROM maintenance_request_messages');
    expect(note).toMatchObject({ type: 'server_form', permission: 'maintenance.write', action: 'maintenance.requests.chatter.note', handler: 'order_chatter', operation: 'note' });
    expect(note.params).toMatchObject({ id: '{state.maintenance_request_detail.id}', expected_row_version: '{state.maintenance_request_detail.row_version}' });
    expect(note.mutation.concurrency).toEqual({ required: true });
  });

  test('logs a durable internal note with actor, content, parent, permission, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_chatter_note_guards');
    const note = action('log_maintenance_request_note');
    const timeline = yaml('api/request-detail.yaml').datasources.find((entry: any) => entry.id === 'maintenance_request_activity');
    const before = (await repository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))[0].row_version;
    const base = {
      id: 'maintenance-demo-001', expected_row_version: before, current_user_id: 'user-maintenance',
      current_user_name: 'Maintenance User', values: { content: 'Inspect the replacement keyboard before closing this request.' },
    };

    await expect(repository.executeMutation(note.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'MAINTENANCE_NOTE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(note.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_NOTE_CONTENT_INVALID' });
    await expect(repository.executeMutation(note.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_NOTE_PARENT_CHANGED' });

    const created = await repository.executeMutation(note.mutation, base) as any;
    expect(created).toMatchObject({ id: 'maintenance-message-maintenance-demo-001-2', request_id: 'maintenance-demo-001', actor_name: 'Maintenance User', action: 'maintenance.requests.chatter.note', action_label: 'Internal note', detail: base.values.content });
    expect(await repository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
      .toEqual([{ row_version: before + 1 }]);
    expect((await repository.querySource(timeline, { id: 'maintenance-demo-001' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, action: 'maintenance.requests.chatter.note', action_label: 'Internal note', detail: base.values.content })]));

    await expect(repository.executeMutation(note.mutation, { ...base, expected_row_version: before })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_NOTE_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM maintenance_request_messages WHERE request_id = 'maintenance-demo-001'"))
      .toEqual([{ count: 2 }]);
    await database.close();
  });

  test('rejects missing and archived requests without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_chatter_note_missing');
    const note = action('log_maintenance_request_note');
    const base = { id: 'missing-request', expected_row_version: 1, current_user_id: 'user-maintenance', values: { content: 'Should not be stored.' } };

    await expect(repository.executeMutation(note.mutation, base)).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await repository.query("UPDATE maintenance_requests SET archived = TRUE WHERE id = 'maintenance-demo-004'");
    await expect(repository.executeMutation(note.mutation, { ...base, id: 'maintenance-demo-004', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_NOTE_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM maintenance_request_messages WHERE request_id = 'maintenance-demo-004'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('preserves seeded and posted notes through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-maintenance-chatter-note-'));
    const databasePath = join(directory, 'maintenance.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'maintenance_chatter_note_restart');
      await migrate(firstRepository, 'maintenance_chatter_note_restart');
      const note = action('log_maintenance_request_note');
      await firstRepository.executeMutation(note.mutation, {
        id: 'maintenance-demo-002', expected_row_version: 1, current_user_id: 'user-manager', current_user_name: 'Maintenance Manager',
        values: { content: 'Restart-safe maintenance note.' },
      });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(secondDatabase);
      await migrate(secondRepository, 'maintenance_chatter_note_restart');
      expect(await secondRepository.query("SELECT request_id, actor_name, action, detail FROM maintenance_request_messages WHERE id = 'maintenance-message-maintenance-demo-002-2'"))
        .toEqual([{ request_id: 'maintenance-demo-002', actor_name: 'Maintenance Manager', action: 'maintenance.requests.chatter.note', detail: 'Restart-safe maintenance note.' }]);
      expect(await secondRepository.query("SELECT COUNT(*) AS count FROM maintenance_request_messages WHERE request_id = 'maintenance-demo-002'"))
        .toEqual([{ count: 2 }]);
      expect(await secondRepository.query("SELECT row_version FROM maintenance_requests WHERE id = 'maintenance-demo-002'"))
        .toEqual([{ row_version: 2 }]);
      await secondDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
