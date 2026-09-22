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
const downvoteAction = () => yaml('api/question-detail.yaml').actions.find((action: any) => action.id === 'downvote_forum_post');

describe('Forum question downvote action', () => {
  test('keeps the page/API join and Odoo downvote contract', async () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const action = downvoteAction();
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.actions.find((item: any) => item.id === action.id)).toMatchObject({
      permission: 'forum.read', action: 'forum.posts.downvote', refresh: ['forum_post_detail'],
    });
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'downvote_forum_post', label: 'Downvote', show_if: 'state.forum_post_detail.user_vote !== -1' }),
      expect.objectContaining({ id: 'downvote_forum_post', label: 'Remove downvote', show_if: 'state.forum_post_detail.user_vote === -1' }),
    ]));
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_downvote_contract', ['schema', 'data']);
    expect((await repository.querySource(api.datasources[0], { id: 'forum-post-demo-001', current_user_id: 'downvote-reader' })).data)
      .toMatchObject({ id: 'forum-post-demo-001', vote_count: 5, user_vote: 0 });
    database.close();
  });

  test('toggles, switches, and aggregates one user downvote with stale and own-post guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_downvote_mutation', ['schema', 'data']);
    const mutation = downvoteAction().mutation;
    const base = { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'downvote-user-a', current_user_name: 'Forum Participant' };
    expect(await repository.executeMutation(mutation, base)).toMatchObject({ vote_count: 4, user_vote: -1, row_version: 2 });
    expect(await repository.executeMutation(mutation, { ...base, expected_row_version: 2 })).toMatchObject({ vote_count: 5, user_vote: 0, row_version: 3 });
    const upvote = yaml('api/question-detail.yaml').actions.find((action: any) => action.id === 'upvote_forum_post').mutation;
    expect(await repository.executeMutation(upvote, { ...base, expected_row_version: 3 })).toMatchObject({ vote_count: 6, user_vote: 1, row_version: 4 });
    expect(await repository.executeMutation(mutation, { ...base, expected_row_version: 4 })).toMatchObject({ vote_count: 4, user_vote: -1, row_version: 5 });
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'FORUM_DOWNVOTE_STALE' });
    await expect(repository.executeMutation(mutation, { ...base, current_user_name: 'Developer A', expected_row_version: 5 })).rejects.toMatchObject({ status: 403, code: 'FORUM_DOWNVOTE_OWN_POST' });
    expect((await repository.query('SELECT vote_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ vote_count: 4, row_version: 5 });
    expect((await repository.query('SELECT vote FROM forum_post_votes WHERE post_id = ? AND user_id = ?', ['forum-post-demo-001', 'downvote-user-a']))[0])
      .toEqual({ vote: -1 });
    database.close();
  });

  test('rejects missing actors and archived questions without partial persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_downvote_guards', ['schema', 'data']);
    const mutation = downvoteAction().mutation;
    await expect(repository.executeMutation(mutation, { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: '', current_user_name: '' }))
      .rejects.toMatchObject({ status: 403, code: 'FORUM_DOWNVOTE_ACTOR' });
    const archive = yaml('pages/forum-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'archive');
    await repository.executeMutation(archive.mutation, { id: 'forum-post-demo-001', expected_row_version: 1 });
    await expect(repository.executeMutation(mutation, { id: 'forum-post-demo-001', expected_row_version: 2, current_user_id: 'downvote-user', current_user_name: 'Forum Participant' }))
      .rejects.toMatchObject({ status: 409, code: 'FORUM_DOWNVOTE_UNAVAILABLE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM forum_post_votes')).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves the downvote across restart and enforces forum.read at HTTP action boundary', async () => {
    const databasePath = `/tmp/core3-forum-question-downvote-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_question_downvote_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(downvoteAction().mutation, { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'downvote-restart-user', current_user_name: 'Forum Participant' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT post_id, user_id, vote FROM forum_post_votes WHERE post_id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ post_id: 'forum-post-demo-001', user_id: 'downvote-restart-user', vote: -1 });
    const discovered = discoverForumPages();
    const user = { sub: 'forum-downvote-http-user', email: 'downvote@workspace.example', name: 'Forum Participant', permissions: ['forum.read'] };
    const api = createYamlApi({
      repository: secondRepository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs, menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('forum')?.config || {}, uploadRoot: '/tmp/core3-forum-question-downvote-http', eventStore: {}, topics: {},
    });
    const response = await api(new Request('http://forum.test/api/actions/forum.posts.downvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-002', expected_row_version: 1 }),
    }), new URL('http://forum.test/api/actions/forum.posts.downvote'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'forum-post-demo-002', user_vote: -1, vote_count: 1, row_version: 2 });
    user.permissions = [];
    await expect(api(new Request('http://forum.test/api/actions/forum.posts.downvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-002', expected_row_version: 2 }),
    }), new URL('http://forum.test/api/actions/forum.posts.downvote'))).rejects.toMatchObject({ status: 403 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
