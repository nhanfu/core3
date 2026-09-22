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
const upvoteAction = () => yaml('api/question-detail.yaml').actions.find((action: any) => action.id === 'upvote_forum_post');

describe('Forum question upvote action', () => {
  test('keeps the page/API join and Odoo upvote contract', async () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const action = upvoteAction();
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources[0].query).toContain('forum_post_votes');
    expect(api.actions.find((item: any) => item.id === action.id)).toMatchObject({
      permission: 'forum.read', action: 'forum.posts.upvote', refresh: ['forum_post_detail'],
    });
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_vote_contract', ['schema', 'data']);
    expect((await repository.querySource(api.datasources[0], { id: 'forum-post-demo-001', current_user_id: 'vote-reader' })).data)
      .toMatchObject({ id: 'forum-post-demo-001', vote_count: 5, user_vote: 0 });
    database.close();
  });

  test('toggles one user upvote, updates the aggregate, and rejects own or stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_vote_mutation', ['schema', 'data']);
    const mutation = upvoteAction().mutation;
    const base = { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'vote-user-a', current_user_name: 'Forum Participant' };
    expect(await repository.executeMutation(mutation, base)).toMatchObject({ vote_count: 6, user_vote: 1, row_version: 2 });
    expect(await repository.executeMutation(mutation, { ...base, expected_row_version: 2 })).toMatchObject({ vote_count: 5, user_vote: 0, row_version: 3 });
    expect(await repository.executeMutation(mutation, { ...base, current_user_id: 'vote-user-b', expected_row_version: 3 })).toMatchObject({ vote_count: 6, user_vote: 1, row_version: 4 });
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'FORUM_VOTE_STALE' });
    await expect(repository.executeMutation(mutation, { ...base, current_user_name: 'Developer A', expected_row_version: 4 })).rejects.toMatchObject({ status: 403, code: 'FORUM_VOTE_OWN_POST' });
    expect((await repository.query('SELECT vote_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ vote_count: 6, row_version: 4 });
    database.close();
  });

  test('rejects missing actors and archived questions without partial persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_vote_guards', ['schema', 'data']);
    const mutation = upvoteAction().mutation;
    await expect(repository.executeMutation(mutation, { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: '', current_user_name: '' }))
      .rejects.toMatchObject({ status: 403, code: 'FORUM_VOTE_ACTOR' });
    const archive = yaml('pages/forum-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'archive');
    await repository.executeMutation(archive.mutation, { id: 'forum-post-demo-001', expected_row_version: 1 });
    await expect(repository.executeMutation(mutation, { id: 'forum-post-demo-001', expected_row_version: 2, current_user_id: 'vote-user', current_user_name: 'Forum Participant' }))
      .rejects.toMatchObject({ status: 409, code: 'FORUM_VOTE_UNAVAILABLE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM forum_post_votes')).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves the vote across restart and enforces forum.read at HTTP action boundary', async () => {
    const databasePath = `/tmp/core3-forum-question-vote-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_question_vote_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(upvoteAction().mutation, { id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'vote-restart-user', current_user_name: 'Forum Participant' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT post_id, user_id, vote FROM forum_post_votes WHERE post_id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ post_id: 'forum-post-demo-001', user_id: 'vote-restart-user', vote: 1 });
    const discovered = discoverForumPages();
    const user = { sub: 'forum-vote-http-user', email: 'vote@workspace.example', name: 'Forum Participant', permissions: ['forum.read'] };
    const api = createYamlApi({
      repository: secondRepository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs, menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('forum')?.config || {}, uploadRoot: '/tmp/core3-forum-question-vote-http', eventStore: {}, topics: {},
    });
    const response = await api(new Request('http://forum.test/api/actions/forum.posts.upvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-002', expected_row_version: 1 }),
    }), new URL('http://forum.test/api/actions/forum.posts.upvote'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'forum-post-demo-002', user_vote: 1, vote_count: 3, row_version: 2 });
    user.permissions = [];
    await expect(api(new Request('http://forum.test/api/actions/forum.posts.upvote', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-002', expected_row_version: 2 }),
    }), new URL('http://forum.test/api/actions/forum.posts.upvote'))).rejects.toMatchObject({ status: 403 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
