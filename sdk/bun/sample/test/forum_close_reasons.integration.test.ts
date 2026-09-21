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

describe('Forum Post Close Reasons action', () => {
  test('keeps the Odoo editable-list contract in the API layer joined by page id', () => {
    const page = yaml('pages/close-reasons.yaml');
    const api = yaml('api/close-reasons.yaml');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'forum-close-reasons', route: '/forum-close-reasons', auth: { require: ['forum.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list).toMatchObject({ source: 'forum_close_reasons', create_action: 'create_forum_close_reason', row_open_action: 'edit_forum_close_reason' });
    expect(list.columns.map((column: any) => column.field)).toEqual(['name', 'reason_type', 'id']);
    expect(list.inline_edit.fields.map((field: any) => field.field)).toEqual(['name', 'reason_type']);
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources[0].id).toBe('forum_close_reasons');
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_forum_close_reason', permission: 'forum.manage' }),
      expect.objectContaining({ id: 'edit_forum_close_reason', permission: 'forum.manage' }),
      expect.objectContaining({ id: 'delete_forum_close_reason', permission: 'forum.manage' }),
    ]));
  });

  test('lists deterministic Odoo reasons, supports search, empty state, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_close_reasons_list', ['schema', 'data']);
    const source = yaml('api/close-reasons.yaml').datasources[0];

    const rows = await repository.querySource(source, { q: null }, 0, 50);
    expect(rows.data).toHaveLength(13);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Duplicate post', reason_type: 'basic' }),
      expect.objectContaining({ name: 'Racist and hate speech', reason_type: 'offensive' }),
    ]));
    expect((await repository.querySource(source, { q: 'Racist' }, 0, 50)).data).toEqual([
      expect.objectContaining({ name: 'Racist and hate speech', reason_type: 'offensive' }),
    ]);
    expect((await repository.querySource(source, { q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'FORUM_CLOSE_REASONS_UNAVAILABLE' });
    database.close();
  });

  test('creates, edits, deletes, validates, and rejects stale close reasons', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_close_reasons_mutation', ['schema', 'data']);
    const api = yaml('api/close-reasons.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_forum_close_reason');
    const edit = api.actions.find((action: any) => action.id === 'edit_forum_close_reason');
    const remove = api.actions.find((action: any) => action.id === 'delete_forum_close_reason');

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Needs more detail', reason_type: 'basic' } });
    expect(created).toMatchObject({ name: 'Needs more detail', reason_type: 'basic', row_version: 1 });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Needs more detail', reason_type: 'offensive' } });
    expect(edited).toMatchObject({ name: 'Needs more detail', reason_type: 'offensive', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', reason_type: 'basic' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: '  ', reason_type: 'basic' } }))
      .rejects.toMatchObject({ status: 422, code: 'FORUM_CLOSE_REASON_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad type', reason_type: 'unknown' } }))
      .rejects.toMatchObject({ status: 422, code: 'FORUM_CLOSE_REASON_TYPE_INVALID' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 404, code: 'FORUM_CLOSE_REASON_NOT_FOUND' });
    database.close();
  });

  test('enforces forum.manage at the action boundary and persists across restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_close_reasons_http', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-close-reason-user', email: 'forum-close-reason@workspace.example', name: 'Forum Close Reason User', permissions: ['forum.read'] };
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
      uploadRoot: '/tmp/core3-forum-close-reasons-http', eventStore: {}, topics: {},
    });
    const request = () => api(new Request('http://forum.test/api/actions/forum.close_reasons.create', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { name: 'Authenticated reason', reason_type: 'basic' } }),
    }), new URL('http://forum.test/api/actions/forum.close_reasons.create'));
    await expect(request()).rejects.toMatchObject({ status: 403 });
    user.permissions.push('forum.manage');
    expect(await (await request()).json()).toMatchObject({ name: 'Authenticated reason' });
    database.close();

    const databasePath = `/tmp/core3-forum-close-reasons-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `forum_close_reasons_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const create = yaml('api/close-reasons.yaml').actions.find((action: any) => action.id === 'create_forum_close_reason');
    const created = await firstRepository.executeMutation(create.mutation, { values: { name: 'Restart safe reason', reason_type: 'offensive' } });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, reason_type, row_version FROM forum_post_reasons WHERE id = ?', [created.id]))[0])
      .toEqual({ name: 'Restart safe reason', reason_type: 'offensive', row_version: 1 });
    expect((await secondRepository.query('SELECT COUNT(*) AS count FROM forum_post_reasons WHERE id LIKE ?', ['forum-reason-%']))[0].count).toBe(13);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
