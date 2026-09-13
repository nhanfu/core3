import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const actions = () => yaml('pages/question-detail.yaml').actions;

describe('Forum answer creation and moderation', () => {
  test('creates through the authenticated HTTP contract and renders the author after reload', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_http_contract', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
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
    const flag = actions().find((action: any) => action.id === 'flag_forum_answer');
    expect(add.permission).toBe('forum.write');
    expect(edit.permission).toBe('forum.write');
    expect(accept.permission).toBe('forum.manage');
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
});
