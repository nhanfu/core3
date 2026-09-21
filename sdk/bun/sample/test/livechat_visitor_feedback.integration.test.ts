import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Live Chat visitor feedback and leave-session parity', () => {
  test('traces Odoo routes and keeps the public visitor page/API joined by page.id', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/main.py', 'utf8');
    const page = yaml('pages/visitor-session.yaml');
    const api = yaml('api/visitor-session.yaml');
    expect(source).toContain('@http.route("/im_livechat/feedback", type="jsonrpc", auth="public")');
    expect(source).toContain('@http.route("/im_livechat/visitor_leave_session", type="jsonrpc", auth="public")');
    expect(source).toContain('only ONE rating per session');
    expect(page.page).toMatchObject({ id: 'livechat-visitor-session', route: '/livechat/visitor-session' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['livechat_public_session', 'livechat_public_messages', 'livechat_public_feedback']));
    expect(action(api, 'leave_livechat_session')).toMatchObject({ permission: 'livechat.public', action: '/im_livechat/visitor_leave_session' });
    expect(action(api, 'submit_livechat_feedback')).toMatchObject({ permission: 'livechat.public', action: '/im_livechat/feedback' });
    expect(page.components[0].source).toBe('livechat_public_session');
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'leave_livechat_session', permission: 'livechat.public' }),
      expect.objectContaining({ id: 'submit_livechat_feedback', permission: 'livechat.public' }),
    ]));
  });

  test('persists feedback, closes only the token-owned session, guards state and replays migrations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_visitor_feedback_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_visitor_feedback_test', ['schema', 'data']);
    const api = yaml('api/visitor-session.yaml');
    const session = api.datasources.find((candidate: any) => candidate.id === 'livechat_public_session');
    const detail = await repository.querySource(session, { id: 'livechat-session-demo-001', visitor_token: 'livechat-visitor-token-001', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'livechat-session-demo-001', visitor_display: 'Visitor A', feedback_submitted: false });
    const feedback = action(api, 'submit_livechat_feedback');
    await expect(repository.executeMutation(feedback.mutation, { id: 'livechat-session-demo-002', visitor_token: 'wrong-token', rating: 5, reason: 'No disclosure', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_PUBLIC_SESSION_NOT_FOUND' });
    await expect(repository.executeMutation(feedback.mutation, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', rating: 9, reason: '', expected_row_version: 1 })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_PUBLIC_RATING_INVALID' });
    const saved = await repository.executeMutation(feedback.mutation, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', rating: 5, reason: 'Resolved quickly.', expected_row_version: 1 });
    expect(saved).toMatchObject({ session_id: 'livechat-session-demo-002', rating: 5, reason: 'Resolved quickly.' });
    expect(await repository.query('SELECT rating, reason FROM livechat_session_feedback WHERE session_id = ?', ['livechat-session-demo-002'])).toEqual([{ rating: 5, reason: 'Resolved quickly.' }]);
    const leave = action(api, 'leave_livechat_session');
    const left = await repository.executeMutation(leave.mutation, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', expected_row_version: 2 });
    expect(left).toMatchObject({ id: 'livechat-session-demo-002', status: 'Closed', outcome: 'Visitor Left', row_version: 3 });
    await expect(repository.executeMutation(leave.mutation, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_PUBLIC_SESSION_ALREADY_CLOSED' });
    expect((await repository.query("SELECT action, action_label FROM livechat_session_messages WHERE session_id = 'livechat-session-demo-002' ORDER BY created_at DESC LIMIT 1"))[0]).toEqual({ action: 'leave', action_label: 'Visitor left' });
    database.close();
  });

  test('survives a file-backed restart and refuses cross-session feedback', async () => {
    const databasePath = `/tmp/core3-livechat-visitor-feedback-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_visitor_feedback_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const feedback = action(yaml('api/visitor-session.yaml'), 'submit_livechat_feedback');
      await expect(firstRepository.executeMutation(feedback.mutation, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-001', rating: 1, reason: 'Wrong visitor', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_PUBLIC_SESSION_NOT_FOUND' });
      first.close();
      first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT visitor_token FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001'])).toEqual([{ visitor_token: 'livechat-visitor-token-001' }]);
      expect(await secondRepository.query('SELECT rating, reason FROM livechat_session_feedback WHERE session_id = ?', ['livechat-session-demo-003'])).toEqual([{ rating: 5, reason: 'Resolved quickly.' }]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
