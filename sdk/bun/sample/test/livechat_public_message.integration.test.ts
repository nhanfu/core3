import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Live Chat public visitor message parity', () => {
  test('traces the Odoo CORS route and binds the visitor composer to the existing page', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/cors/thread.py', 'utf8');
    const routing = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/static/src/embed/cors/livechat_routing_map.js', 'utf8');
    const page = yaml('pages/visitor-session.yaml');
    const api = yaml('api/visitor-session.yaml');
    const message = action(api, 'send_livechat_visitor_message');

    expect(source).toContain('@route("/im_livechat/cors/message/post", methods=["POST"], type="jsonrpc", auth="public", cors="*")');
    expect(routing).toContain('.add("/mail/message/post", "/im_livechat/cors/message/post")');
    expect(page.page).toMatchObject({ id: 'livechat-visitor-session', route: '/livechat/visitor-session', auth: { require: ['livechat.public'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(page.components[0]).toMatchObject({
      type: 'OdooFormView',
      source: 'livechat_public_session',
      message_source: 'livechat_public_messages',
      message_action: 'send_livechat_visitor_message',
      message_placeholder: 'Say something...',
    });
    expect(message).toMatchObject({
      permission: 'livechat.public',
      action: '/im_livechat/cors/message/post',
      handler: 'yaml_mutation',
      operation: 'message_post',
      params: { id: '{state.id}', visitor_token: '{state.visitor_token}' },
    });
    expect(message.fields).toEqual([{ field: 'content', label: 'Message', type: 'textarea', required: true }]);
  });

  test('persists token-scoped visitor messages, refreshes the transcript, and guards state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'livechat_public_message_test', ['schema', 'data']);
    const api = yaml('api/visitor-session.yaml');
    const send = action(api, 'send_livechat_visitor_message');
    const content = 'Visitor message persisted by the public composer.';
    const before = (await repository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-002'"))[0];

    const saved = await repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002',
      visitor_token: 'livechat-visitor-token-002',
      content,
    });
    expect(saved).toMatchObject({ author_name: 'Visitor B', author_type: 'visitor', detail: content, action: 'message', action_label: 'Message' });
    expect(await repository.query("SELECT author_type, body FROM livechat_session_messages WHERE session_id = 'livechat-session-demo-002' ORDER BY created_at DESC LIMIT 1"))
      .toEqual([{ author_type: 'visitor', body: content }]);
    expect(await repository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-002'"))
      .toEqual([{ message_count: before.message_count + 1, row_version: before.row_version + 1 }]);

    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002', visitor_token: 'wrong-token', content: 'Must not leak',
    })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_PUBLIC_MESSAGE_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', content: ' ',
    })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_PUBLIC_MESSAGE_INVALID' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', content: 'x'.repeat(4001),
    })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_PUBLIC_MESSAGE_INVALID' });

    await repository.run("UPDATE livechat_sessions SET status = 'Closed' WHERE id = 'livechat-session-demo-002'");
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', content: 'Closed replay',
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_PUBLIC_MESSAGE_SESSION_CLOSED' });
    expect(await repository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-002'"))
      .toEqual([{ message_count: before.message_count + 1, row_version: before.row_version + 1 }]);
    database.close();
  });

  test('retains the visitor message and session counters through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-livechat-public-message-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_public_message_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const send = action(yaml('api/visitor-session.yaml'), 'send_livechat_visitor_message');
      const saved = await firstRepository.executeMutation(send.mutation, {
        id: 'livechat-session-demo-006', visitor_token: 'livechat-visitor-token-006', content: 'Restart-safe visitor message',
      });
      first.close();
      first = undefined;

      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT id, author_type, body FROM livechat_session_messages WHERE id = ?', [saved.id]))
        .toEqual([{ id: saved.id, author_type: 'visitor', body: 'Restart-safe visitor message' }]);
      expect(await secondRepository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-006'"))
        .toEqual([{ message_count: 2, row_version: 2 }]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
