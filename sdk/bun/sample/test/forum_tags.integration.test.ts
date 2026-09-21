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

describe('Forum Tags action', () => {
  test('keeps the Odoo list/form contract in the API layer joined by page id', () => {
    const page = yaml('pages/tags.yaml');
    const api = yaml('api/tags.yaml');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'forum-tags', route: '/forum-tags', auth: { require: ['forum.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list).toMatchObject({ source: 'forum_tags', create_action: 'create_forum_tag', row_open_action: 'edit_forum_tag' });
    expect(list.columns.map((column: any) => column.field)).toEqual(['name', 'forum_name', 'post_count', 'color', 'id']);
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(['forum_tag_lookup', 'forum_tags']);
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_forum_tag', permission: 'forum.write' }),
      expect.objectContaining({ id: 'edit_forum_tag', permission: 'forum.write' }),
    ]));
    expect(api.actions.find((action: any) => action.id === 'edit_forum_tag').mutation).toMatchObject({
      operation: 'update', table: 'forum_tags', concurrency: { required: true },
    });
  });

  test('lists tags by exact post token, search, and explicit transport state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_tags_list', ['schema', 'data']);
    const source = yaml('api/tags.yaml').datasources.find((item: any) => item.id === 'forum_tags');

    const rows = await repository.querySource(source, { q: null }, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'yaml', forum_name: 'Core3 Platform Q&A', post_count: 1 }),
      expect.objectContaining({ name: 'migrations', post_count: 1 }),
    ]));
    expect((await repository.querySource(source, { q: 'yaml' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['yaml']);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'FORUM_TAGS_UNAVAILABLE' });
    database.close();
  });

  test('creates and edits a durable tag with forum uniqueness, relation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_tags_mutation', ['schema', 'data']);
    const api = yaml('api/tags.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_forum_tag');
    const edit = api.actions.find((action: any) => action.id === 'edit_forum_tag');

    const created = await repository.executeMutation(create.mutation, {
      values: { forum_id: 'forum-demo-001', name: 'support', color: 4 },
    });
    expect(created).toMatchObject({ forum_id: 'forum-demo-001', forum_name: 'Core3 Platform Q&A', name: 'support', color: 4, row_version: 1 });
    expect((await repository.query('SELECT forum_id, forum_name, name, color FROM forum_tags WHERE id = ?', [created.id]))[0])
      .toEqual({ forum_id: 'forum-demo-001', forum_name: 'Core3 Platform Q&A', name: 'support', color: 4 });

    const renamed = await repository.executeMutation(edit.mutation, {
      id: 'forum-tag-demo-001', expected_row_version: 1,
      values: { forum_id: 'forum-demo-001', name: 'yaml-core', color: 7 },
    });
    expect(renamed).toMatchObject({ name: 'yaml-core', color: 7, row_version: 2 });
    expect((await repository.query('SELECT tags FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ tags: 'yaml-core,services' });

    await expect(repository.executeMutation(create.mutation, {
      values: { forum_id: 'forum-demo-001', name: ' YAML-CORE ' },
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_TAG_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-tag-demo-001', expected_row_version: 1,
      values: { forum_id: 'forum-demo-001', name: 'stale' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-tag-demo-001', expected_row_version: 2,
      values: { forum_id: 'forum-demo-001', name: '  ' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_TAG_NAME_REQUIRED' });
    database.close();
  });

  test('enforces forum.write and preserves a created tag through restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_tags_http', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-tag-user', email: 'forum-tag@workspace.example', name: 'Forum Tag User', permissions: ['forum.read'] };
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
      uploadRoot: '/tmp/core3-forum-tags-http', eventStore: {}, topics: {},
    });
    const request = () => api(new Request('http://forum.test/api/actions/forum.tags.create', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { forum_id: 'forum-demo-001', name: 'permission-safe' } }),
    }), new URL('http://forum.test/api/actions/forum.tags.create'));

    await expect(request()).rejects.toMatchObject({ status: 403 });
    user.permissions.push('forum.write');
    expect(await (await request()).json()).toMatchObject({ name: 'permission-safe', forum_name: 'Core3 Platform Q&A' });
    database.close();

    const databasePath = `/tmp/core3-forum-tags-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_tags_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const create = yaml('api/tags.yaml').actions.find((action: any) => action.id === 'create_forum_tag');
    const created = await firstRepository.executeMutation(create.mutation, { values: { forum_id: 'forum-demo-001', name: 'restart-safe', color: 9 } });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, forum_name, color, row_version FROM forum_tags WHERE id = ?', [created.id]))[0])
      .toEqual({ name: 'restart-safe', forum_name: 'Core3 Platform Q&A', color: 9, row_version: 1 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
