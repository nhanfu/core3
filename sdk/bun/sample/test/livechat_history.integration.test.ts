import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

const historyAction = () => yaml('api/session-detail.yaml').actions.find((candidate: any) => candidate.id === 'send_livechat_session_history');

const mutationInput = (values: Record<string, unknown> = {}) => ({
  id: 'livechat-session-demo-001',
  current_user_id: 'livechat-agent',
  current_user_name: 'Support Agent',
  view_scope: 'assigned',
  values: {
    partner_id: 'visitor-demo-a',
    page_history: '["/shop", "/contactus"]',
    ...values,
  },
});

describe('Live Chat public history command parity', () => {
  test('traces the Odoo history and CORS routes and joins the authenticated detail page', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/main.py', 'utf8');
    const cors = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/cors/main.py', 'utf8');
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    const action = historyAction();

    expect(source).toContain('@http.route("/im_livechat/history", type="jsonrpc", auth="public")');
    expect(source).toContain('def history_pages(self, pid, channel_id, page_history=None):');
    expect(source).toContain('_bus_send_history_message(channel, page_history)');
    expect(cors).toContain('@route("/im_livechat/cors/history", type="jsonrpc", auth="public", cors="*")');
    expect(cors).toContain('return self.history_pages(pid, channel_id, page_history)');
    expect(api.page).toEqual({ id: page.page.id });
    expect(page.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(action).toMatchObject({
      id: 'send_livechat_session_history',
      type: 'server_form',
      permission: 'livechat.write',
      action: '/im_livechat/history',
      handler: 'yaml_mutation',
      operation: 'history',
    });
    expect(action.description).toContain('/im_livechat/cors/history');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'send_livechat_session_history',
      permission: 'livechat.write',
    }));
    expect(page.components[0].message_action_labels.history).toBe('Page History');
    expect(discoverPages(sampleRoot).pageDatasources.get('livechat-session-detail')).toContain('livechat_session_messages');
  });

  test('sends only to the session visitor, preserves counters, and renders the Odoo empty state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_history_test', ['schema', 'data']);
    const mutation = historyAction().mutation;
    const before = (await repository.query('SELECT message_count, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001']))[0];

    const sent = await repository.executeMutation(mutation, mutationInput());
    expect(sent).toMatchObject({
      session_id: 'livechat-session-demo-001',
      author_name: 'Support Agent',
      author_type: 'system',
      action: 'history',
      action_label: 'Page History',
      detail: 'Page history: ["/shop", "/contactus"]',
    });
    expect(await repository.query('SELECT message_count, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001'])).toEqual([before]);

    const empty = await repository.executeMutation(mutation, mutationInput({ page_history: '' }));
    expect(empty.detail).toBe('No history found');
    expect((await repository.query("SELECT COUNT(*) AS count FROM livechat_session_messages WHERE session_id = ? AND action = 'history'", ['livechat-session-demo-001']))[0].count).toBe(2);

    await expect(repository.executeMutation(mutation, mutationInput({ partner_id: 'visitor-demo-b' }))).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_HISTORY_PARTNER_NOT_MEMBER' });
    await expect(repository.executeMutation(mutation, mutationInput({ page_history: 'x'.repeat(6001) }))).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_HISTORY_TOO_LARGE' });
    await expect(repository.executeMutation(mutation, { ...mutationInput(), id: 'missing-livechat-session' })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_SESSION_NOT_FOUND' });
    database.close();
  });

  test('honors assigned-operator scope and survives a file-backed restart', async () => {
    const directory = mkdtempSync(join('/dev/shm', 'core3-livechat-history-'));
    const databasePath = join(directory, 'livechat.duckdb');
    const migrationName = `livechat_history_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const mutation = historyAction().mutation;
      await expect(repository.executeMutation(mutation, mutationInput())).resolves.toMatchObject({ action: 'history' });
      await expect(repository.executeMutation(mutation, { ...mutationInput(), current_user_id: 'other-livechat-agent' })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
      database.close();
      database = undefined;

      database = await DuckDbDatabase.open(databasePath);
      const reopened = new YamlRepository(database);
      await migrateDatabase(reopened, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await reopened.query("SELECT action, body AS detail FROM livechat_session_messages WHERE session_id = ? AND action = 'history'", ['livechat-session-demo-001'])).toEqual([
        { action: 'history', detail: 'Page history: ["/shop", "/contactus"]' },
      ]);
    } finally {
      database?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
