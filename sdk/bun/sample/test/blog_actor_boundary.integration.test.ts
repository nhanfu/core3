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

function createBlogActorApi(repository: YamlRepository, authUser: any, uploadRoot = `/tmp/core3-blog-actor-${crypto.randomUUID()}`) {
  const blogsApi = yaml('api/blogs.yaml');
  const postsPage = yaml('pages/posts.yaml');
  const postsApi = yaml('api/posts.yaml');
  const detailPage = yaml('api/post-detail.yaml');
  const workflow = yaml('pages/blog-workflow.yaml').workflow;
  const blogWorkflow = yaml('pages/blog-blog-workflow.yaml').workflow;
  const sources = [
    ...blogsApi.datasources,
    ...postsApi.datasources,
    ...detailPage.datasources,
  ];
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return authUser; },
      hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
    },
    sources: new Map(sources.map((source: any) => [source.id, source])),
    pageSources: new Map([
      ['blog', ['blog_active_states', 'blog_blogs', 'blog_detail']],
      ['blog-posts', ['blog_post_states', 'blog_lookup', 'blog_posts']],
      ['blog-post-detail', ['blog_post_detail', 'blog_post_attachments', 'blog_post_tags', 'blog_post_tag_lookup']],
    ]),
    pages: new Map([
      ['blog', blogsApi],
      ['blog-posts', postsPage],
      ['blog-post-detail', detailPage],
    ]),
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map([['blog_posts', workflow], ['blog_blogs', blogWorkflow]]),
    workflowFiles: new Map(),
    permissions: { permissions: ['blog.read', 'blog.write', 'blog.manage'], tables: {}, endpoints: {} },
    uploadRoot,
    eventStore: {},
    topics: {},
    storage: yaml('storage.yaml'),
  });
}

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
    const postsApi = yaml('api/posts.yaml');
    const detailPage = yaml('api/post-detail.yaml');
    const analysisPage = yaml('pages/analysis.yaml');
    const workflow = yaml('pages/blog-workflow.yaml').workflow;
    const blogWorkflow = yaml('pages/blog-blog-workflow.yaml').workflow;
    const sources = [
      ...yaml('api/blogs.yaml').datasources,
      ...postsApi.datasources,
      ...detailPage.datasources,
      ...analysisPage.datasources,
    ];
    const authUser: any = {
      sub: 'user-admin',
      email: 'admin@workspace.example',
      name: 'Admin',
      roles: ['admin'],
      company_id: 'company-vietnam',
      companies: [
        { id: 'company-demo', name: 'Core3 Demo Company' },
        { id: 'company-vietnam', name: 'Core3 Vietnam Branch' },
      ],
      permissions: ['blog.read', 'blog.write', 'blog.manage'],
    };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(sources.map((source: any) => [source.id, source])),
      pageSources: new Map([
        ['blog-post-detail', ['blog_post_detail', 'blog_post_attachments', 'blog_post_tags', 'blog_post_tag_lookup']],
        ['blog-analysis', ['blog_analysis_totals', 'blog_analysis_states']],
      ]),
      pages: new Map([['blog-post-detail', detailPage], ['blog-analysis', analysisPage]]), catalogs: new Map(), menus: new Map(), workflows: new Map([['blog_posts', workflow], ['blog_blogs', blogWorkflow]]), workflowFiles: new Map(),
      permissions: { permissions: ['blog.read', 'blog.write', 'blog.manage'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const query = (sourceId: string, params: Record<string, unknown> = {}) => api(new Request('http://blog.test/api/query', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, params, top: 50 }),
    }), new URL('http://blog.test/api/query'));

    const blogs = await (await query('blog_blogs')).json() as any;
    expect(blogs.data.map((row: any) => row.id)).toEqual(['blog-vietnam-001']);
    const spoofedBlogs = await (await query('blog_blogs', { company_name: 'Core3 Demo Company' })).json() as any;
    expect(spoofedBlogs.data.map((row: any) => row.id)).toEqual(['blog-vietnam-001']);
    const posts = await (await query('blog_posts')).json() as any;
    expect(posts.data.map((row: any) => row.id)).toEqual(['blog-post-vietnam-001']);
    const lookup = await (await query('blog_lookup')).json() as any;
    expect(lookup.data).toEqual([{ value: 'blog-vietnam-001', label: 'Vietnam Engineering' }]);
    const analysis = await (await query('blog_analysis_totals')).json() as any;
    expect(analysis.data).toEqual({ blog_count: 1, post_count: 1, published_count: 0, total_visits: 0 });
    const states = await (await query('blog_analysis_states')).json() as any;
    expect(states.data).toEqual([{ category: 'Draft', post_count: 1 }]);

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

    const posts = yaml('api/posts.yaml').datasources.find((source: any) => source.id === 'blog_posts');
    expect((await repository.querySource(posts, { q: null, state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(posts, { q: null, state: null, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['blog-post-demo-001', 'blog-post-demo-002']);

    const operations = yaml('operations.yaml').operations;
    const publicList = bindNamedParams(operations['blog.public.posts'].query, { q: null, blog_id: 'blog-demo-001' });
    expect((await repository.query(publicList.statement, publicList.values)).map((row: any) => row.id)).toEqual(['blog-post-demo-001']);
    const wrongSite = bindNamedParams(operations['blog.public.post'].query, { id: 'blog-post-demo-001', blog_id: 'wrong-site' });
    expect(await repository.query(wrongSite.statement, wrongSite.values)).toEqual([]);
    database.close();
  });

  test('enforces private HTTP auth, ignores company filter spoofing, and scopes detail/attachment prefetch', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_http_actor_scope', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Demo Company' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Demo Company' WHERE blog_id = 'blog-demo-001'");
    await repository.run("INSERT INTO blog_blogs (id, name, subtitle, company_name) VALUES ('blog-vietnam-001', 'Vietnam Engineering', 'Vietnam notes', 'Core3 Vietnam Branch')");
    await repository.run("INSERT INTO blog_posts (id, blog_id, blog_name, name, subtitle, author_name, tags, state, company_name) VALUES ('blog-post-vietnam-001', 'blog-vietnam-001', 'Vietnam Engineering', 'Vietnam release', 'Local release notes', 'Vietnam Team', 'release', 'Draft', 'Core3 Vietnam Branch')");
    await repository.run("INSERT INTO blog_post_attachments (id, post_id, file_name, mime_type, size_bytes, storage_key, uploaded_by, company_name) VALUES ('blog-attachment-demo-001', 'blog-post-demo-001', 'private.txt', 'text/plain', 15, 'private.txt', 'user-admin', 'Core3 Demo Company')");

    const authUser: any = {
      sub: 'user-admin', email: 'admin@workspace.example', name: 'Admin', roles: ['admin'],
      company: { name: 'Core3 Vietnam Branch' }, permissions: ['blog.read', 'blog.write', 'blog.manage'],
    };
    const api = createBlogActorApi(repository, authUser);
    const query = (sourceId: string, params: Record<string, unknown> = {}) => api(new Request('http://blog.test/api/query', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, params, top: 50 }),
    }), new URL('http://blog.test/api/query'));

    const blogs = await (await query('blog_blogs', { company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company' })).json() as any;
    expect(blogs.data.map((row: any) => row.id)).toEqual(['blog-vietnam-001']);
    const posts = await (await query('blog_posts', { company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company' })).json() as any;
    expect(posts.data.map((row: any) => row.id)).toEqual(['blog-post-vietnam-001']);

    const prefetched = await api(new Request('http://blog.test/api/pages/blog-post-detail?id=blog-post-demo-001&company_name=Core3+Demo+Company&current_company_name=Core3+Demo+Company', {
      headers: { Authorization: 'Bearer test-token' },
    }), new URL('http://blog.test/api/pages/blog-post-detail?id=blog-post-demo-001&company_name=Core3+Demo+Company&current_company_name=Core3+Demo+Company'));
    expect(prefetched?.status).toBe(200);
    const page = await prefetched!.json() as any;
    expect(page.datasources.find((source: any) => source.id === 'blog_post_detail').data).toEqual({});
    expect(page.datasources.find((source: any) => source.id === 'blog_post_attachments').data).toEqual([]);
    expect((await api(new Request('http://blog.test/api/blog/post-attachments/blog-attachment-demo-001', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://blog.test/api/blog/post-attachments/blog-attachment-demo-001')))?.status).toBe(404);

    authUser.permissions = [];
    await expect(query('blog_blogs')).rejects.toMatchObject({ status: 403 });

    const anonymousApi = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { throw { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' }; },
        hasPermission() { return false; },
      },
      sources: new Map(), pageSources: new Map(), pages: new Map(), catalogs: new Map(), menus: new Map(),
      workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: [], tables: {}, endpoints: {} },
      uploadRoot: `/tmp/core3-blog-anonymous-${crypto.randomUUID()}`, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    await expect(anonymousApi(new Request('http://blog.test/api/query', {
      method: 'POST', body: JSON.stringify({ sourceId: 'blog_blogs' }), headers: { 'Content-Type': 'application/json' },
    }), new URL('http://blog.test/api/query'))).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    database.close();
  });

  test('rejects cross-company, stale, missing, and spoofed mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_actor_writes', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Vietnam Branch' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Vietnam Branch' WHERE blog_id = 'blog-demo-001'");
    const detail = yaml('api/post-detail.yaml');
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

  test('enforces scoped mutations through the action API with missing and stale atomicity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_http_actor_writes', ['schema', 'data']);
    await repository.run("UPDATE blog_blogs SET company_name = 'Core3 Demo Company' WHERE id = 'blog-demo-001'");
    await repository.run("UPDATE blog_posts SET company_name = 'Core3 Demo Company' WHERE blog_id = 'blog-demo-001'");
    await repository.run("INSERT INTO blog_blogs (id, name, subtitle, company_name) VALUES ('blog-vietnam-001', 'Vietnam Engineering', 'Vietnam notes', 'Core3 Vietnam Branch')");
    await repository.run("INSERT INTO blog_posts (id, blog_id, blog_name, name, subtitle, author_name, tags, state, company_name) VALUES ('blog-post-vietnam-001', 'blog-vietnam-001', 'Vietnam Engineering', 'Vietnam release', 'Local release notes', 'Vietnam Team', 'release', 'Draft', 'Core3 Vietnam Branch')");
    const authUser: any = {
      sub: 'user-admin', email: 'admin@workspace.example', name: 'Admin', roles: ['admin'],
      company: { name: 'Core3 Vietnam Branch' }, permissions: ['blog.read', 'blog.write', 'blog.manage'],
    };
    const api = createBlogActorApi(repository, authUser);
    const mutate = (id: string, expectedRowVersion: number, values: Record<string, unknown>) => api(new Request('http://blog.test/api/actions/blog.posts.update', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, expected_row_version: expectedRowVersion, values }),
    }), new URL('http://blog.test/api/actions/blog.posts.update'));
    const current = (await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-vietnam-001']))[0];
    const values = { blog_id: 'blog-vietnam-001', blog_name: 'Vietnam Engineering', company_name: 'Core3 Demo Company', name: 'Spoof attempt' };

    await expect(mutate('blog-post-vietnam-001', current.row_version, values)).rejects.toMatchObject({ status: 403, code: 'BLOG_COMPANY_SCOPE_REQUIRED' });
    expect((await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-vietnam-001']))[0]).toEqual(current);
    await expect(mutate('missing-post', current.row_version, { ...values, company_name: 'Core3 Vietnam Branch' })).rejects.toMatchObject({ status: 404, code: 'BLOG_POST_NOT_FOUND' });
    expect((await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-vietnam-001']))[0]).toEqual(current);

    const updated = await mutate('blog-post-vietnam-001', current.row_version, { ...values, company_name: 'Core3 Vietnam Branch', name: 'Vietnam release updated' });
    expect((await updated!.json())).toMatchObject({ id: 'blog-post-vietnam-001', row_version: current.row_version + 1, name: 'Vietnam release updated' });
    await expect(mutate('blog-post-vietnam-001', current.row_version, { ...values, company_name: 'Core3 Vietnam Branch', name: 'Stale overwrite' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect((await repository.query('SELECT name, company_name, row_version FROM blog_posts WHERE id = ?', ['blog-post-vietnam-001']))[0]).toMatchObject({ name: 'Vietnam release updated', company_name: 'Core3 Vietnam Branch', row_version: current.row_version + 1 });
    database.close();
  });
});
