import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Time Off request supporting documents', () => {
  test('maps the Odoo attachment field and documents action to separate page/API/storage contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/models/hr_leave.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_views.xml', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const form = page.components[0];

    expect(sourceModel).toContain('def action_documents');
    expect(sourceView).toContain('widget="many2many_binary"');
    expect(sourceView).toContain('invisible="state != \'confirm\'"');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({
      attachment_source: 'leave_request_attachments',
      attachment_upload_action: 'upload_leave_request_attachment',
      attachment_download_action: 'download_leave_request_attachment',
    });
    expect(api.datasources.find((entry: any) => entry.id === 'leave_request_attachments')?.query).toContain('FROM time_off_request_attachments');
    expect(action(api, 'upload_leave_request_attachment')).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'time_off.write', kind: 'time_off_request_attachment' });
    expect(action(api, 'download_leave_request_attachment')).toMatchObject({ type: 'download', permission: 'time_off.read', kind: 'time_off_request_attachment' });
    expect(action(api, 'remove_leave_request_attachment')).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'time_off.write' });
    expect(yaml('storage.yaml').attachments.time_off_request_attachment.download).toMatchObject({ route: '/api/time-off/attachments', permission: 'time_off.read' });
  });

  test('persists upload and removal with submitted-state, actor, duplicate, size, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'time_off_request_attachments_guards');
    const api = yaml('api/request-detail.yaml');
    const upload = action(api, 'upload_leave_request_attachment');
    const remove = action(api, 'remove_leave_request_attachment');
    const base = {
      attachment_id: 'time-off-attachment-test-001', request_id: 'leave-request-demo-002', expected_row_version: 1,
      fileName: 'doctor-note.pdf', mimeType: 'application/pdf', sizeBytes: 512, storageKey: 'time-off/doctor-note.pdf', current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(upload.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'TIME_OFF_ATTACHMENT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(upload.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ATTACHMENT_STATE_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, fileName: '', sizeBytes: 0 })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_ATTACHMENT_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, fileName: 'medical-certificate.pdf' })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ATTACHMENT_DUPLICATE' });

    const uploaded = await repository.executeMutation(upload.mutation, base) as any;
    expect(uploaded).toMatchObject({ id: base.attachment_id, request_id: base.request_id, file_name: 'doctor-note.pdf', row_version: 1 });
    expect(await repository.query("SELECT row_version FROM leave_requests WHERE id = 'leave-request-demo-002'" )).toEqual([{ row_version: 2 }]);

    await expect(repository.executeMutation(remove.mutation, { id: base.request_id, line_id: base.attachment_id, expected_row_version: 1, parent_expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ATTACHMENT_STALE' });
    expect(await repository.executeMutation(remove.mutation, { id: base.request_id, line_id: base.attachment_id, expected_row_version: 1, parent_expected_row_version: 2 })).toEqual({ deleted: true, id: base.attachment_id });
    expect(await repository.query("SELECT active, row_version FROM time_off_request_attachments WHERE id = 'time-off-attachment-test-001'" )).toEqual([{ active: false, row_version: 2 }]);
    expect(await repository.query("SELECT row_version FROM leave_requests WHERE id = 'leave-request-demo-002'" )).toEqual([{ row_version: 3 }]);
    await database.close();
  });

  test('retains attachment metadata through migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-attachments-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrate(firstRepository, 'time_off_request_attachments_restart');
      const upload = action(yaml('api/request-detail.yaml'), 'upload_leave_request_attachment');
      await firstRepository.executeMutation(upload.mutation, {
        attachment_id: 'time-off-attachment-restart-001', request_id: 'leave-request-demo-002', expected_row_version: 1,
        fileName: 'restart-proof.pdf', mimeType: 'application/pdf', sizeBytes: 512, storageKey: 'time-off/restart-proof.pdf', current_user_id: 'user-hr-manager',
      });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrate(secondRepository, 'time_off_request_attachments_restart');
      expect(await secondRepository.query("SELECT file_name, storage_key, uploaded_by, row_version FROM time_off_request_attachments WHERE id = 'time-off-attachment-restart-001'" )).toEqual([{ file_name: 'restart-proof.pdf', storage_key: 'time-off/restart-proof.pdf', uploaded_by: 'user-hr-manager', row_version: 1 }]);
      expect(await secondRepository.query("SELECT row_version FROM leave_requests WHERE id = 'leave-request-demo-002'" )).toEqual([{ row_version: 2 }]);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
