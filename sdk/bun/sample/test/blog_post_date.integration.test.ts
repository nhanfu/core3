import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_pages_views.xml', 'utf8');
const modelSource = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/models/website_blog.py', 'utf8');

const editValues = (published_date: string | null) => ({
  blog_id: 'blog-demo-001',
  blog_name: 'Core3 Engineering',
  company_name: 'Core3 Demo Company',
  name: 'Inside the migration pipeline',
  subtitle: '',
  author_name: 'Platform Team',
  teaser: '',
  content_html: '<p>Draft content.</p>',
  tags: 'migrations',
  published_date,
});

function apiFor(repository: YamlRepository, user: any) {
  // Keep this focused API fixture scoped to Blog. The shared checkout can
  // contain concurrent module YAML edits that should not make a Blog test
  // fail during global discovery.
  const page = yaml('pages/post-detail.yaml');
  const api = yaml('api/post-detail.yaml');
  const postsApi = yaml('api/posts.yaml');
  const mergedPage = { ...page, actions: [...(api.actions || []), ...(page.actions || [])] };
  const workflow = yaml('pages/blog-workflow.yaml').workflow;
  const datasourceDefinitions = [...(api.datasources || []), ...(postsApi.datasources || [])];
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return user; },
      hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); },
    },
    sources: new Map(datasourceDefinitions.map((source: any) => [source.id, source])),
    pageSources: new Map([[String(page.page.id), (api.datasources || []).map((source: any) => source.id)]]),
    pages: new Map([[String(page.page.id), mergedPage]]),
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map([[String(workflow.id), workflow]]),
    workflowFiles: new Map([[String(workflow.id), join(root, 'pages/blog-workflow.yaml')]]),
    permissions: yaml('permissions.yaml'),
    uploadRoot: '/tmp/core3-blog-post-date-uploads',
    eventStore: {},
    topics: {},
  });
}

function updateRequest(id: string, expected_row_version: number, values: Record<string, unknown>) {
  return new Request('http://blog.test/api/actions/blog.posts.update', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, expected_row_version, values }),
  });
}

async function migrate(databaseName: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, databaseName, ['schema', 'data']);
  return { database, repository };
}

