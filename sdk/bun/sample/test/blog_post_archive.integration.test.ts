import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');

const buildDiscovery = () => {
  const discoveryRoot = mkdtempSync('/tmp/core3-blog-archive-discovery-');
  mkdirSync(join(discoveryRoot, 'services'), { recursive: true });
  cpSync(join(import.meta.dir, '../services/blog'), join(discoveryRoot, 'services/blog'), { recursive: true });
  return { discoveryRoot, discovered: discoverPages(discoveryRoot) };
};

const buildApi = (repository: YamlRepository, permissions: string[]) => {
  const { discoveryRoot, discovered } = buildDiscovery();
  const user = { sub: 'blog-archive-user', email: 'archive@workspace.example', name: 'Blog Archive User', roles: ['editor'], permissions };
  const api = createYamlApi({
    repository,
    authProvider: { async getCurrentUser() { return user; }, hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); } },
    sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('blog_'))),
    pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'blog')),
    pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'blog').map(([id, page]) => [id, page.config])),
    catalogs: discovered.catalogs,
    menus: discovered.menus,
    workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.config])),
    workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.file])),
    permissions: discovered.permissions.get('blog')?.config || {},
    uploadRoot: '/tmp/core3-blog-archive-test-uploads', eventStore: {}, topics: {},
  });
  return { api, discovered, cleanup: () => rmSync(discoveryRoot, { recursive: true, force: true }) };
};

const action = (api: ReturnType<typeof buildApi>['api'], name: string, id: string) => api(
  new Request(`http://blog.test/api/actions/blog.posts.${name}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, values: {} }),
  }),
  new URL(`http://blog.test/api/actions/blog.posts.${name}`),
);

describe('Blog post archive parity slice', () => {
  test('archives and unarchives with durable Odoo active semantics', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'blog_post_archive_test', ['schema', 'data']);
    const { api, cleanup } = buildApi(repository, ['blog.read', 'blog.write', 'blog.manage']);
    const postId = 'blog-post-demo-001';

    expect((await repository.query('SELECT active, state FROM blog_posts WHERE id = ?', [postId]))[0]).toEqual({ active: true, state: 'Published' });
    expect((await (await action(api, 'archive', postId)).json())).toMatchObject({ id: postId, active: false, state: 'Archived' });
    expect((await repository.query('SELECT active, state, published_date, row_version FROM blog_posts WHERE id = ?', [postId]))[0]).toMatchObject({ active: false, state: 'Archived', published_date: null, row_version: 2 });
    expect((await repository.query("SELECT id FROM blog_posts WHERE id = ? AND active = TRUE AND state = 'Published'", [postId])).length).toBe(0);

    expect((await (await action(api, 'unarchive', postId)).json())).toMatchObject({ id: postId, active: true, state: 'Draft' });
    expect((await repository.query('SELECT active, state, published_date, row_version FROM blog_posts WHERE id = ?', [postId]))[0]).toMatchObject({ active: true, state: 'Draft', published_date: null, row_version: 3 });
    database.close();
    cleanup();
  });

  test('defaults the list to active posts and exposes an archived filter', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'blog_post_archive_filter_test', ['schema', 'data']);
    const { discovered, cleanup } = buildApi(repository, ['blog.read']);
    const source = discovered.datasources.get('blog_posts');
    expect(source?.query).toContain('p.active = TRUE');
    const active = await repository.query('SELECT id FROM blog_posts WHERE active = TRUE ORDER BY id');
    const archived = await repository.query('SELECT id FROM blog_posts WHERE active = FALSE ORDER BY id');
    expect(active.map((row: any) => row.id)).toEqual(['blog-post-demo-001', 'blog-post-demo-002']);
    expect(archived).toEqual([]);
    expect(discovered.pages.get('blog-posts')?.config.components[0].default_filters).toEqual({ active: 'active' });
    expect(discovered.pages.get('blog-posts')?.config.components[0].filters).toContainEqual(expect.objectContaining({ field: 'active' }));
    database.close();
    cleanup();
  });

  test('requires blog.manage for archive mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'blog_post_archive_permission_test', ['schema', 'data']);
    const { api, cleanup } = buildApi(repository, ['blog.read', 'blog.write']);
    await expect(action(api, 'archive', 'blog-post-demo-002')).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT active, state, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toMatchObject({ active: true, state: 'Draft', row_version: 1 });
    database.close();
    cleanup();
  });
});
