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

describe('Forum configuration form', () => {
  test('keeps presentation and API contracts joined by page id', () => {
    const list = yaml('pages/forums.yaml');
    const detail = yaml('pages/forum-detail.yaml');
    const listApi = yaml('api/forums.yaml');
    const detailApi = yaml('api/forum-detail.yaml');

    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(list.components[0]).toMatchObject({ create_action: 'create_forum', row_open_action: 'view_forum' });
    expect(detail.components[0]).toMatchObject({ source: 'forum_detail', title_field: 'name' });
    expect(listApi.page.id).toBe('forum-forums');
    expect(detailApi.page.id).toBe('forum-detail');
    expect(listApi.page.id).toBe(list.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(listApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_forum', permission: 'forum.manage' }),
      expect.objectContaining({ id: 'view_forum', navigate_to: '/forum-detail' }),
    ]));
    expect(detailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'edit_forum', permission: 'forum.manage' }),
    ]));
  });

  test('creates and edits a durable forum with optimistic and relation guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_configuration', ['schema', 'data']);
    const listApi = yaml('api/forums.yaml');
    const detailApi = yaml('api/forum-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_forum');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_forum');

    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'forum_forums', required: ['name'] });
    const created = await repository.executeMutation(create.mutation, {
      values: { name: 'Core3 Product Help', mode: 'Questions', privacy: 'Signed In', description: 'Product support', sequence: 2 },
    });
    expect(created).toMatchObject({ name: 'Core3 Product Help', privacy: 'Signed In', active: true, row_version: 1 });
    expect((await repository.query('SELECT name, mode, privacy, description, sequence, default_order, active FROM forum_forums WHERE id = ?', [created.id]))[0])
      .toEqual({ name: 'Core3 Product Help', mode: 'Questions', privacy: 'Signed In', description: 'Product support', sequence: 2, default_order: 'last_activity_date desc', active: true });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { name: 'Core3 Product Support', mode: 'Discussions', privacy: 'Public', description: 'Updated support', sequence: 3, default_order: 'vote_count desc' },
    });
    expect(edited).toMatchObject({ name: 'Core3 Product Support', mode: 'Discussions', row_version: 2 });
    await repository.executeMutation(edit.mutation, {
      id: 'forum-demo-001',
      expected_row_version: 1,
      values: { name: 'Core3 Platform Q&A Updated', mode: 'Questions', privacy: 'Public', description: 'Updated platform help', sequence: 1, default_order: 'last_activity_date desc' },
    });
    expect((await repository.query('SELECT forum_name FROM forum_posts WHERE forum_id = ?', ['forum-demo-001']))).toEqual(expect.arrayContaining([
      expect.objectContaining({ forum_name: 'Core3 Platform Q&A Updated' }),
    ]));
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, values: { name: 'Stale forum' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 2, values: { name: '   ' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, {
      values: { name: ' core3 platform q&a updated ' },
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_NAME_EXISTS' });
    database.close();
  });

  test('enforces forum.manage at the authenticated action boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_configuration_http', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-config-user', email: 'forum-config@workspace.example', name: 'Forum Config User', permissions: ['forum.read', 'forum.write'] };
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
      uploadRoot: '/tmp/core3-forum-config-http', eventStore: {}, topics: {},
    });
    const request = () => api(new Request('http://forum.test/api/actions/forum.forums.create', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { name: 'Permission Boundary Forum' } }),
    }), new URL('http://forum.test/api/actions/forum.forums.create'));

    await expect(request()).rejects.toMatchObject({ status: 403 });
    user.permissions.push('forum.manage');
    const created = await request();
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({ name: 'Permission Boundary Forum', active: true });
    database.close();
  });

  test('keeps created configuration after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-forum-config-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_configuration_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/forums.yaml').actions.find((action: any) => action.id === 'create_forum');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(create.mutation, {
      values: { name: 'Restarted Forum', mode: 'Discussions', privacy: 'Public', description: 'Survives restart', sequence: 4 },
    });
    expect(created).toMatchObject({ name: 'Restarted Forum', row_version: 1 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, mode, description, sequence, row_version FROM forum_forums WHERE id = ?', [created.id]))[0])
      .toEqual({ name: 'Restarted Forum', mode: 'Discussions', description: 'Survives restart', sequence: 4, row_version: 1 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
