import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { attachmentDownloadPath } from '@core3/client/components/PageDetailRenderers';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { handleFileRoutes } from '@core3/server/routes/file-routes';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);
const authService = {
  async call(operation: string, request: Record<string, unknown>) {
    if (operation !== 'users.resolve') throw new Error(`Unexpected auth operation: ${operation}`);
    const users = new Map([
      ['user-admin', { id: 'user-admin', name: 'Admin User', email: 'admin@tms.local' }],
    ]);
    return { users: String(request.user_ids || '').split(',').map((id) => users.get(id)).filter(Boolean) };
  },
};

describe('CRM lead attachments Odoo chatter parity', () => {
  test('binds the attachment panel to the separate lead-detail page/API contract and protected route', () => {
    const page = yaml('pages/lead-detail.yaml');
    const api = yaml('api/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(api.page).toEqual({ id: 'lead-detail' });
    expect(() => validatePageDefinition({ ...page, actions: [...(api.actions || []), ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(form).toMatchObject({
      attachment_source: 'crm_lead_attachments_list',
      attachment_upload_action: 'upload_lead_attachment',
      attachment_download_action: 'download_lead_attachment',
      add_attachment_label: 'Attach files',
      preview_label: 'Preview',
    });
    expect(action(api, 'upload_lead_attachment')).toMatchObject({ type: 'upload', permission: 'crm.write', kind: 'crm_lead_attachment' });
    expect(action(api, 'download_lead_attachment')).toMatchObject({ type: 'download', permission: 'crm.read', kind: 'crm_lead_attachment' });
    expect(yaml('storage.yaml').attachments.crm_lead_attachment.download).toMatchObject({ route: '/crm/attachments', permission: 'crm.attachment.download' });
    expect(attachmentDownloadPath('crm_lead_attachment', 'crm-demo-attachment-001')).toBe('/crm/attachments/crm-demo-attachment-001');
  });

  test('persists a deterministic attachment, validates upload metadata, serves bytes, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-attachments-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database, (serviceName: string) => serviceName === 'auth' ? authService : undefined);
    const api = yaml('api/lead-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_lead_attachments_list');
    const upload = action(api, 'upload_lead_attachment');

    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_attachments_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_attachments_migrations', ['schema', 'data']);

    const seeded = await repository.querySource(source, { id: 'crm-demo-001' }, 0, 100);
    expect(seeded.data).toEqual([expect.objectContaining({ id: 'crm-demo-attachment-001', file_name: 'qualification-brief.txt', size_bytes: 24 })]);
    expect(await repository.query("SELECT content_base64 FROM crm_lead_attachments WHERE id = 'crm-demo-attachment-001'")).toEqual([{ content_base64: 'Q1JNIHF1YWxpZmljYXRpb24gYnJpZWYK' }]);

    await expect(repository.executeMutation(upload.mutation, {
      lead_id: 'crm-demo-001', attachment_id: 'crm-uploaded-001', fileName: '', mimeType: 'text/plain', sizeBytes: 4, storageKey: 'uploaded-key', current_user_id: 'user-admin', current_user_name: 'Admin User',
    })).rejects.toMatchObject({ status: 422, code: 'CRM_ATTACHMENT_NAME_INVALID' });
    await expect(repository.executeMutation(upload.mutation, {
      lead_id: 'crm-demo-001', attachment_id: 'crm-uploaded-001', fileName: 'too-large.bin', mimeType: 'application/octet-stream', sizeBytes: 5242881, storageKey: 'uploaded-key', current_user_id: 'user-admin', current_user_name: 'Admin User',
    })).rejects.toMatchObject({ status: 422, code: 'CRM_ATTACHMENT_SIZE_INVALID' });
    await expect(repository.executeMutation(upload.mutation, {
      lead_id: 'missing-lead', attachment_id: 'crm-uploaded-001', fileName: 'brief.txt', mimeType: 'text/plain', sizeBytes: 4, storageKey: 'uploaded-key', current_user_id: 'user-admin', current_user_name: 'Admin User',
    })).rejects.toMatchObject({ status: 404, message: 'Opportunity not found' });

    await expect(repository.executeMutation(upload.mutation, {
      lead_id: 'crm-demo-001', attachment_id: 'crm-uploaded-001', fileName: 'brief.txt', mimeType: 'text/plain', sizeBytes: 4, storageKey: 'uploaded-key', current_user_id: 'user-admin', current_user_name: 'Admin User',
    })).resolves.toMatchObject({ id: 'crm-uploaded-001', file_name: 'brief.txt', size_bytes: 4 });
    expect(await repository.query("SELECT action, detail FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND action = 'crm.attachments.upload'")).toEqual([{ action: 'crm.attachments.upload', detail: 'brief.txt' }]);
    expect(await repository.query("SELECT a.file_name, a.storage_key FROM crm_lead_attachments a WHERE a.id = 'crm-uploaded-001'")).toEqual([{ file_name: 'brief.txt', storage_key: 'uploaded-key' }]);

    const downloadRule = yaml('storage.yaml').attachments.crm_lead_attachment.download;
    expect(String(downloadRule.query)).toContain('JOIN crm_leads');
    const inline = await repository.query(String(downloadRule.query).replace(':attachment_id', "'crm-demo-attachment-001'"));
    expect(inline[0]).toMatchObject({ file_name: 'qualification-brief.txt', content_base64: 'Q1JNIHF1YWxpZmljYXRpb24gYnJpZWYK' });
    const download = await handleFileRoutes({
      req: new Request('http://localhost/api/crm/attachments/crm-demo-attachment-001'),
      pathname: '/crm/attachments/crm-demo-attachment-001',
      method: 'GET',
      repository,
      NAMED_ACTIONS: {},
      topics: {},
      UPLOAD_ROOT: '/tmp/core3-crm-attachment-fixtures',
      authUser: { sub: 'user-admin' },
      activityActor: { id: 'user-admin', name: 'Admin User' },
      requirePerm: () => undefined,
      permissionForEndpoint: () => 'crm.attachment.download',
      recordInCurrentBranch: async () => true,
      json: (value: unknown) => new Response(JSON.stringify(value), { status: 200 }),
      apiError: (status: number, message: string) => new Response(JSON.stringify({ status, message }), { status }),
      CORS_HEADERS: {},
      eventStore: undefined,
      STORAGE: yaml('storage.yaml'),
    });
    expect(download?.status).toBe(200);
    expect(await download?.text()).toBe('CRM qualification brief\n');
    expect(download?.headers.get('content-type')).toBe('text/plain');
    await expect(repository.querySource(source, { id: 'crm-demo-001', fixture_state: 'forbidden' }, 0, 100)).rejects.toMatchObject({ status: 403, code: 'CRM_LEAD_ATTACHMENTS_FORBIDDEN' });
    await expect(repository.querySource(source, { id: 'crm-demo-001', fixture_state: 'transport_error' }, 0, 100)).rejects.toMatchObject({ status: 503, code: 'CRM_LEAD_ATTACHMENTS_UNAVAILABLE' });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase, (serviceName: string) => serviceName === 'auth' ? authService : undefined);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_lead_attachments_migrations', ['schema', 'data']);
    expect(await restartedRepository.query("SELECT id, file_name FROM crm_lead_attachments WHERE id IN ('crm-demo-attachment-001', 'crm-uploaded-001') ORDER BY id")).toEqual([
      { id: 'crm-demo-attachment-001', file_name: 'qualification-brief.txt' },
      { id: 'crm-uploaded-001', file_name: 'brief.txt' },
    ]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
