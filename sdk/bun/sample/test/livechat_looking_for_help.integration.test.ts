import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = () => yaml('api/help-queue.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);

async function seededRepository() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_help_queue_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Live Chat Conversations — Looking for Help parity', () => {
  test('keeps the queue presentation separate and joins its API by page.id', () => {
    const page = yaml('pages/help-queue.yaml');
    const discovered = discoverPages(sampleRoot);

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'livechat-help-queue', route: '/livechat-sessions/help', auth: { require: ['livechat.read'] } });
    expect(api().page).toEqual({ id: 'livechat-help-queue' });
    expect(discovered.pageDatasources.get('livechat-help-queue')).toEqual(['livechat_help_sessions']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/livechat-sessions/help', page: 'livechat-help-queue', module: 'livechat' });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'conversations').items)
      .toContainEqual({ path: '/livechat-sessions/help', label: 'Looking for Help', icon: 'help', permission: 'livechat.read' });
  });

  test('seeds deterministic help requests and supports search, empty, no-results, and transport errors', async () => {
    const { database, repository } = await seededRepository();
    const source = api().datasources[0];
    const params = { q: null, fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.id)).toEqual([
      'livechat-session-demo-005', 'livechat-help-001', 'livechat-help-002', 'livechat-help-003',
    ]);
    expect(populated.data[0]).toMatchObject({ status: 'Looking for Help', status_label: 'Looking for Help', expertise_name: 'Technical Support', tag_names: 'Urgent' });
    expect(populated.data.find((row: any) => row.id === 'livechat-help-001')).toMatchObject({ visitor_display: 'Visitor #401', agent_names: 'Maya Chen', country_name: 'United States', language_name: 'English', tag_names: 'Billing, VIP' });
    expect((await repository.querySource(source, { ...params, q: 'Technical Support' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['livechat-session-demo-005', 'livechat-help-002']);
    expect((await repository.querySource(source, { ...params, q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_HELP_SESSIONS_UNAVAILABLE' });
    database.close();
  });

  test('exposes read-only queue navigation and permissioned guarded workflow actions', async () => {
    const page = yaml('pages/help-queue.yaml');
    const source = api().datasources[0];
    const workflow = yaml('pages/livechat-workflow.yaml').workflow;
    const { database, repository } = await seededRepository();

    expect(source).toMatchObject({ permission: 'livechat.read', workflow: 'livechat_sessions', single: false });
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_HELP_SESSIONS_UNAVAILABLE' });
    expect(page.components[0]).toMatchObject({ source: 'livechat_help_sessions', row_open_action: 'view_livechat_help_session', form_view: { side_panel: true } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['card', 'list']);
    expect(page.components[0].empty_state).toMatchObject({ title: 'No conversations found' });
    expect(action('view_livechat_help_session')).toMatchObject({ type: 'navigate', permission: 'livechat.read', navigate_to: '/livechat-session-detail' });
    for (const id of ['join_livechat_help_session', 'close_livechat_help_session']) {
      expect(action(id), id).toMatchObject({ type: 'server', permission: 'livechat.write', handler: 'order_transition', workflow: 'livechat_sessions' });
    }
    expect(api().actions.some((candidate: any) => ['create', 'delete'].includes(candidate.operation))).toBe(false);
    expect(workflow.transitions.filter((transition: any) => ['join', 'close'].includes(transition.id)).every((transition: any) => transition.permission === 'livechat.write' && transition.mutation.guards[0].status === 409 && String(transition.mutation.guards[0].query).includes('expected_row_version'))).toBe(true);

    const join = workflow.transitions.find((transition: any) => transition.id === 'join').mutation;
    const close = workflow.transitions.find((transition: any) => transition.id === 'close').mutation;
    const joined = await repository.executeMutation(join, { id: 'livechat-session-demo-005', expected_row_version: 1 });
    expect(joined).toMatchObject({ status: 'In Progress', row_version: 2 });
    await expect(repository.executeMutation(join, { id: 'livechat-session-demo-005', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVALID_STATE' });
    await expect(repository.executeMutation(close, { id: 'livechat-session-demo-005', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVALID_STATE' });
    await repository.executeMutation(close, { id: 'livechat-session-demo-005', expected_row_version: 2 });
    database.close();
  });
});
