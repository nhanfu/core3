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

describe('Forum Posts website-content slice', () => {
  test('keeps the Odoo Forum Posts action trace and page/API separation', () => {
    const discovered = discoverPages(join(root, '..'));
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

  test('supports deterministic populated, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_pages_schema_migrations', ['schema', 'data']);
    const source = yaml('api/forum-post-pages.yaml').datasources[1];
    const params = { q: null, state: null, content_scope: 'posts', fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.title)).toEqual(['Migration ordering across services', 'How do I add a new YAML service?']);
    expect(populated.data[0]).toMatchObject({ forum_name: 'Core3 Platform Q&A', answer_count: 0, is_seo_optimized: true });
    expect((await repository.querySource(source, { ...params, q: 'yaml' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'FORUM_POST_PAGES_UNAVAILABLE' });
    database.close();
  });

  test('executes the post close/reopen lifecycle with persisted versions and guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_lifecycle_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
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
    const transition = (name: string) => api(new Request(`http://forum.test/api/actions/forum.posts.${name}`, {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'forum-post-demo-001', values: {} }),
    }), new URL(`http://forum.test/api/actions/forum.posts.${name}`));

    expect((await (await transition('close')).json())).toMatchObject({ id: 'forum-post-demo-001', state: 'Closed', row_version: 2 });
    expect((await repository.query('SELECT state, closed_reason, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ state: 'Closed', closed_reason: 'Closed by moderator', row_version: 2 });
    await expect(transition('close')).rejects.toMatchObject({ status: 409 });
    expect((await (await transition('reopen')).json())).toMatchObject({ id: 'forum-post-demo-001', state: 'Active', row_version: 3 });
    expect((await repository.query('SELECT state, closed_reason, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ state: 'Active', closed_reason: null, row_version: 3 });
    await expect(transition('reopen')).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
