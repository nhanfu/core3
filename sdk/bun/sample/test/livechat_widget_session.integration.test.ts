import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Live Chat public widget session parity', () => {
  test('traces Odoo bootstrap routes and keeps page/API fragments joined', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/main.py', 'utf8');
    const cors = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/cors/main.py', 'utf8');
    const page = yaml('pages/widget-session.yaml');
    const api = yaml('api/widget-session.yaml');
    expect(source).toContain("@http.route('/im_livechat/get_session', methods=[\"POST\"], type=\"jsonrpc\", auth='public')");
    expect(source).toContain('def get_session(self, channel_id, previous_operator_id=None, chatbot_script_id=None, persisted=True');
    expect(cors).toContain('@route("/im_livechat/cors/get_session", methods=["POST"], type="jsonrpc", auth="public", cors="*")');
    expect(page.page).toMatchObject({ id: 'livechat-widget-session', route: '/livechat/widget', auth: { require: ['livechat.public'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['livechat_widget_session', 'livechat_widget_messages']));
    expect(page.page.route).toBe('/livechat/widget');
    expect(page.components[0].source).toBe('livechat_widget_session');
    expect(action(api, 'get_livechat_widget_session')).toMatchObject({ permission: 'livechat.public', action: '/im_livechat/get_session', handler: 'yaml_mutation' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_widget_session' });
  });

  test('bootstraps an operator-backed durable session, resumes it, and guards invalid state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_widget_session_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_widget_session_test', ['schema', 'data']);
    const api = yaml('api/widget-session.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'livechat_widget_session');
    expect(await repository.querySource(source, { id: 'livechat-widget-demo-001', channel_id: null, visitor_token: null, fixture_state: null }, 0, 1))
      .toMatchObject({ data: { channel_name: 'YourWebsite.com', visitor_name: 'Widget Visitor', state: 'Active' } });
    const start = action(api, 'get_livechat_widget_session');
    expect(start.action).toBe('/im_livechat/get_session');
    const input = { channel_id: 'livechat-channel-demo-002', visitor_token: 'qa-widget-token-001', visitor_name: 'QA Visitor', persisted: true };
    const created = await repository.executeMutation(start.mutation, input);
    expect(created).toMatchObject({ id: 'livechat-widget-livechat-channel-demo-002-qa-widget-token-001', session_id: 'livechat-session-widget-livechat-channel-demo-002-qa-widget-token-001', visitor_name: 'QA Visitor', operator_name: 'Marc Demo', state: 'Active', resumed: true });
    expect((await repository.query('SELECT visitor_token, status, operator_name FROM livechat_sessions WHERE id = ?', [created.session_id]))[0])
      .toMatchObject({ visitor_token: 'qa-widget-token-001', status: 'In Progress', operator_name: 'Marc Demo' });
    const resumed = await repository.executeMutation(start.mutation, input);
    expect(resumed).toMatchObject({ id: created.id, session_id: created.session_id, visitor_name: 'QA Visitor', state: 'Active' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM livechat_session_messages WHERE session_id = ?', [created.session_id]))
      .toEqual([{ count: 1 }]);
    await expect(repository.executeMutation(start.mutation, { ...input, visitor_token: '' })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_WIDGET_TOKEN_INVALID' });
    await expect(repository.executeMutation(start.mutation, { ...input, channel_id: 'missing-channel' })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_WIDGET_CHANNEL_NOT_FOUND' });
    await expect(repository.executeMutation(start.mutation, { ...input, visitor_name: ' ' })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_WIDGET_NAME_INVALID' });
    await expect(repository.executeMutation(start.mutation, { ...input, persisted: false })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_WIDGET_TEMPORARY_UNSUPPORTED' });
    await repository.run("UPDATE livechat_widget_sessions SET state = 'Closed' WHERE id = 'livechat-widget-livechat-channel-demo-002-qa-widget-token-001'");
    await expect(repository.executeMutation(start.mutation, input)).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_WIDGET_SESSION_CLOSED' });
    database.close();
  });

  test('persists the widget session through a file-backed restart and preserves token ownership', async () => {
    const databasePath = `/tmp/core3-livechat-widget-session-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_widget_session_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const start = action(yaml('api/widget-session.yaml'), 'get_livechat_widget_session');
      const created = await firstRepository.executeMutation(start.mutation, { channel_id: 'livechat-channel-demo-002', visitor_token: 'restart-widget-token', visitor_name: 'Restart Visitor', persisted: true });
      first.close(); first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT id, visitor_token, state FROM livechat_widget_sessions WHERE id = ?', [created.id]))
        .toEqual([{ id: created.id, visitor_token: 'restart-widget-token', state: 'Active' }]);
      expect(await secondRepository.query('SELECT visitor_token, status FROM livechat_sessions WHERE id = ?', [created.session_id]))
        .toEqual([{ visitor_token: 'restart-widget-token', status: 'In Progress' }]);
      const source = yaml('api/widget-session.yaml').datasources.find((candidate: any) => candidate.id === 'livechat_widget_session');
      expect(await secondRepository.querySource(source, { id: '', channel_id: 'livechat-channel-demo-002', visitor_token: 'wrong-token', fixture_state: null }, 0, 1)).toMatchObject({ data: {} });
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
