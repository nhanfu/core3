import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { topicMutationInput } from '@core3/server/yaml-service';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Chat multipart attachment upload', () => {
  test('propagates thread and actor identity and persists caption and file-only messages', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_multipart_upload_test', ['schema', 'data']);
    const upload = yaml('api/chat.yaml').actions.find((candidate: any) => candidate.id === 'upload_attachment');
    const authUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['chat.read', 'chat.write'] };
    const uploadRoot = `/tmp/core3-chat-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['chat', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['chat.read', 'chat.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: { async publish() {} }, storage: yaml('storage.yaml'),
      topics: { request: async (_definition: unknown, payload: any) => repository.executeMutation(upload.mutation, {
        ...topicMutationInput(payload),
        current_user_id: payload.actor.id,
        current_user_name: payload.actor.name,
        expected_row_version: payload.expected_row_version ?? null,
      }) },
    });
    const request = (file: File, meta: Record<string, unknown>) => {
      const form = new FormData();
      form.set('file', file);
      form.set('meta', JSON.stringify({ kind: 'chat_attachment', ...meta }));
      return api(new Request('http://chat.test/api/upload', { method: 'POST', body: form }), new URL('http://chat.test/api/upload'));
    };

    const captioned = await request(new File([new Uint8Array([67, 72, 65, 84])], 'caption.txt', { type: 'text/plain' }), {
      thread_id: 'chat-demo-thread', content: 'Please review this file', expected_row_version: 1,
    });
    expect(captioned?.status).toBe(200);
    const captionedResult = await captioned!.json() as any;
    expect(captionedResult).toMatchObject({ thread_id: 'chat-demo-thread', sender_id: 'user-admin', body: 'Please review this file', attachment_file_name: 'caption.txt' });
    expect((await repository.query('SELECT thread_id, sender_id, body FROM chat_messages WHERE id = ?', [captionedResult.id]))[0])
      .toEqual({ thread_id: 'chat-demo-thread', sender_id: 'user-admin', body: 'Please review this file' });
    expect((await repository.query('SELECT file_name, size_bytes FROM chat_attachments WHERE message_id = ?', [captionedResult.id]))[0])
      .toEqual({ file_name: 'caption.txt', size_bytes: 4 });

    const fileOnly = await request(new File([new Uint8Array([70, 73, 76, 69])], 'file-only.bin', { type: 'application/octet-stream' }), {
      thread_id: 'chat-demo-thread', expected_row_version: 2,
    });
    expect(fileOnly?.status).toBe(200);
    const fileOnlyResult = await fileOnly!.json() as any;
    expect(fileOnlyResult).toMatchObject({ thread_id: 'chat-demo-thread', sender_id: 'user-admin', body: 'File uploaded', attachment_file_name: 'file-only.bin' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM chat_messages WHERE thread_id = ?', ['chat-demo-thread']))[0].count).toBe(4);
    expect((await repository.query('SELECT COUNT(*) AS count FROM chat_attachments'))[0].count).toBe(2);
    const stored = readdirSync(uploadRoot);
    expect(stored).toHaveLength(2);
    expect(await Promise.all(stored.map((name) => Bun.file(join(uploadRoot, name)).text()))).toEqual(expect.arrayContaining(['CHAT', 'FILE']));

    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('rejects stale, non-participant, and invalid uploads without database or file partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_multipart_guard_test', ['schema', 'data']);
    const upload = yaml('api/chat.yaml').actions.find((candidate: any) => candidate.id === 'upload_attachment');
    const authUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['chat.read', 'chat.write'] };
    const uploadRoot = `/tmp/core3-chat-guard-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['chat', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['chat.read', 'chat.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, storage: yaml('storage.yaml'),
      topics: { request: async (_definition: unknown, payload: any) => repository.executeMutation(upload.mutation, {
        ...topicMutationInput(payload), current_user_id: payload.actor.id, current_user_name: payload.actor.name,
        expected_row_version: payload.expected_row_version ?? null,
      }) },
    });
    const request = (meta: Record<string, unknown>, bytes = [88, 89, 90]) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], 'guard.txt', { type: 'text/plain' }));
      form.set('meta', JSON.stringify({ kind: 'chat_attachment', ...meta }));
      return api(new Request('http://chat.test/api/upload', { method: 'POST', body: form }), new URL('http://chat.test/api/upload'));
    };

    await expect(request({ thread_id: 'chat-demo-thread', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'CHAT_THREAD_STALE' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM chat_attachments'))[0].count).toBe(0);
    expect(readdirSync(uploadRoot)).toHaveLength(0);

    authUser.sub = 'user-fleet';
    await expect(request({ thread_id: 'chat-demo-thread' })).rejects.toMatchObject({ status: 403, code: 'CHAT_THREAD_FORBIDDEN' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM chat_messages'))[0].count).toBe(5);
    expect(readdirSync(uploadRoot)).toHaveLength(0);

    authUser.sub = 'user-admin';
    const invalid = await request({ thread_id: 'chat-demo-thread' }, []);
    expect(invalid?.status).toBe(400);
    expect((await repository.query('SELECT COUNT(*) AS count FROM chat_messages'))[0].count).toBe(5);
    expect(readdirSync(uploadRoot)).toHaveLength(0);

    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });
});
