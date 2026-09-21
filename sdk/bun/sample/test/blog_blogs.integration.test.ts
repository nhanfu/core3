import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog Blogs parity slice', () => {
  test('publishes and unpublishes a persisted post through the declared workflow', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_publication_workflow_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const authUser = { sub: 'blog-editor', email: 'editor@workspace.example', name: 'Blog Editor', roles: ['editor'], permissions: ['blog.read', 'blog.write'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('blog_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'blog')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'blog').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('blog')?.config || {},
      uploadRoot: '/tmp/core3-blog-test-uploads', eventStore: {}, topics: {},
    });
    const postId = 'blog-post-demo-002';
    const transition = (name: string) => api(new Request(`http://blog.test/api/actions/blog.posts.${name}`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, values: {} }) }), new URL(`http://blog.test/api/actions/blog.posts.${name}`));
    expect((await (await transition('publish')).json())).toMatchObject({ id: postId, state: 'Published' });
    expect((await repository.query('SELECT state, row_version, published_date FROM blog_posts WHERE id = ?', [postId]))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    await expect(transition('publish')).rejects.toMatchObject({ status: 409 });
    expect((await (await transition('unpublish')).json())).toMatchObject({ id: postId, state: 'Draft' });
    expect((await repository.query('SELECT state, row_version FROM blog_posts WHERE id = ?', [postId]))[0]).toEqual({ state: 'Draft', row_version: 3 });
    database.close();
  });

  test('joins the Odoo Blogs action to a page and route', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('blog')).toEqual(['blog_active_states', 'blog_blogs', 'blog_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual(expect.objectContaining({ page: 'blog', path: '/blog' }));
  });

  test('matches Odoo list/form fields and protects mutations', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'post_count', 'active']);
    expect(page.components[0].row_open_action).toBe('edit_blog');
    expect(api.actions.map((action: any) => action.id)).toEqual(['create_blog', 'edit_blog', 'archive_blog', 'unarchive_blog']);
    expect(api.actions.slice(0, 2).every((action: any) => action.permission === 'blog.write')).toBe(true);
    expect(api.actions.slice(2).every((action: any) => action.permission === 'blog.manage')).toBe(true);
    expect(api.actions[0].mutation.guards.map((guard: any) => guard.code)).toEqual(['BLOG_NAME_REQUIRED', 'BLOG_COMPANY_SCOPE_REQUIRED', 'BLOG_EXISTS']);
    expect(api.actions.slice(0, 2).map((action: any) => action.fields.map((field: any) => field.field))).toEqual([['name', 'subtitle', 'company_name'], ['name', 'subtitle', 'company_name']]);
    expect(api.datasources[1].error_states.transport_error.status).toBe(503);
  });

  test('edits persisted post content through the detail contract', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_content_test', ['schema', 'data']);
    const detail = yaml('api/post-detail.yaml');
    const edit = detail.actions.find((action: any) => action.id === 'edit_blog_post_detail');
    const updated = await repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-001', expected_row_version: 1,
      values: { blog_id: 'blog-demo-001', blog_name: 'Core3 Engineering', name: 'Shipping YAML-first services', subtitle: 'How page YAML replaced per-page UI code', author_name: 'Platform Team', teaser: 'Declarative services.', content_html: '<p>Persisted <strong>content</strong>.</p>', tags: 'yaml,services', },
    });
    expect(updated).toMatchObject({ id: 'blog-post-demo-001', content_html: '<p>Persisted <strong>content</strong>.</p>', row_version: 2 });
    expect((await repository.query('SELECT content_html FROM blog_posts WHERE id = ?', ['blog-post-demo-001']))[0]).toEqual({ content_html: '<p>Persisted <strong>content</strong>.</p>' });
    await expect(repository.executeMutation(edit.mutation, { id: 'blog-post-demo-001', expected_row_version: 1, values: { blog_id: 'blog-demo-001', blog_name: 'Core3 Engineering', name: 'Stale' } })).rejects.toMatchObject({ status: 409 });
    database.close();
  });

  test('imports idempotent post rows through the declared form action', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_import_test', ['schema', 'data']);
    const page = yaml('pages/posts.yaml');
    const importer = page.actions.find((action: any) => action.id === 'import_blog_posts');
    expect(page.components[0].actions).toContainEqual(expect.objectContaining({ id: 'blog_posts.export', label: 'Export' }));
    const values = { post_list: 'Imported launch|Release notes|QA Team|release,qa\nImported guide|How to use it|Docs Team|docs' };
    const first = await repository.executeMutation(importer.mutation, { values });
    expect(first).toEqual({ imported: 2 });
    const second = await repository.executeMutation(importer.mutation, { values });
    expect(second).toEqual({ imported: 2 });
    expect((await repository.query("SELECT COUNT(*) AS count FROM blog_posts WHERE id LIKE 'blog-post-import-%'", []))[0].count).toBe(2);
    await expect(repository.executeMutation(importer.mutation, { values: { post_list: 'Invalid row' } })).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_IMPORT_INVALID' });
    database.close();
  });
});
