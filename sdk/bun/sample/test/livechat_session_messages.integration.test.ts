import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat session conversation timeline', () => {
  test('joins the detail page to a separate persisted message datasource', () => {
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('livechat-session-detail');
    expect(page.components[0]).toMatchObject({
      source: 'livechat_session_detail',
      message_source: 'livechat_session_messages',
      message_action: 'send_livechat_session_message',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((item: any) => item.id === 'livechat_session_messages')).toMatchObject({ permission: 'livechat.read', single: false });
    expect(api.actions.find((item: any) => item.id === 'send_livechat_session_message')).toMatchObject({ permission: 'livechat.write', handler: 'yaml_mutation' });
  });

  test('seeds idempotent visitor/operator messages and scopes the timeline', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_messages_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_messages_test', ['schema', 'data']);
    const source = yaml('api/session-detail.yaml').datasources.find((item: any) => item.id === 'livechat_session_messages');

    expect((await repository.querySource(source, { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'all', current_user_id: 'livechat-agent' }, 0, 50)).data).toMatchObject([
      { id: 'livechat-message-demo-001', author_type: 'visitor', detail: 'I need help with my order.' },
      { id: 'livechat-message-demo-002', author_type: 'operator', author_name: 'Support Agent' },
    ]);
    expect((await repository.querySource(source, { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'assigned', current_user_id: 'other-livechat-agent' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'livechat-session-demo-001', fixture_state: 'empty', view_scope: 'all', current_user_id: 'livechat-agent' }, 0, 50)).data).toEqual([]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM livechat_session_messages WHERE id LIKE 'livechat-message-demo-%'")).toEqual([{ count: 3 }]);
    database.close();
  });

  test('persists an operator reply and rejects invalid or out-of-scope sends', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_message_send_test', ['schema', 'data']);
    const action = yaml('api/session-detail.yaml').actions.find((item: any) => item.id === 'send_livechat_session_message');
    const mutation = action.mutation;
    await repository.executeMutation(mutation, { id: 'livechat-session-demo-002', content: 'I am checking that for you.', current_user_id: 'livechat-agent', current_user_name: 'Live Chat Agent', view_scope: 'assigned' });
    expect(await repository.query("SELECT author_id, author_name, author_type, body FROM livechat_session_messages WHERE session_id = 'livechat-session-demo-002' ORDER BY created_at DESC, id DESC LIMIT 1")).toMatchObject([{ author_id: 'livechat-agent', author_name: 'Live Chat Agent', author_type: 'operator', body: 'I am checking that for you.' }]);
    expect(await repository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-002'")).toEqual([{ message_count: 2, row_version: 2 }]);
    await expect(repository.executeMutation(mutation, { id: 'livechat-session-demo-002', content: '   ', current_user_id: 'livechat-agent', current_user_name: 'Live Chat Agent', view_scope: 'assigned' })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_SESSION_MESSAGE_INVALID' });
    await expect(repository.executeMutation(mutation, { id: 'livechat-session-demo-002', content: 'Not allowed', current_user_id: 'other-livechat-agent', current_user_name: 'Other Operator', view_scope: 'assigned' })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
    expect(await repository.query("SELECT message_count, row_version FROM livechat_sessions WHERE id = 'livechat-session-demo-002'")).toEqual([{ message_count: 2, row_version: 2 }]);
    database.close();
  });
});
