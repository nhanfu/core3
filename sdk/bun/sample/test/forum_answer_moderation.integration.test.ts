import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverForumPages } from './forum_test_support';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const actions = () => yaml('api/question-detail.yaml').actions;

describe('Forum answer creation and moderation', () => {
  test('keeps the question detail presentation/API contract joined by page id and exposes the reverse accepted transition', () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(['forum_post_detail', 'forum_post_answers']);
    expect(api.actions.find((action: any) => action.id === 'unaccept_forum_answer')).toMatchObject({
      permission: 'forum.manage', action: 'forum.answers.unaccept', operation: 'update',
    });
  });

  test('creates through the authenticated HTTP contract and renders the author after reload', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_http_contract', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-browser-user', email: 'browser@workspace.example', name: 'Forum Browser User', permissions: ['forum.read', 'forum.write'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('forum')?.config || {},
      uploadRoot: '/tmp/core3-forum-answer-http', eventStore: {}, topics: {},
    });
    const actionRequest = (values: Record<string, unknown>, parentExpected = 1) => api(new Request('http://forum.test/api/actions/forum.answers.create', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-001', parent_expected_row_version: parentExpected, values }),
    }), new URL('http://forum.test/api/actions/forum.answers.create'));

    const configResponse = await api(new Request('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001', {
      headers: { Authorization: 'Bearer test-token' },
    }), new URL('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001'));
    expect(configResponse.status).toBe(200);
    const config = await configResponse.json() as any;
    const addAction = config.actions.find((action: any) => action.id === 'add_forum_answer');
    expect(addAction.fields.map((field: any) => field.field)).toEqual(['content']);

    const created = await actionRequest({ content: 'Created without a client author.', author_name: 'Spoofed browser author' });
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({ author_name: 'Forum Browser User', state: 'Active' });
    user.permissions.splice(user.permissions.indexOf('forum.write'), 1);
    await expect(actionRequest({ content: 'Permission denied' }, 2)).rejects.toMatchObject({ status: 403 });
    user.permissions.push('forum.write');
    const reloaded = await api(new Request('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001', {
      headers: { Authorization: 'Bearer test-token' },
    }), new URL('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001'));
    expect((await reloaded.json()).datasources.find((source: any) => source.id === 'forum_post_answers').data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ content: 'Created without a client author.', author_name: 'Forum Browser User' })]));
    database.close();
  });

  test('keeps authenticated author, parent relation, stale versions, and atomic writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_moderation', ['schema', 'data']);
    const add = actions().find((action: any) => action.id === 'add_forum_answer');
    const edit = actions().find((action: any) => action.id === 'edit_forum_answer');
    const accept = actions().find((action: any) => action.id === 'accept_forum_answer');
    const unaccept = actions().find((action: any) => action.id === 'unaccept_forum_answer');
    const flag = actions().find((action: any) => action.id === 'flag_forum_answer');
    expect(add.permission).toBe('forum.write');
    expect(edit.permission).toBe('forum.write');
    expect(accept.permission).toBe('forum.manage');
    expect(unaccept.permission).toBe('forum.manage');
    expect(flag.permission).toBe('forum.manage');

    const answer = await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 1,
      current_user_name: 'Forum Participant',
      values: { content: 'Use a focused integration test.', author_name: 'Spoofed form author' },
    });
    expect(answer).toMatchObject({ id: 'forum-answer-qa-001', post_id: 'forum-post-demo-001', author_name: 'Forum Participant', state: 'Active', row_version: 1 });
    expect((await repository.query('SELECT answer_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ answer_count: 3, row_version: 2 });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Another User', values: { content: 'Spoofed edit' },
    })).rejects.toMatchObject({ status: 403, code: 'FORUM_ANSWER_FORBIDDEN' });
    expect((await repository.query('SELECT content, row_version FROM forum_answers WHERE id = ?', ['forum-answer-qa-001']))[0]).toEqual({ content: 'Use a focused integration test.', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Forum Participant', values: { content: 'Use a focused authenticated integration test.' },
    });
    expect(edited).toMatchObject({ content: 'Use a focused authenticated integration test.', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Forum Participant', values: { content: 'Stale edit' },
    })).rejects.toMatchObject({ status: 409 });

    await expect(repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-invalid', parent_expected_row_version: 3,
      current_user_name: 'Forum Participant', values: { content: 'Wrong relation', author_name: 'Spoofed author', forum_id: 'wrong-forum' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_ANSWER_RELATION_INVALID' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM forum_answers WHERE id = ?', ['forum-answer-invalid']))[0].count).toBe(0);

    const accepted = await repository.executeMutation(accept.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 3, expected_row_version: 2,
    });
    expect(accepted).toMatchObject({ state: 'Accepted', row_version: 3 });
    await expect(repository.executeMutation(flag.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 4, expected_row_version: 3,
    })).rejects.toMatchObject({ status: 409 });

    const second = await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-002', parent_expected_row_version: 4,
      current_user_name: 'Forum Participant', values: { content: 'A second answer to flag.', author_name: 'Spoofed author' },
    });
    expect(second).toMatchObject({ author_name: 'Forum Participant', state: 'Active', row_version: 1 });
    const flagged = await repository.executeMutation(flag.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-002', parent_expected_row_version: 5, expected_row_version: 1,
    });
    expect(flagged).toMatchObject({ state: 'Flagged', row_version: 2 });
    expect((await repository.query('SELECT state FROM forum_answers WHERE id = ?', ['forum-answer-qa-002']))[0]).toEqual({ state: 'Flagged' });
    database.close();
  });

  test('unaccepts an accepted answer atomically and rejects replay or stale parent versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_unaccept', ['schema', 'data']);
    const add = actions().find((action: any) => action.id === 'add_forum_answer');
    const accept = actions().find((action: any) => action.id === 'accept_forum_answer');
    const unaccept = actions().find((action: any) => action.id === 'unaccept_forum_answer');

    await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-unaccept-001', parent_expected_row_version: 1,
      current_user_name: 'Forum Manager', values: { content: 'A reversible accepted answer.' },
    });
    await repository.executeMutation(accept.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-unaccept-001', parent_expected_row_version: 2, expected_row_version: 1,
    });
    const reopened = await repository.executeMutation(unaccept.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-unaccept-001', parent_expected_row_version: 3, expected_row_version: 2,
    });
    expect(reopened).toMatchObject({ state: 'Active', row_version: 3 });
    expect((await repository.query('SELECT state, row_version FROM forum_answers WHERE id = ?', ['forum-answer-unaccept-001']))[0])
      .toEqual({ state: 'Active', row_version: 3 });
    expect((await repository.query('SELECT row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ row_version: 4 });
    await expect(repository.executeMutation(unaccept.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-unaccept-001', parent_expected_row_version: 3, expected_row_version: 3,
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_POST_STALE' });
    expect((await repository.query('SELECT state, row_version FROM forum_answers WHERE id = ?', ['forum-answer-unaccept-001']))[0])
      .toEqual({ state: 'Active', row_version: 3 });
    database.close();
  });

  test('preserves answer moderation across a file-backed restart, reverses acceptance, and rejects replay', async () => {
    const databasePath = `/tmp/core3-forum-answer-moderation-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_answer_moderation_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const add = actions().find((action: any) => action.id === 'add_forum_answer');
    const accept = actions().find((action: any) => action.id === 'accept_forum_answer');
    const unaccept = actions().find((action: any) => action.id === 'unaccept_forum_answer');

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    const answer = await firstRepository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001',
      line_id: 'forum-answer-restart-001',
      parent_expected_row_version: 1,
      current_user_name: 'Forum Moderator',
      values: { content: 'This answer must survive a process restart.', author_name: 'Spoofed author' },
    });
    expect(answer).toMatchObject({ id: 'forum-answer-restart-001', author_name: 'Forum Moderator', state: 'Active', row_version: 1 });

    const accepted = await firstRepository.executeMutation(accept.mutation, {
      id: 'forum-post-demo-001',
      line_id: 'forum-answer-restart-001',
      parent_expected_row_version: 2,
      expected_row_version: 1,
    });
    expect(accepted).toMatchObject({ id: 'forum-answer-restart-001', state: 'Accepted', row_version: 2 });
    expect((await firstRepository.query('SELECT answer_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ answer_count: 3, row_version: 3 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT content, author_name, state, row_version FROM forum_answers WHERE id = ?', ['forum-answer-restart-001']))[0])
      .toEqual({ content: 'This answer must survive a process restart.', author_name: 'Forum Moderator', state: 'Accepted', row_version: 2 });
    expect((await secondRepository.query('SELECT answer_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ answer_count: 3, row_version: 3 });

    const unaccepted = await secondRepository.executeMutation(unaccept.mutation, {
      id: 'forum-post-demo-001',
      line_id: 'forum-answer-restart-001',
      parent_expected_row_version: 3,
      expected_row_version: 2,
    });
    expect(unaccepted).toMatchObject({ id: 'forum-answer-restart-001', state: 'Active', row_version: 3 });
    expect((await secondRepository.query('SELECT state, row_version FROM forum_answers WHERE id = ?', ['forum-answer-restart-001']))[0])
      .toEqual({ state: 'Active', row_version: 3 });
    expect((await secondRepository.query('SELECT row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ row_version: 4 });
    await expect(secondRepository.executeMutation(unaccept.mutation, {
      id: 'forum-post-demo-001',
      line_id: 'forum-answer-restart-001',
      parent_expected_row_version: 4,
      expected_row_version: 3,
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_ANSWER_STALE' });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('binds parent versions for live authenticated accept, unaccept, and flag actions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_moderation_http', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-live-moderator', email: 'live-moderator@workspace.example', name: 'Live Forum Moderator', permissions: ['forum.read', 'forum.write', 'forum.manage'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('forum')?.config || {},
      uploadRoot: '/tmp/core3-forum-answer-moderation-http', eventStore: {}, topics: {},
    });
    const request = (action: string, body: Record<string, unknown>) => api(new Request(`http://forum.test/api/actions/${action}`, {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), new URL(`http://forum.test/api/actions/${action}`));
    const create = (id: string, parentExpected: number) => request('forum.answers.create', {
      id: 'forum-post-demo-001', line_id: id, parent_expected_row_version: parentExpected,
      values: { content: `Live answer ${id}`, author_name: 'Spoofed browser author' },
    });
    const moderate = (action: 'accept' | 'unaccept' | 'flag', lineId: string, parentExpected: number, expected: number) => request(`forum.answers.${action}`, {
      id: 'forum-post-demo-001', line_id: lineId, parent_expected_row_version: parentExpected, expected_row_version: expected, values: {},
    });

    const configResponse = await api(new Request('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001', {
      headers: { Authorization: 'Bearer test-token' },
    }), new URL('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001'));
    const config = await configResponse.json() as any;
    expect(config.actions.find((action: any) => action.id === 'accept_forum_answer').params)
      .toMatchObject({ parent_expected_row_version: '{state.forum_post_detail.row_version}', expected_row_version: '{row.row_version}' });
    expect(config.actions.find((action: any) => action.id === 'flag_forum_answer').params)
      .toMatchObject({ parent_expected_row_version: '{state.forum_post_detail.row_version}', expected_row_version: '{row.row_version}' });
    expect(config.actions.find((action: any) => action.id === 'unaccept_forum_answer').params)
      .toMatchObject({ parent_expected_row_version: '{state.forum_post_detail.row_version}', expected_row_version: '{row.row_version}' });

    const first = await (await create('forum-answer-live-accept', 1)).json() as any;
    const second = await (await create('forum-answer-live-flag', 2)).json() as any;
    expect(first).toMatchObject({ state: 'Active', author_name: 'Live Forum Moderator', row_version: 1 });
    expect(second).toMatchObject({ state: 'Active', author_name: 'Live Forum Moderator', row_version: 1 });

    const accepted = await (await moderate('accept', first.id, 3, first.row_version)).json() as any;
    expect(accepted).toMatchObject({ id: first.id, state: 'Accepted', row_version: 2 });
    expect((await repository.query('SELECT row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ row_version: 4 });

    const unaccepted = await (await moderate('unaccept', first.id, 4, accepted.row_version)).json() as any;
    expect(unaccepted).toMatchObject({ id: first.id, state: 'Active', row_version: 3 });
    expect((await repository.query('SELECT row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ row_version: 5 });

    await expect(moderate('flag', second.id, 3, second.row_version)).rejects.toMatchObject({ status: 409, code: 'FORUM_POST_STALE' });
    expect((await repository.query('SELECT state, row_version FROM forum_answers WHERE id = ?', [second.id]))[0]).toEqual({ state: 'Active', row_version: 1 });
    expect((await repository.query('SELECT row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ row_version: 5 });

    const flagged = await (await moderate('flag', second.id, 5, second.row_version)).json() as any;
    expect(flagged).toMatchObject({ id: second.id, state: 'Flagged', row_version: 2 });
    user.permissions.splice(user.permissions.indexOf('forum.manage'), 1);
    await expect(moderate('flag', second.id, 5, flagged.row_version)).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT state, row_version FROM forum_answers WHERE id = ?', [second.id]))[0]).toEqual({ state: 'Flagged', row_version: 2 });

    const reloaded = await api(new Request('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001', {
      headers: { Authorization: 'Bearer test-token' },
    }), new URL('http://forum.test/api/pages/forum-question-detail?id=forum-post-demo-001'));
    expect((await reloaded.json()).datasources.find((source: any) => source.id === 'forum_post_answers').data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id, state: 'Active' }), expect.objectContaining({ id: second.id, state: 'Flagged' })]));
    database.close();
  });
});
