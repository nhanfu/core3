import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/surveys');
const sampleRoot = join(import.meta.dir, '..');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const makeUpload = (bytes: number[], name: string, meta: Record<string, unknown>) => {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], name, { type: 'application/pdf' }));
  form.set('meta', JSON.stringify({ kind: 'survey_invite_attachment', ...meta }));
  return form;
};

describe('Surveys invitation attachment parity', () => {
  test('joins the Odoo invite attachment surface through separate page/API YAML', () => {
    const page = yaml('pages/invite-detail.yaml');
    const api = yaml('api/invite-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const upload = api.actions.find((candidate: any) => candidate.id === 'upload_survey_invite_attachment');

    expect(api.page.id).toBe(page.page.id);
    expect(page.page.route).toBe('/surveys/invite');
    expect(form).toMatchObject({
      source: 'survey_invite_detail',
      attachment_source: 'survey_invite_attachments',
      attachment_upload_action: 'upload_survey_invite_attachment',
      attachment_download_action: 'download_survey_invite_attachment',
    });
    expect(api.datasources.find((source: any) => source.id === 'survey_invite_attachments')).toMatchObject({ permission: 'surveys.read' });
    expect(upload).toMatchObject({ type: 'upload', permission: 'surveys.write', handler: 'attachment_metadata', kind: 'survey_invite_attachment' });
    expect(upload.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_INVITE_NOT_FOUND', 'SURVEY_INVITE_CHANGED', 'SURVEY_INVITE_ATTACHMENT_ACTOR_REQUIRED',
      'SURVEY_INVITE_ATTACHMENT_INVALID', 'SURVEY_INVITE_ATTACHMENT_DUPLICATE',
    ]);
    expect(yaml('storage.yaml').attachments.survey_invite_attachment.download).toMatchObject({
      route: '/api/surveys/invite-attachments', permission: 'surveys.read',
    });
    const discovered = discoverPages(sampleRoot);
    expect(discovered.pages.get('survey-invite-detail')?.config.page.route).toBe('/surveys/invite');
    expect(discovered.pageDatasources.get('survey-invite-detail')).toContain('survey_invite_attachments');
  });

  test('persists invite documents with actor, permission, stale, duplicate, and archived guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_invite_attachment_guards', ['schema', 'data']);
    const apiContract = yaml('api/invite-detail.yaml');
    const upload = apiContract.actions.find((candidate: any) => candidate.id === 'upload_survey_invite_attachment');
    const authUser: any = { sub: 'user-admin', email: 'admin@core3.local', name: 'Admin User', roles: ['manager'], permissions: ['surveys.read', 'surveys.write'] };
    const uploadRoot = `/tmp/core3-surveys-invite-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(apiContract.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['survey-invite-detail', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['surveys.read', 'surveys.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const uploadRequest = (meta: Record<string, unknown>, bytes = [80, 68, 70, 33], name = 'answer-guide.pdf') => api(
      new Request('http://surveys.test/api/upload', { method: 'POST', body: makeUpload(bytes, name, meta) }),
      new URL('http://surveys.test/api/upload'),
    );
    const count = async () => (await repository.query('SELECT COUNT(*) AS count FROM survey_invite_attachments WHERE invite_id = ?', ['invite-certification-sent']))[0].count;

    authUser.permissions = ['surveys.read'];
    await expect(uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 1 })).rejects.toMatchObject({ status: 403 });
    expect(await count()).toBe(1);
    authUser.permissions = ['surveys.read', 'surveys.write'];
    authUser.sub = '';
    const noActor = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 1 }, [65], 'no-actor.pdf');
    expect(noActor?.status).toBe(403);
    expect(await noActor?.json()).toMatchObject({ code: 'SURVEY_INVITE_ATTACHMENT_ACTOR_REQUIRED' });
    authUser.sub = 'user-admin';
    const missing = await uploadRequest({ invite_id: 'missing-invite', expected_row_version: 1 });
    expect(missing?.status).toBe(404);
    expect(await missing?.json()).toMatchObject({ code: 'SURVEY_INVITE_NOT_FOUND' });
    const stale = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 99 });
    expect(stale?.status).toBe(409);
    expect(await stale?.json()).toMatchObject({ code: 'SURVEY_INVITE_CHANGED' });
    const invalid = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 1 }, [], 'empty.pdf');
    expect(invalid?.status).toBe(400);
    const uploadedResponse = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 1 });
    expect(uploadedResponse?.status).toBe(200);
    const uploaded = await uploadedResponse!.json() as any;
    expect(uploaded).toMatchObject({ invite_id: 'invite-certification-sent', survey_id: 'survey-demo-certification', file_name: 'answer-guide.pdf', size_bytes: 4, uploaded_by: 'user-admin' });
    expect(await count()).toBe(2);
    expect((await repository.query('SELECT row_version FROM survey_invites WHERE id = ?', ['invite-certification-sent']))[0].row_version).toBe(2);
    const duplicate = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 2 }, [80, 68, 70, 33], 'answer-guide.pdf');
    expect(duplicate?.status).toBe(409);
    expect(await duplicate?.json()).toMatchObject({ code: 'SURVEY_INVITE_ATTACHMENT_DUPLICATE' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-certification'");
    const archived = await uploadRequest({ invite_id: 'invite-certification-sent', expected_row_version: 2 }, [65], 'archived.pdf');
    expect(archived?.status).toBe(404);
    expect(await archived?.json()).toMatchObject({ code: 'SURVEY_INVITE_NOT_FOUND' });
    const download = await api(new Request(`http://surveys.test/api/surveys/invite-attachments/${uploaded.id}`), new URL(`http://surveys.test/api/surveys/invite-attachments/${uploaded.id}`));
    expect(download?.status).toBe(404);
    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('keeps uploaded invitation bytes and page data after file-backed restart', async () => {
    const databasePath = `/tmp/core3-surveys-invite-attachment-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-surveys-invite-attachment-upload-${crypto.randomUUID()}`;
    const migrationName = `surveys_invite_attachment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const authUser: any = { sub: 'user-admin', email: 'admin@core3.local', name: 'Admin User', roles: ['manager'], permissions: ['surveys.read', 'surveys.write'] };
    const apiContract = yaml('api/invite-detail.yaml');
    const upload = apiContract.actions.find((candidate: any) => candidate.id === 'upload_survey_invite_attachment');
    const download = apiContract.actions.find((candidate: any) => candidate.id === 'download_survey_invite_attachment');
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(apiContract.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['survey-invite-detail', { actions: [upload, download] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['surveys.read', 'surveys.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const form = makeUpload([82, 69, 83, 85, 77, 69], 'restart-guide.pdf', { invite_id: 'invite-certification-sent', expected_row_version: 1 });
    const uploadedResponse = await createApi(firstRepository)(new Request('http://surveys.test/api/upload', { method: 'POST', body: form }), new URL('http://surveys.test/api/upload'));
    expect(uploadedResponse?.status).toBe(200);
    const uploaded = await uploadedResponse!.json() as any;
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const detail = yaml('api/invite-detail.yaml').datasources.find((source: any) => source.id === 'survey_invite_detail');
    const attachments = yaml('api/invite-detail.yaml').datasources.find((source: any) => source.id === 'survey_invite_attachments');
    expect((await secondRepository.querySource(detail, { survey_id: 'survey-demo-certification' }, 0, 20)).data).toEqual(expect.objectContaining({ id: 'invite-certification-sent', row_version: 2 }));
    expect((await secondRepository.querySource(attachments, { survey_id: 'survey-demo-certification' }, 0, 20)).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: uploaded.id, file_name: 'restart-guide.pdf', size_bytes: 6 })]));
    const downloadResponse = await createApi(secondRepository)(new Request(`http://surveys.test/api/surveys/invite-attachments/${uploaded.id}`), new URL(`http://surveys.test/api/surveys/invite-attachments/${uploaded.id}`));
    expect(downloadResponse?.status).toBe(200);
    expect([...new Uint8Array(await downloadResponse!.arrayBuffer())]).toEqual([82, 69, 83, 85, 77, 69]);
    second.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });
});
