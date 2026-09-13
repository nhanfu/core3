import { describe, expect, test } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog site/company actor boundary', () => {
  test('propagates the selected admin company through query, detail prefetch, lookup, and attachment reads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_http_actor_reads', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Demo Company' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Demo Company' WHERE blog_id = 'blog-demo-001'");
    await repository.run("INSERT INTO blog_blogs (id, name, subtitle, company_name) VALUES ('blog-vietnam-001', 'Vietnam Engineering', 'Vietnam notes', 'Core3 Vietnam Branch')");
    await repository.run("INSERT INTO blog_posts (id, blog_id, blog_name, name, subtitle, author_name, tags, state, company_name) VALUES ('blog-post-vietnam-001', 'blog-vietnam-001', 'Vietnam Engineering', 'Vietnam release', 'Local release notes', 'Vietnam Team', 'release', 'Draft', 'Core3 Vietnam Branch')");

    const uploadRoot = `/tmp/core3-blog-http-actor-${crypto.randomUUID()}`;
    mkdirSync(uploadRoot, { recursive: true });
    writeFileSync(join(uploadRoot, 'blog-actor-boundary.txt'), 'private attachment');
    await repository.run("INSERT INTO blog_post_attachments (id, post_id, file_name, mime_type, size_bytes, storage_key, uploaded_by, company_name) VALUES ('blog-attachment-demo-001', 'blog-post-demo-001', 'private.txt', 'text/plain', 18, 'blog-actor-boundary.txt', 'user-admin', 'Core3 Demo Company')");

    const postsPage = yaml('pages/posts.yaml');
    const detailPage = yaml('pages/post-detail.yaml');
    const workflow = yaml('pages/blog-workflow.yaml').workflow;
    const sources = [
      ...yaml('api/blogs.yaml').datasources,
      ...postsPage.datasources,
      ...detailPage.datasources,
    ];
    const authUser: any = { sub: 'user-admin', email: 'admin@workspace.example', name: 'Admin', roles: ['admin'], company: { name: 'Core3 Vietnam Branch' }, permissions: ['blog.read', 'blog.write', 'blog.manage'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(sources.map((source: any) => [source.id, source])),
      pageSources: new Map([['blog-post-detail', ['blog_post_detail', 'blog_post_attachments']]]),
      pages: new Map([['blog-post-detail', detailPage]]), catalogs: new Map(), menus: new Map(), workflows: new Map([['blog_posts', workflow]]), workflowFiles: new Map(),
      permissions: { permissions: ['blog.read', 'blog.write', 'blog.manage'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const query = (sourceId: string, params: Record<string, unknown> = {}) => api(new Request('http://blog.test/api/query', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, params, top: 50 }),
    }), new URL('http://blog.test/api/query'));

    const blogs = await (await query('blog_blogs')).json() as any;
    expect(blogs.data.map((row: any) => row.id)).toEqual(['blog-vietnam-001']);
    const posts = await (await query('blog_posts')).json() as any;
    expect(posts.data.map((row: any) => row.id)).toEqual(['blog-post-vietnam-001']);
    const lookup = await (await query('blog_lookup')).json() as any;
    expect(lookup.data).toEqual([{ value: 'blog-vietnam-001', label: 'Vietnam Engineering' }]);

    const pageResponse = await api(new Request('http://blog.test/api/pages/blog-post-detail?id=blog-post-demo-001', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://blog.test/api/pages/blog-post-detail?id=blog-post-demo-001'));
    expect(pageResponse?.status).toBe(200);
    const detail = await pageResponse!.json() as any;
    expect(detail.datasources.find((source: any) => source.id === 'blog_post_detail').data).toEqual({});
    expect(detail.datasources.find((source: any) => source.id === 'blog_post_attachments').data).toEqual([]);

    const attachment = await api(new Request('http://blog.test/api/blog/post-attachments/blog-attachment-demo-001', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://blog.test/api/blog/post-attachments/blog-attachment-demo-001'));
    expect(attachment?.status).toBe(404);
    rmSync(uploadRoot, { recursive: true, force: true });
    database.close();
  });

  test('filters private reads by company while public reads remain published and site-scoped', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_actor_reads', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Vietnam Branch' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Vietnam Branch' WHERE blog_id = 'blog-demo-001'");

    const posts = yaml('pages/posts.yaml').datasources.find((source: any) => source.id === 'blog_posts');
    expect((await repository.querySource(posts, { q: null, state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(posts, { q: null, state: null, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['blog-post-demo-001', 'blog-post-demo-002']);

    const operations = yaml('operations.yaml').operations;
    const publicList = bindNamedParams(operations['blog.public.posts'].query, { q: null, blog_id: 'blog-demo-001' });
    expect((await repository.query(publicList.statement, publicList.values)).map((row: any) => row.id)).toEqual(['blog-post-demo-001']);
    const wrongSite = bindNamedParams(operations['blog.public.post'].query, { id: 'blog-post-demo-001', blog_id: 'wrong-site' });
    expect(await repository.query(wrongSite.statement, wrongSite.values)).toEqual([]);
    database.close();
  });

  test('rejects cross-company, stale, missing, and spoofed mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_actor_writes', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Vietnam Branch' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Vietnam Branch' WHERE blog_id = 'blog-demo-001'");
    const detail = yaml('pages/post-detail.yaml');
    const edit = detail.actions.find((action: any) => action.id === 'edit_blog_post_detail').mutation;
    const before = (await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-001']))[0];
    const values = { blog_id: 'blog-demo-001', blog_name: 'Core3 Engineering', company_name: 'Core3 Demo Company', name: 'Cross-company overwrite' };
    await expect(repository.executeMutation(edit, { id: 'blog-post-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values })).rejects.toMatchObject({ status: 404, code: 'BLOG_POST_NOT_FOUND' });
    expect((await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-001']))[0]).toEqual(before);
    await expect(repository.executeMutation(edit, { id: 'missing-post', expected_row_version: 1, current_company_name: 'Core3 Vietnam Branch', values: { ...values, company_name: 'Core3 Vietnam Branch' } })).rejects.toMatchObject({ status: 404, code: 'BLOG_POST_NOT_FOUND' });
    await expect(repository.executeMutation(edit, { id: 'blog-post-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam Branch', values: { ...values, company_name: 'Core3 Vietnam Branch', name: 'Allowed' } })).resolves.toMatchObject({ row_version: 2, name: 'Allowed' });
    await expect(repository.executeMutation(edit, { id: 'blog-post-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam Branch', values: { ...values, company_name: 'Core3 Vietnam Branch', name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });
});
