import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Project task attachments', () => {
  test('declares a scoped attachment surface and rejects invalid, duplicate, stale, and cross-company writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'project_task_attachment_contract', ['schema', 'data']);
    const api = yaml('api/task-detail.yaml');
    const page = yaml('pages/project-task-detail.yaml');
    const upload = action(api, 'upload_project_task_attachment');
    const list = api.datasources.find((source: any) => source.id === 'project_task_attachments');

    expect(page.components[0]).toMatchObject({
      attachment_source: 'project_task_attachments',
      attachment_upload_action: 'upload_project_task_attachment',
      attachment_download_action: 'download_project_task_attachment',
    });
    expect(upload).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'project.write', kind: 'project_task_attachment' });
    expect(yaml('storage.yaml').attachments.project_task_attachment.download).toMatchObject({ permission: 'project.read', route: '/api/project/task-attachments' });

    const valid = { task_id: 'task-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'project-user', fileName: 'brief.pdf', mimeType: 'application/pdf', sizeBytes: 4, storageKey: 'project/brief.pdf' };
    const created = await repository.executeMutation(upload.mutation, { ...valid, attachment_id: 'project-task-attachment-001' });
    expect(created).toMatchObject({ task_id: valid.task_id, company_name: 'Core3 Demo Company', file_name: 'brief.pdf', size_bytes: 4, uploaded_by: 'project-user' });
    expect((await repository.querySource(list, { id: valid.task_id, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(list, { id: valid.task_id, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);

    await expect(repository.executeMutation(upload.mutation, { ...valid, attachment_id: 'project-task-attachment-002' }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_ATTACHMENT_DUPLICATE' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, expected_row_version: 2, attachment_id: 'project-task-attachment-003', fileName: 'stale.pdf', storageKey: 'project/stale.pdf' }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, current_company_name: 'Other Company', attachment_id: 'project-task-attachment-004', fileName: 'other.pdf', storageKey: 'project/other.pdf' }))
      .rejects.toMatchObject({ status: 403, code: 'PROJECT_TASK_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, attachment_id: 'project-task-attachment-005', fileName: '', sizeBytes: 0, storageKey: 'project/invalid.pdf' }))
      .rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_ATTACHMENT_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, attachment_id: 'project-task-attachment-006', task_id: 'missing-task', storageKey: 'project/missing.pdf' }))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_NOT_FOUND' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM project_task_attachments WHERE task_id = ?', [valid.task_id]))[0].count).toBe(1);
    database.close();
  });

  test('uploads, downloads, enforces actor/company access, and survives a file-backed reopen', async () => {
    const databasePath = `/tmp/core3-project-task-attachment-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_task_attachment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const uploadRoot = `/tmp/core3-project-task-upload-${crypto.randomUUID()}`;
    const api = yaml('api/task-detail.yaml');
    const upload = action(api, 'upload_project_task_attachment');
    const download = action(api, 'download_project_task_attachment');
    const user: any = { sub: 'project-editor', email: 'editor@workspace.example', name: 'Project Editor', roles: ['user'], company: { name: 'Core3 Demo Company' }, permissions: ['project.read', 'project.write'] };
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['project-task-detail', { actions: [upload, download] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map([['project_tasks', yaml('pages/project-workflow.yaml').workflow]]), workflowFiles: new Map(),
      permissions: { permissions: ['project.read', 'project.write', 'project.manage'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const form = new FormData();
    form.set('file', new File([new Uint8Array([80, 82, 79, 74])], 'plan.txt', { type: 'text/plain' }));
    form.set('meta', JSON.stringify({ kind: 'project_task_attachment', task_id: 'task-demo-002', expected_row_version: 1 }));
    const createdResponse = await createApi(firstRepository)(new Request('http://project.test/api/upload', { method: 'POST', body: form }), new URL('http://project.test/api/upload'));
    expect(createdResponse?.status).toBe(200);
    const created = await createdResponse!.json() as any;
    expect(created).toMatchObject({ task_id: 'task-demo-002', file_name: 'plan.txt', company_name: 'Core3 Demo Company', size_bytes: 4 });
    const downloaded = await createApi(firstRepository)(new Request(`http://project.test/api/project/task-attachments/${created.id}`), new URL(`http://project.test/api/project/task-attachments/${created.id}`));
    expect(downloaded?.status).toBe(200);
    expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([80, 82, 79, 74]);
    user.permissions = ['project.read'];
    await expect(createApi(firstRepository)(new Request('http://project.test/api/upload', { method: 'POST', body: form }), new URL('http://project.test/api/upload')))
      .rejects.toMatchObject({ status: 403 });
    user.company = { name: 'Other Company' };
    const wrongCompanyDownload = await createApi(firstRepository)(new Request(`http://project.test/api/project/task-attachments/${created.id}`), new URL(`http://project.test/api/project/task-attachments/${created.id}`));
    expect(wrongCompanyDownload?.status).toBe(404);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT file_name, size_bytes FROM project_task_attachments WHERE id = ?', [created.id]))
      .toEqual([{ file_name: 'plan.txt', size_bytes: 4 }]);
    user.company = { name: 'Core3 Demo Company' };
    const reopenedDownload = await createApi(secondRepository)(new Request(`http://project.test/api/project/task-attachments/${created.id}`), new URL(`http://project.test/api/project/task-attachments/${created.id}`));
    expect(reopenedDownload?.status).toBe(200);
    expect([...new Uint8Array(await reopenedDownload!.arrayBuffer())]).toEqual([80, 82, 79, 74]);
    second.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });
});
