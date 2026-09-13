import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Chat message lifecycle', () => {
  test('sends, marks read/unread, and stars a participant conversation with persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_message_lifecycle_test', ['schema', 'data']);
    const actions = yaml('api/chat.yaml').actions;
    const action = (id: string) => actions.find((candidate: any) => candidate.id === id);
    const threadId = 'chat-demo-thread';
    const userId = 'user-admin';

    const sent = await repository.executeMutation(action('send_message').mutation, {
      thread_id: threadId, current_user_id: userId, values: { content: 'Lifecycle message' },
    });
    expect(sent).toMatchObject({ thread_id: threadId, sender_id: userId, body: 'Lifecycle message' });
    expect((await repository.query('SELECT body, sender_id FROM chat_messages WHERE id = ?', [sent.id]))[0]).toEqual({ body: 'Lifecycle message', sender_id: userId });
    expect((await repository.query('SELECT row_version FROM chat_threads WHERE id = ?', [threadId]))[0].row_version).toBe(2);

    await repository.executeMutation(action('mark_thread_unread').mutation, { thread_id: threadId, current_user_id: userId });
    const unread = (await repository.query('SELECT last_read_at FROM chat_participants WHERE thread_id = ? AND user_id = ?', [threadId, userId]))[0];
    expect(new Date(unread.last_read_at).getTime()).toBe(new Date('1970-01-01T00:00:00Z').getTime());
    await repository.executeMutation(action('mark_thread_read').mutation, { thread_id: threadId, current_user_id: userId });
    const read = (await repository.query('SELECT last_read_at FROM chat_participants WHERE thread_id = ? AND user_id = ?', [threadId, userId]))[0];
    expect(new Date(read.last_read_at).getTime()).toBeGreaterThan(new Date('1970-01-01T00:00:00Z').getTime());

    const starred = await repository.executeMutation(action('toggle_thread_star').mutation, { thread_id: threadId, current_user_id: userId, expected_row_version: 2 });
    expect(starred).toMatchObject({ id: threadId, starred: false, row_version: 3 });
    expect(await repository.executeMutation(action('toggle_thread_star').mutation, { thread_id: threadId, current_user_id: userId, expected_row_version: 3 }))
      .toMatchObject({ id: threadId, starred: true, row_version: 4 });
    await expect(repository.executeMutation(action('toggle_thread_star').mutation, { thread_id: threadId, current_user_id: userId, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'CHAT_THREAD_STALE' });
    database.close();
  });

  test('persists uploaded attachments and returns renderable metadata', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_attachment_lifecycle_test', ['schema', 'data']);
    const upload = yaml('api/chat.yaml').actions.find((candidate: any) => candidate.id === 'upload_attachment');
    const result = await repository.executeMutation(upload.mutation, {
      thread_id: 'chat-demo-thread',
      current_user_id: 'user-admin',
      content: 'Please review the transcript',
      fileName: 'transcript.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      storageKey: 'upload-key-transcript',
    });

    expect(result).toMatchObject({
      thread_id: 'chat-demo-thread',
      sender_id: 'user-admin',
      body: 'Please review the transcript',
      attachment_id: expect.any(String),
      attachment_file_name: 'transcript.pdf',
      attachment_mime_type: 'application/pdf',
      attachment_size_bytes: 2048,
    });
    expect((await repository.query('SELECT file_name, storage_key, size_bytes FROM chat_attachments'))[0])
      .toEqual({ file_name: 'transcript.pdf', storage_key: 'upload-key-transcript', size_bytes: 2048 });
    expect((await repository.query("SELECT row_version FROM chat_threads WHERE id = 'chat-demo-thread'"))[0].row_version).toBe(2);

    database.close();
  });
});