describe('BLOG-POST-DATE-001', () => {
  test('maps Odoo post_date to the separated Core3 detail/API edit contract', () => {
    const page = yaml('pages/post-detail.yaml');
    const api = yaml('api/post-detail.yaml');
    const edit = api.actions.find((action: any) => action.id === 'edit_blog_post_detail');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(source).toContain('<group name="publishing_details" string="Publishing Options">');
    expect(source).toContain('<field name="post_date"/>');
    expect(modelSource).toContain("post_date = fields.Datetime('Publishing date', compute='_compute_post_date', inverse='_set_post_date', store=True");
    expect(modelSource).toContain('blog_post.published_date = blog_post.post_date');
    expect(page.components[0].fields).toContainEqual(expect.objectContaining({ field: 'published_date', label: 'Publishing date', type: 'datetime' }));
    expect(edit.mutation.fields).toContain('published_date');
    expect(edit.mutation.normalize_empty).toEqual(['published_date']);
    expect(edit.fields).toContainEqual(expect.objectContaining({ field: 'published_date', label: 'Publishing date', type: 'datetime' }));
    expect(edit.mutation.guards.map((guard: any) => guard.code)).toContain('BLOG_POST_DATE_INVALID');
    expect(edit.mutation.guards.find((guard: any) => guard.code === 'BLOG_POST_DATE_INVALID').query).toContain('regexp_matches');
  });

  test('persists, clears, and projects the publishing date with optimistic concurrency', async () => {
    const { database, repository } = await migrate(`blog_post_date_contract_${crypto.randomUUID().replaceAll('-', '_')}`);
    const edit = yaml('api/post-detail.yaml').actions.find((action: any) => action.id === 'edit_blog_post_detail');
    const first = await repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002',
      expected_row_version: 1,
      current_company_name: 'Core3 Demo Company',
      values: editValues('2026-02-03 10:15:00'),
    });
    expect(first).toMatchObject({ id: 'blog-post-demo-002', row_version: 2 });
    expect(String(first.published_date)).toContain('2026-02-03T10:15:00');
    expect((await repository.query('SELECT CAST(published_date AS VARCHAR) AS published_date, CAST(COALESCE(published_date, created_at) AS VARCHAR) AS post_date FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toEqual({ published_date: '2026-02-03 10:15:00', post_date: '2026-02-03 10:15:00' });

    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002',
      expected_row_version: 2,
      current_company_name: 'Core3 Demo Company',
      values: editValues(''),
    });
    expect(cleared).toMatchObject({ id: 'blog-post-demo-002', row_version: 3, published_date: null, state: 'Draft' });
    const projected = (await repository.query('SELECT CAST(created_at AS VARCHAR) AS created_at, CAST(COALESCE(published_date, created_at) AS VARCHAR) AS post_date FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0];
    expect(projected.post_date).toBe(projected.created_at);
    await expect(repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002',
      expected_row_version: 2,
      current_company_name: 'Core3 Demo Company',
      values: editValues('2026-04-01 09:00:00'),
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect((await repository.query('SELECT row_version, published_date FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toMatchObject({ row_version: 3, published_date: null });
    database.close();
  });

  test('enforces permission, date, missing-record, and company guards atomically', async () => {
    const { database, repository } = await migrate(`blog_post_date_guards_${crypto.randomUUID().replaceAll('-', '_')}`);
    const writer = apiFor(repository, { sub: 'blog-writer', company_name: 'Core3 Demo Company', roles: ['editor'], permissions: ['blog.read', 'blog.write'] });
    const reader = apiFor(repository, { sub: 'blog-reader', company_name: 'Core3 Demo Company', roles: ['editor'], permissions: ['blog.read'] });

    await expect(reader(updateRequest('blog-post-demo-002', 1, editValues('2026-02-03 10:15:00')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 403 });
    await expect(writer(updateRequest('blog-post-demo-002', 1, editValues('not-a-date')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_DATE_INVALID' });
    await expect(writer(updateRequest('blog-post-demo-002', 1, editValues('2026-2-03 10:15')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_DATE_INVALID' });
    await expect(writer(updateRequest('blog-post-demo-002', 1, editValues('2026-02-30 10:15')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_DATE_INVALID' });
    await expect(writer(updateRequest('missing-post', 1, editValues('2026-02-03 10:15:00')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 404, code: 'BLOG_POST_NOT_FOUND' });
    await repository.run("UPDATE blog_blogs SET company_name = 'Other Company' WHERE id = 'blog-demo-001'");
    await expect(writer(updateRequest('blog-post-demo-002', 1, editValues('2026-02-03 10:15:00')), new URL('http://blog.test/api/actions/blog.posts.update'))).rejects.toMatchObject({ status: 403, code: 'BLOG_COMPANY_SCOPE_REQUIRED' });
    expect((await repository.query('SELECT row_version, published_date FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toMatchObject({ row_version: 1, published_date: null });
    database.close();
  });

  test('retains the inverse and computed projection across file-backed restart', async () => {
    const databasePath = `/tmp/core3-blog-post-date-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_post_date_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const edit = yaml('api/post-detail.yaml').actions.find((action: any) => action.id === 'edit_blog_post_detail');
    await firstRepository.executeMutation(edit.mutation, { id: 'blog-post-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: editValues('2026-05-06 14:30:00') });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT CAST(published_date AS VARCHAR) AS published_date, CAST(COALESCE(published_date, created_at) AS VARCHAR) AS post_date FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toEqual({ published_date: '2026-05-06 14:30:00', post_date: '2026-05-06 14:30:00' });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
