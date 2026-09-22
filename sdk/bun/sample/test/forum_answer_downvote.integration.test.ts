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

describe('Forum answer downvote action', () => {
  test('binds the page/API action through real Forum discovery', () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const action = actions().find((item: any) => item.id === 'downvote_forum_answer');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(action).toMatchObject({
      permission: 'forum.read', action: 'forum.answers.downvote', refresh: ['forum_post_detail', 'forum_post_answers'],
    });
    const rowActions = page.components[1].children.find((item: any) => item.id === 'forum_answer_actions').actions;
    expect(rowActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'downvote_forum_answer', label: 'Downvote', show_if: 'row.user_vote !== -1' }),
      expect.objectContaining({ id: 'downvote_forum_answer', label: 'Remove downvote', show_if: 'row.user_vote === -1' }),
    ]));
    const discovered = discoverForumPages();
    const discoveredPage = discovered.pages.get('forum-question-detail')?.config;
    expect(discoveredPage?.actions.map((item: any) => item.id)).toContain('downvote_forum_answer');
  });

  test('toggles, switches, and aggregates one answer downvote with stale and own-answer guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_downvote_mutation', ['schema', 'data']);
    const add = actions().find((item: any) => item.id === 'add_forum_answer');
    const downvote = actions().find((item: any) => item.id === 'downvote_forum_answer');
    await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-001', parent_expected_row_version: 1,
      current_user_name: 'Answer Author', values: { content: 'A useful answer' },
    });
    const base = { id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-001', parent_expected_row_version: 2, expected_row_version: 1, current_user_id: 'answer-voter', current_user_name: 'Answer Voter' };
    expect(await repository.executeMutation(downvote.mutation, base)).toMatchObject({ id: 'forum-answer-downvote-001', vote_count: -1, user_vote: -1, row_version: 2 });
    expect(await repository.executeMutation(downvote.mutation, { ...base, parent_expected_row_version: 3, expected_row_version: 2 })).toMatchObject({ vote_count: 0, user_vote: 0, row_version: 3 });
    const upvote = actions().find((item: any) => item.id === 'upvote_forum_answer');
    expect(await repository.executeMutation(upvote.mutation, { ...base, parent_expected_row_version: 4, expected_row_version: 3 })).toMatchObject({ vote_count: 1, user_vote: 1, row_version: 4 });
    expect(await repository.executeMutation(downvote.mutation, { ...base, parent_expected_row_version: 5, expected_row_version: 4 })).toMatchObject({ vote_count: -1, user_vote: -1, row_version: 5 });
    await expect(repository.executeMutation(downvote.mutation, { ...base, parent_expected_row_version: 4, expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'FORUM_POST_STALE' });
    await expect(repository.executeMutation(downvote.mutation, { ...base, parent_expected_row_version: 6, expected_row_version: 5, current_user_name: 'Answer Author' })).rejects.toMatchObject({ status: 403, code: 'FORUM_ANSWER_VOTE_OWN_POST' });
    expect((await repository.query('SELECT vote FROM forum_post_votes WHERE post_id = ? AND user_id = ?', ['forum-answer-downvote-001', 'answer-voter']))[0]).toEqual({ vote: -1 });
    database.close();
  });

  test('rejects missing actors and flagged answers without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_downvote_guards', ['schema', 'data']);
    const add = actions().find((item: any) => item.id === 'add_forum_answer');
    const downvote = actions().find((item: any) => item.id === 'downvote_forum_answer');
    await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-guard-001', parent_expected_row_version: 1,
      current_user_name: 'Answer Author', values: { content: 'Guarded answer' },
    });
    const base = { id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-guard-001', parent_expected_row_version: 2, expected_row_version: 1, current_user_id: '', current_user_name: '' };
    await expect(repository.executeMutation(downvote.mutation, base)).rejects.toMatchObject({ status: 403, code: 'FORUM_ANSWER_VOTE_ACTOR' });
    await repository.query("UPDATE forum_answers SET state = 'Flagged' WHERE id = ?", ['forum-answer-downvote-guard-001']);
    await expect(repository.executeMutation(downvote.mutation, { ...base, current_user_id: 'guard-user', current_user_name: 'Guard User' })).rejects.toMatchObject({ status: 409, code: 'FORUM_ANSWER_VOTE_UNAVAILABLE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM forum_post_votes WHERE post_id = ?', ['forum-answer-downvote-guard-001'])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists the downvote across restart and enforces forum.read at HTTP boundary', async () => {
    const databasePath = `/tmp/core3-forum-answer-downvote-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_answer_downvote_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    const add = actions().find((item: any) => item.id === 'add_forum_answer');
    const downvote = actions().find((item: any) => item.id === 'downvote_forum_answer');
    await firstRepository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-restart-001', parent_expected_row_version: 1,
      current_user_name: 'Restart Author', values: { content: 'This vote survives restart.' },
    });
    await firstRepository.executeMutation(downvote.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-restart-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_id: 'restart-voter', current_user_name: 'Restart Voter',
    });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT post_id, user_id, vote FROM forum_post_votes WHERE post_id = ?', ['forum-answer-downvote-restart-001']))[0]).toEqual({ post_id: 'forum-answer-downvote-restart-001', user_id: 'restart-voter', vote: -1 });
    const discovered = discoverForumPages();
    const user = { sub: 'restart-voter', email: 'answer-downvote@workspace.example', name: 'Restart Voter', permissions: ['forum.read'] };
    const api = createYamlApi({
      repository: secondRepository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs, menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('forum')?.config || {}, uploadRoot: '/tmp/core3-forum-answer-downvote-http', eventStore: {}, topics: {},
    });
    const response = await api(new Request('http://forum.test/api/actions/forum.answers.downvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-restart-001', parent_expected_row_version: 3, expected_row_version: 2 }),
    }), new URL('http://forum.test/api/actions/forum.answers.downvote'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'forum-answer-downvote-restart-001', user_vote: 0, vote_count: 0, row_version: 3 });
    user.permissions = [];
    await expect(api(new Request('http://forum.test/api/actions/forum.answers.downvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-001', line_id: 'forum-answer-downvote-restart-001', parent_expected_row_version: 4, expected_row_version: 3 }),
    }), new URL('http://forum.test/api/actions/forum.answers.downvote'))).rejects.toMatchObject({ status: 403 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
