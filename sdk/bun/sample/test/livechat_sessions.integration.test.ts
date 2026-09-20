import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/sessions.yaml').actions.find((candidate: any) => candidate.id === id);

const createLivechatApi = (repository: YamlRepository, discovered: any, getUser: () => any) => createYamlApi({
  repository,
  authProvider: {
    async getCurrentUser() { return getUser(); },
    hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); },
  },
  sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('livechat_'))),
  pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'livechat')),
  pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'livechat').map(([id, page]) => [id, page.config])),
  catalogs: discovered.catalogs,
  menus: discovered.menus,
  workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.config])),
  workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.file])),
  permissions: discovered.permissions.get('livechat')?.config || {},
  uploadRoot: '/tmp/core3-livechat-test-uploads', eventStore: {}, topics: {},
});

const postAction = (api: any, actionName: string, body: Record<string, unknown>) => api(
  new Request(`http://livechat.test/api/actions/${actionName}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  new URL(`http://livechat.test/api/actions/${actionName}`),
);

const querySource = (api: any, sourceId: string, params: Record<string, unknown>) => api(
  new Request('http://livechat.test/api/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, params, top: 50 }),
  }),
  new URL('http://livechat.test/api/query'),
);

describe('Live Chat Conversations — Sessions parity', () => {
  test('keeps session list/detail layout separate and joins API fragments by page.id', () => {
    const listPage = yaml('pages/sessions.yaml');
    const detailPage = yaml('pages/session-detail.yaml');
    const listApi = yaml('api/sessions.yaml');
    const detailApi = yaml('api/session-detail.yaml');
    const discovered = discoverPages(sampleRoot);

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'livechat-sessions', route: '/livechat-sessions' });
    expect(detailPage.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('livechat-sessions')).toContain('livechat_sessions');
    expect(discovered.pageDatasources.get('livechat-session-detail')).toContain('livechat_session_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat-sessions', page: 'livechat-sessions', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat-session-detail', page: 'livechat-session-detail', module: 'livechat' }),
    ]));
  });

  test('seeds populated sessions and supports date/search-empty, empty, and detail states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_sessions_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_sessions_test_migrations', ['schema', 'data']);

    const source = yaml('api/sessions.yaml').datasources.find((item: any) => item.id === 'livechat_sessions');
    const populated = await repository.querySource(source, { q: null, session_date: 'last_30_days', fixture_state: null }, 0, 50);
    expect(populated.data.length).toBeGreaterThanOrEqual(8);
    expect(populated.data.map((row: any) => row.visitor_display)).toEqual(expect.arrayContaining(['Visitor', 'Visitor #301', 'Visiteur']));
    expect(populated.data.find((row: any) => row.id === 'livechat-session-demo-003')).toMatchObject({ message_count: 8, country_name: 'United States', status_label: 'Success' });
    expect((await repository.querySource(source, { q: 'does-not-exist', session_date: 'last_30_days', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, session_date: 'last_30_days', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/session-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-session-demo-003', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'livechat-session-demo-003', visitor_display: 'Visitor #301', message_count: 8, status_label: 'Success' },
    });
    expect(await repository.querySource(detail, { id: 'missing-livechat-session', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
  });

  test('keeps workflow permissions, transport errors, and action contracts explicit', () => {
    const page = yaml('pages/sessions.yaml');
    const list = page.components[0];
    const api = yaml('api/sessions.yaml');
    const detailApi = yaml('api/session-detail.yaml');

    expect(list.source).toBe('livechat_sessions');
    expect(list.views[0]).toMatchObject({ id: 'card', label: 'Kanban' });
    expect(list.views[0].card.fields.map((field: any) => field.field)).toEqual(['duration_label', 'message_label', 'status_label', 'country_name']);
    expect(api.datasources.find((item: any) => item.id === 'livechat_sessions')).toMatchObject({
      permission: 'livechat.read',
      workflow: 'livechat_sessions',
      error_states: { transport_error: { status: 503, code: 'LIVECHAT_SESSIONS_UNAVAILABLE' } },
    });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_SESSION_DETAIL_UNAVAILABLE' });
    expect(action('view_livechat_session')).toMatchObject({ permission: 'livechat.read', navigate_to: '/livechat-session-detail' });
    for (const id of ['wait_livechat_session', 'resume_livechat_session', 'help_livechat_session', 'close_livechat_session']) {
      expect(action(id), id).toMatchObject({ permission: 'livechat.write', handler: 'order_transition', workflow: 'livechat_sessions' });
    }
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.write']));
  });

  test('executes the visitor session lifecycle with versioned persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_lifecycle_test', ['schema', 'data']);
    const discovered = discoverPages(sampleRoot);
    const user = { sub: 'livechat-agent', email: 'agent@workspace.example', name: 'Live Chat Agent', permissions: ['livechat.read', 'livechat.write'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('livechat_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'livechat')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'livechat').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('livechat')?.config || {},
      uploadRoot: '/tmp/core3-livechat-test-uploads', eventStore: {}, topics: {},
    });
    const sessionId = 'livechat-session-demo-002';
    const transition = (namespace: string, name: string, expected: number) => api(new Request(`http://livechat.test/api/actions/livechat.${namespace}.${name}`, {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, expected_row_version: expected, values: {} }),
    }), new URL(`http://livechat.test/api/actions/livechat.${namespace}.${name}`));

    expect((await (await transition('sessions', 'wait', 1)).json())).toMatchObject({ id: sessionId, status: 'Waiting for Customer', row_version: 2 });
    expect((await (await transition('sessions', 'resume', 2)).json())).toMatchObject({ id: sessionId, status: 'In Progress', row_version: 3 });
    expect((await (await transition('sessions', 'help', 3)).json())).toMatchObject({ id: sessionId, status: 'Looking for Help', row_version: 4 });
    expect((await (await transition('help_sessions', 'join', 4)).json())).toMatchObject({ id: sessionId, status: 'In Progress', row_version: 5 });
    expect((await (await transition('sessions', 'close', 5)).json())).toMatchObject({ id: sessionId, status: 'Closed', outcome: 'Success', row_version: 6 });
    expect((await repository.query('SELECT status, visitor_name, channel_id, operator_name, outcome, row_version FROM livechat_sessions WHERE id = ?', [sessionId]))[0]).toMatchObject({ status: 'Closed', visitor_name: 'Visitor B', channel_id: 'livechat-channel-demo-001', operator_name: 'Support Agent', outcome: 'Success', row_version: 6 });
    await expect(transition('sessions', 'close', 5)).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVALID_STATE' });
    database.close();
  });

  test('persists a session transition across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-livechat-restart-'));
    const path = join(directory, 'livechat.duckdb');
    const discovered = discoverPages(sampleRoot);
    const user = { sub: 'livechat-agent', email: 'agent@workspace.example', name: 'Live Chat Agent', permissions: ['livechat.read', 'livechat.write'] };
    const first = await DuckDbDatabase.open(path);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_restart_test', ['schema', 'data']);
    const firstApi = createLivechatApi(firstRepository, discovered, () => user);
    await expect(postAction(firstApi, 'livechat.sessions.wait', { id: 'livechat-session-demo-002', expected_row_version: 1, values: {} })).resolves.toMatchObject({ status: 200 });
    first.close();

    const second = await DuckDbDatabase.open(path);
    const secondRepository = new YamlRepository(second);
    const secondApi = createLivechatApi(secondRepository, discovered, () => user);
    expect((await secondRepository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002']))[0]).toMatchObject({ status: 'Waiting for Customer', row_version: 2 });
    await expect(postAction(secondApi, 'livechat.sessions.close', { id: 'livechat-session-demo-002', expected_row_version: 2, values: {} })).resolves.toMatchObject({ status: 200 });
    expect((await secondRepository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002']))[0].status).toBe('Closed');
    await expect(postAction(secondApi, 'livechat.sessions.close', { id: 'livechat-session-demo-002', expected_row_version: 2, values: {} })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVALID_STATE' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('limits assigned operators to their sessions without changing another row', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_operator_scope_test', ['schema', 'data']);
    const discovered = discoverPages(sampleRoot);
    let currentUser: any = { sub: 'livechat-agent', email: 'agent@workspace.example', name: 'Live Chat Agent', permissions: ['livechat.read', 'livechat.write'], view_scope: 'assigned' };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return currentUser; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('livechat_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'livechat')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'livechat').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs, menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('livechat')?.config || {}, uploadRoot: '/tmp/core3-livechat-test-uploads', eventStore: {}, topics: {},
    });
    const query = () => api(new Request('http://livechat.test/api/query', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: 'livechat_sessions', params: { q: null, session_date: 'all' }, top: 50 }) }), new URL('http://livechat.test/api/query'));
    expect((await (await query()).json()).data.map((row: any) => row.id)).not.toContain('livechat-session-scope-001');
    currentUser = { ...currentUser, sub: 'other-livechat-agent', name: 'Other Operator' };
    await expect(api(new Request('http://livechat.test/api/actions/livechat.sessions.close', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'livechat-session-demo-002', expected_row_version: 1, values: {} }) }), new URL('http://livechat.test/api/actions/livechat.sessions.close'))).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
    expect(await repository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002'])).toEqual([{ status: 'In Progress', row_version: 1 }]);
    database.close();
  });

  test('binds the assigned-operator detail action matrix to the shared workflow', () => {
    const detailPage = yaml('pages/session-detail.yaml');
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const headerIds = form.header_actions.map((candidate: any) => candidate.id);
    expect(headerIds).toEqual([
      'wait_livechat_session_detail',
      'resume_livechat_session_detail',
      'help_livechat_session_detail',
      'join_livechat_session_detail',
      'close_livechat_session_detail',
    ]);
    const detailActions = new Map(detailPage.actions.map((candidate: any) => [candidate.id, candidate]));
    for (const [id, operation, actionName] of [
      ['wait_livechat_session_detail', 'wait', 'livechat.sessions.wait'],
      ['resume_livechat_session_detail', 'resume', 'livechat.sessions.resume'],
      ['help_livechat_session_detail', 'help', 'livechat.sessions.help'],
      ['join_livechat_session_detail', 'join', 'livechat.help_sessions.join'],
      ['close_livechat_session_detail', 'close', 'livechat.sessions.close'],
    ]) {
      expect(detailActions.get(id), id).toMatchObject({
        type: 'server', permission: 'livechat.write', action: actionName,
        handler: 'order_transition', workflow: 'livechat_sessions', operation,
        params: { id: '{state.id}' },
      });
    }
    expect(form.header_actions.find((candidate: any) => candidate.id === 'close_livechat_session_detail').show_if).not.toContain("record.status === 'Closed'");
  });

  test('covers assigned detail access and every operator action denial atomically', async () => {
    const discovered = discoverPages(sampleRoot);
    const actionCases = [
      { action: 'livechat.sessions.wait', id: 'livechat-session-demo-002', status: 'In Progress', message: 'wait' },
      { action: 'livechat.sessions.resume', id: 'livechat-session-demo-002', status: 'Waiting for Customer', message: 'resume' },
      { action: 'livechat.sessions.help', id: 'livechat-session-demo-002', status: 'In Progress', message: 'help' },
      { action: 'livechat.help_sessions.join', id: 'livechat-session-demo-005', status: 'Looking for Help', message: 'join' },
      { action: 'livechat.sessions.close', id: 'livechat-session-demo-002', status: 'In Progress', message: 'close' },
    ];

    for (const candidate of actionCases) {
      const database = await DuckDbDatabase.open(':memory:');
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `livechat_operator_matrix_${candidate.message}`, ['schema', 'data']);
      if (candidate.status !== 'In Progress') {
        await repository.run('UPDATE livechat_sessions SET status = ? WHERE id = ?', [candidate.status, candidate.id]);
      }
      const currentUser = { sub: 'other-livechat-agent', email: 'other@workspace.example', name: 'Other Operator', permissions: ['livechat.read', 'livechat.write'], view_scope: 'assigned' };
      const api = createLivechatApi(repository, discovered, () => currentUser);
      const before = (await repository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', [candidate.id]))[0];
      const detailResponse = await querySource(api, 'livechat_session_detail', { id: candidate.id });
      expect((await detailResponse.json()).data).toEqual({});
      await expect(postAction(api, candidate.action, { id: candidate.id, expected_row_version: before.row_version, values: {} }), candidate.message).rejects.toMatchObject({
        status: 403,
        code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE',
      });
      expect(await repository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', [candidate.id])).toEqual([before]);
      database.close();
    }
  });

  test('returns 401, 409 stale, and 404 missing without changing the session', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_error_matrix', ['schema', 'data']);
    const discovered = discoverPages(sampleRoot);
    const user = { sub: 'livechat-agent', email: 'agent@workspace.example', name: 'Live Chat Agent', permissions: ['livechat.read', 'livechat.write'], view_scope: 'assigned' };
    const api = createLivechatApi(repository, discovered, () => user);
    const before = (await repository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002']))[0];
    await expect(postAction(api, 'livechat.sessions.wait', { id: 'livechat-session-demo-002', expected_row_version: 0, values: {} })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVALID_STATE' });
    await expect(postAction(api, 'livechat.sessions.wait', { id: 'missing-livechat-session', expected_row_version: 1, values: {} })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_SESSION_NOT_FOUND' });
    expect(await repository.query('SELECT status, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-002'])).toEqual([before]);

    const unauthorizedApi = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { throw { status: 401, code: 'UNAUTHENTICATED', message: 'Authentication required' }; },
        hasPermission() { return false; },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('livechat_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'livechat')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'livechat').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs, menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'livechat').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('livechat')?.config || {},
      uploadRoot: '/tmp/core3-livechat-test-uploads', eventStore: {}, topics: {},
    });
    await expect(querySource(unauthorizedApi, 'livechat_session_detail', { id: 'livechat-session-demo-002' })).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    database.close();
  });

  test('persists every assigned operator transition across file-backed restarts and migration replay', async () => {
    const databasePath = `/tmp/core3-livechat-operator-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_operator_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const discovered = discoverPages(sampleRoot);
    const user = { sub: 'livechat-agent', email: 'agent@workspace.example', name: 'Live Chat Agent', permissions: ['livechat.read', 'livechat.write'], view_scope: 'assigned' };
    const sessionId = 'livechat-session-demo-002';
    const transitions = [
      { action: 'livechat.sessions.wait', status: 'Waiting for Customer', before: 1, after: 2 },
      { action: 'livechat.sessions.resume', status: 'In Progress', before: 2, after: 3 },
      { action: 'livechat.sessions.help', status: 'Looking for Help', before: 3, after: 4 },
      { action: 'livechat.help_sessions.join', status: 'In Progress', before: 4, after: 5 },
      { action: 'livechat.sessions.close', status: 'Closed', before: 5, after: 6 },
    ];
    let database: DuckDbDatabase | undefined;
    try {
      for (const transition of transitions) {
        database = await DuckDbDatabase.open(databasePath);
        const repository = new YamlRepository(database);
        await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
        const api = createLivechatApi(repository, discovered, () => user);
        const changed = await postAction(api, transition.action, { id: sessionId, expected_row_version: transition.before, values: {} });
        expect(await changed.json(), transition.action).toMatchObject({ id: sessionId, status: transition.status, row_version: transition.after });
        database.close();
        database = undefined;

        database = await DuckDbDatabase.open(databasePath);
        const reopenedRepository = new YamlRepository(database);
        await migrateDatabase(reopenedRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
        expect(await reopenedRepository.query('SELECT status, row_version, operator_id FROM livechat_sessions WHERE id = ?', [sessionId]), transition.action).toEqual([
          { status: transition.status, row_version: transition.after, operator_id: 'livechat-agent' },
        ]);
        const detail = await querySource(createLivechatApi(reopenedRepository, discovered, () => user), 'livechat_session_detail', { id: sessionId });
        expect((await detail.json()).data, transition.action).toMatchObject({ id: sessionId, status: transition.status, row_version: transition.after, operator_name: 'Support Agent' });
        database.close();
        database = undefined;
      }
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
