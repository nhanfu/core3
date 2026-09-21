import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverForumPages } from './forum_test_support';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Forum Posts website-content slice', () => {
  test('keeps the Odoo Forum Posts action trace and page/API separation', () => {
    const discovered = discoverForumPages();
    const page = yaml('pages/forum-post-pages.yaml');
    const api = yaml('api/forum-post-pages.yaml');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'forum-post-pages', route: '/forum-post-pages', auth: { require: ['forum.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list).toMatchObject({ source: 'forum_post_pages', view_navigation: 'tabs', default_filters: { content_scope: 'posts' }, empty_state: { title: 'No forum posts found' } });
    expect(list.views.map((view: any) => view.label)).toEqual(['List', 'Kanban', 'Graph']);
    expect(api.page.id).toBe('forum-post-pages');
    expect(discovered.pageDatasources.get('forum-post-pages')).toEqual(['forum_post_page_states', 'forum_post_pages']);
    expect(api.actions[0]).toMatchObject({ id: 'open_forum_post_page', permission: 'forum.read', navigate_to: '/forum-question-detail' });
  });

  test('supports permissioned post editing with persistence and optimistic guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_edit_test_migrations', ['schema', 'data']);
    const list = yaml('pages/questions.yaml');
    const detail = yaml('api/question-detail.yaml');
    const detailPage = yaml('pages/question-detail.yaml');
    const edit = list.actions.find((action: any) => action.id === 'edit_forum_post');

    expect(edit).toMatchObject({ type: 'server_form', permission: 'forum.write', operation: 'update', handler: 'yaml_mutation', prefill: 'row' });
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(detail.page.id).toBe(detailPage.page.id);
    expect(detail.actions.find((action: any) => action.id === 'edit_forum_post_detail')).toMatchObject({
      type: 'server_form', permission: 'forum.write', operation: 'update', prefill: 'state.forum_post_detail',
    });
    expect(edit.mutation).toMatchObject({
      operation: 'update', table: 'forum_posts', fields: ['title', 'content', 'tags'], required: ['title'], concurrency: { required: true },
    });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001',
      expected_row_version: 1,
      values: { title: 'How do I add a new YAML service safely?', content: 'Updated moderator guidance.', tags: 'yaml,services,moderation' },
    });
    expect(updated).toMatchObject({ id: 'forum-post-demo-001', title: 'How do I add a new YAML service safely?', content: 'Updated moderator guidance.', row_version: 2 });
    expect((await repository.query('SELECT title, content, tags, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({
      title: 'How do I add a new YAML service safely?', content: 'Updated moderator guidance.', tags: 'yaml,services,moderation', row_version: 2,
    });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', expected_row_version: 1, values: { title: 'Stale edit' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', expected_row_version: 2, values: { title: '   ' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_POST_TITLE_REQUIRED' });

    const archive = yaml('pages/forum-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'archive');
    expect(archive).toMatchObject({ permission: 'forum.manage', from: ['Active', 'Closed', 'Flagged'], to: 'Archived' });
    await repository.executeMutation(archive.mutation, {
      id: 'forum-post-demo-001', expected_row_version: 2,
    });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', expected_row_version: 3, values: { title: 'Archived edit' },
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_POST_ARCHIVED' });
    database.close();
  });

  test('supports deterministic populated, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_pages_schema_migrations', ['schema', 'data']);
    const source = yaml('api/forum-post-pages.yaml').datasources[1];
    const states = yaml('api/forum-post-pages.yaml').datasources[0];
    const params = { q: null, state: null, content_scope: 'posts', fixture_state: null };

    expect((await repository.querySource(states, {})).data).toEqual([
      { value: 'Active', label: 'Active' },
      { value: 'Closed', label: 'Closed' },
      { value: 'Flagged', label: 'Flagged' },
      { value: 'Archived', label: 'Archived' },
    ]);
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.title)).toEqual(['Migration ordering across services', 'How do I add a new YAML service?']);
    expect(populated.data[0]).toMatchObject({ forum_name: 'Core3 Platform Q&A', answer_count: 0, is_seo_optimized: true });
    expect((await repository.querySource(source, { ...params, q: 'yaml' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'FORUM_POST_PAGES_UNAVAILABLE' });
    database.close();
  });

  test('creates a question atomically and keeps forum totals consistent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_create_test_migrations', ['schema', 'data']);
    const create = yaml('pages/questions.yaml').actions.find((action: any) => action.id === 'create_forum_post');

    expect(create).toMatchObject({ type: 'server_form', permission: 'forum.write', operation: 'create', handler: 'yaml_mutation' });
    expect(create.mutation.steps).toHaveLength(1);
    expect(await repository.executeMutation(create.mutation, {
      id: 'forum-post-create-qa',
      values: {
        forum_id: 'forum-demo-001', forum_name: 'Core3 Platform Q&A', title: 'How do I test a Forum mutation?',
        content: 'Use the isolated DuckDB fixture.', author_name: 'Forum QA', tags: 'testing,yaml',
      },
    })).toMatchObject({ id: 'forum-post-create-qa', title: 'How do I test a Forum mutation?', row_version: 1 });
    expect((await repository.query('SELECT forum_name, title, tags, state FROM forum_posts WHERE id = ?', ['forum-post-create-qa']))[0]).toEqual({
      forum_name: 'Core3 Platform Q&A', title: 'How do I test a Forum mutation?', tags: 'testing,yaml', state: 'Active',
    });
    expect((await repository.query('SELECT total_posts FROM forum_forums WHERE id = ?', ['forum-demo-001']))[0]).toEqual({ total_posts: 3 });
    await expect(repository.executeMutation(create.mutation, {
      id: 'forum-post-invalid-forum',
      values: { forum_id: 'forum-demo-001', forum_name: 'Spoofed Forum', title: 'Should be rejected' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_NAME_MISMATCH' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM forum_posts WHERE id = ?', ['forum-post-invalid-forum']))[0].count).toBe(0);
    database.close();
  });

  test('executes the post close/reopen lifecycle with persisted versions and guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_lifecycle_test', ['schema', 'data']);
    const discovered = discoverForumPages();
    const user = { sub: 'forum-moderator', email: 'moderator@workspace.example', name: 'Forum Moderator', permissions: ['forum.read', 'forum.write'] };
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
      uploadRoot: '/tmp/core3-forum-test-uploads', eventStore: {}, topics: {},
    });
    const transition = (name: string, expectedRowVersion?: number) => api(new Request(`http://forum.test/api/actions/forum.posts.${name}`, {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-001', expected_row_version: expectedRowVersion, values: {} }),
    }), new URL(`http://forum.test/api/actions/forum.posts.${name}`));

    expect((await (await transition('close')).json())).toMatchObject({ id: 'forum-post-demo-001', state: 'Closed', row_version: 2 });
    expect((await repository.query('SELECT state, closed_reason, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ state: 'Closed', closed_reason: 'Closed by moderator', row_version: 2 });
    await expect(transition('close')).rejects.toMatchObject({ status: 409 });
    expect((await (await transition('reopen')).json())).toMatchObject({ id: 'forum-post-demo-001', state: 'Active', row_version: 3 });
    expect((await repository.query('SELECT state, closed_reason, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ state: 'Active', closed_reason: null, row_version: 3 });
    await expect(transition('reopen')).rejects.toMatchObject({ status: 409 });
    await expect(transition('archive', 3)).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT state, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ state: 'Active', row_version: 3 });
    user.permissions.push('forum.manage');
    expect((await (await transition('archive', 3)).json())).toMatchObject({ id: 'forum-post-demo-001', state: 'Archived', row_version: 4 });
    await expect(transition('archive', 4)).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
