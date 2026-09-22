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
const favoriteAction = () => yaml('api/question-detail.yaml').actions.find((action: any) => action.id === 'toggle_forum_post_favorite');

describe('Forum question favorite action', () => {
  test('keeps the detail page/API join and Odoo toggle_favourite contract', async () => {
    const discovered = discoverForumPages();
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const action = favoriteAction();

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources[0].query).toContain('forum_post_favorites');
    expect(api.actions.find((item: any) => item.id === action.id)).toMatchObject({
      permission: 'forum.read', action: 'forum.posts.toggle_favourite', refresh: ['forum_post_detail'],
    });
    expect(discovered.pageDatasources.get('forum-question-detail')).toEqual(['forum_post_detail', 'forum_post_answers']);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_favorite_contract', ['schema', 'data']);
    const detail = await repository.querySource(api.datasources[0], { id: 'forum-post-demo-001', current_user_id: 'favorite-reader' });
    expect(detail.data).toMatchObject({ id: 'forum-post-demo-001', favourite_count: 0, is_favorite: false });
    database.close();
  });

  test('toggles one user favorite, keeps counts per question, and rejects stale or invalid actors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_favorite_mutation', ['schema', 'data']);
    const mutation = favoriteAction().mutation;

    const first = await repository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'favorite-user-a',
    });
    expect(first).toMatchObject({ id: 'forum-post-demo-001', is_favorite: true, favourite_count: 1, row_version: 2 });
    const second = await repository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 2, current_user_id: 'favorite-user-b',
    });
    expect(second).toMatchObject({ is_favorite: true, favourite_count: 2, row_version: 3 });
    const removed = await repository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 3, current_user_id: 'favorite-user-a',
    });
    expect(removed).toMatchObject({ is_favorite: false, favourite_count: 1, row_version: 4 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM forum_post_favorites WHERE post_id = ?', ['forum-post-demo-001']))[0]).toEqual({ count: 1 });

    await expect(repository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 3, current_user_id: 'favorite-user-b',
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_FAVORITE_STALE' });
    await expect(repository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 4, current_user_id: '',
    })).rejects.toMatchObject({ status: 403, code: 'FORUM_FAVORITE_ACTOR' });
    database.close();
  });

  test('does not favorite archived questions and preserves the relation across restart', async () => {
    const databasePath = `/tmp/core3-forum-question-favorite-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_question_favorite_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const mutation = favoriteAction().mutation;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 1, current_user_id: 'favorite-restart-user',
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT post_id, user_id FROM forum_post_favorites WHERE post_id = ?', ['forum-post-demo-001']))[0])
      .toEqual({ post_id: 'forum-post-demo-001', user_id: 'favorite-restart-user' });
    const unarchive = yaml('pages/forum-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'archive');
    await secondRepository.executeMutation(unarchive.mutation, { id: 'forum-post-demo-001', expected_row_version: 2 });
    await expect(secondRepository.executeMutation(mutation, {
      id: 'forum-post-demo-001', expected_row_version: 3, current_user_id: 'favorite-restart-user',
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_FAVORITE_UNAVAILABLE' });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces forum.read at the authenticated action boundary and reloads favorite state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_question_favorite_http', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-favorite-http-user', email: 'favorite@workspace.example', name: 'Favorite Reader', permissions: ['forum.read'] };
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
      uploadRoot: '/tmp/core3-forum-question-favorite-http', eventStore: {}, topics: {},
    });
    const request = (path: string, body?: Record<string, unknown>) => api(new Request(`http://forum.test${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer test-token', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), new URL(`http://forum.test${path}`));

    const toggled = await request('/api/actions/forum.posts.toggle_favourite', { id: 'forum-post-demo-001', expected_row_version: 1 });
    expect(toggled.status).toBe(200);
    expect(await toggled.json()).toMatchObject({ is_favorite: true, favourite_count: 1, row_version: 2 });
    const reloaded = await request('/api/pages/forum-question-detail?id=forum-post-demo-001');
    expect((await reloaded.json()).datasources.find((source: any) => source.id === 'forum_post_detail').data)
      .toMatchObject({ is_favorite: true, favourite_count: 1, row_version: 2 });
    user.permissions = [];
    await expect(request('/api/actions/forum.posts.toggle_favourite', { id: 'forum-post-demo-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 403 });
    database.close();
  });
});
