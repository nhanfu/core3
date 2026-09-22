import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const seoValues = (overrides: Record<string, unknown> = {}) => ({
  website_meta_title: 'Core3 Engineering Blog',
  website_meta_description: 'Practical notes on declarative services and durable workflows.',
  website_meta_keywords: 'Core3, YAML, services',
  website_meta_og_img: '/blog/og/core3-engineering',
  ...overrides,
});

function apiFor(repository: YamlRepository, user: any) {
  const page = yaml('pages/post-detail.yaml');
  const api = yaml('api/post-detail.yaml');
  const postsApi = yaml('api/posts.yaml');
  const workflow = yaml('pages/blog-workflow.yaml').workflow;
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return user; },
      hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); },
    },
    sources: new Map([...(api.datasources || []), ...(postsApi.datasources || [])].map((source: any) => [source.id, source])),
    pageSources: new Map([[String(page.page.id), (api.datasources || []).map((source: any) => source.id)]]),
    pages: new Map([[String(page.page.id), { ...page, actions: api.actions }]]),
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map([[String(workflow.id), workflow]]),
    workflowFiles: new Map([[String(workflow.id), join(root, 'pages/blog-workflow.yaml')]]),
    permissions: yaml('permissions.yaml'),
    uploadRoot: '/tmp/core3-blog-post-seo-uploads',
    eventStore: {},
    topics: {},
  });
}

function seoRequest(id: string, expected_row_version: number, values: Record<string, unknown>) {
  return new Request('http://blog.test/api/actions/blog.posts.seo.update', {
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

describe('BLOG-POST-SEO-001', () => {
  test('maps Odoo SEO metadata to the separated Blog page/API contracts', () => {
    const mixins = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/mixins.py', 'utf8');
    const modelSource = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/models/website_blog.py', 'utf8');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_pages_views.xml', 'utf8');
    const page = yaml('pages/post-detail.yaml');
    const postsPage = yaml('pages/posts.yaml');
    const api = yaml('api/post-detail.yaml');
    const postsApi = yaml('api/posts.yaml');
    const edit = api.actions.find((action: any) => action.id === 'update_blog_post_seo');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(mixins).toContain("_name = 'website.seo.metadata'");
    expect(mixins).toContain('website_meta_title = fields.Char');
    expect(mixins).toContain('website_meta_description = fields.Text');
    expect(mixins).toContain('website_meta_keywords = fields.Char');
    expect(mixins).toContain('website_meta_og_img = fields.Char');
    expect(mixins).toContain('record.is_seo_optimized = record.website_meta_title');
    expect(modelSource).toContain("'website.seo.metadata'");
    expect(source).toContain('<page name="seo" string="SEO" groups="base.group_no_one">');
    expect(source).toContain('<field name="website_meta_title" string="Meta Title"/>');
    expect(source).toContain('<field name="is_seo_optimized"/>');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_blog_post_seo' }));
    expect(page.components[0].groups).toContainEqual(expect.objectContaining({ title: 'SEO Metadata' }));
    expect(postsPage.components[0].columns).toContainEqual(expect.objectContaining({ field: 'is_seo_optimized', label: 'SEO Optimized' }));
    expect(postsApi.datasources.find((source: any) => source.id === 'blog_posts').query).toContain('is_seo_optimized');
    expect(api.datasources[0].query).toContain('is_seo_optimized');
    expect(readFileSync(join(root, 'migrations/20260922200000-010-blog-post-seo-metadata.yaml'), 'utf8')).toContain('website_meta_og_img');
    expect(edit).toMatchObject({ type: 'server_form', permission: 'blog.write', action: 'blog.posts.seo.update' });
    expect(edit.fields.map((field: any) => field.field)).toEqual([
      'website_meta_title', 'website_meta_description', 'website_meta_keywords', 'website_meta_og_img',
    ]);
    expect(edit.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'BLOG_POST_SEO_COMPANY_SCOPE_REQUIRED', 'BLOG_POST_SEO_STALE', 'BLOG_POST_SEO_INVALID',
    ]);
  });

  test('persists SEO metadata, computes optimization, and rejects unsafe or oversized values atomically', async () => {
    const { database, repository } = await migrate(`blog_post_seo_contract_${crypto.randomUUID().replaceAll('-', '_')}`);
    const edit = yaml('api/post-detail.yaml').actions.find((action: any) => action.id === 'update_blog_post_seo');
    const initial = (await repository.query('SELECT website_meta_title, is_seo_optimized FROM (SELECT website_meta_title, (NULLIF(website_meta_title, \'\') IS NOT NULL AND NULLIF(website_meta_description, \'\') IS NOT NULL AND NULLIF(website_meta_keywords, \'\')) AS is_seo_optimized FROM blog_posts WHERE id = ?)', ['blog-post-demo-002']))[0];
    expect(initial).toEqual({ website_meta_title: null, is_seo_optimized: false });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: seoValues(),
    });
    expect(updated).toMatchObject({ id: 'blog-post-demo-002', row_version: 2, is_seo_optimized: true, ...seoValues() });

    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: seoValues({ website_meta_description: '' }),
    });
    expect(cleared).toMatchObject({ row_version: 3, website_meta_description: null, is_seo_optimized: false });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002', expected_row_version: 3, current_company_name: 'Core3 Demo Company', values: seoValues({ website_meta_og_img: 'javascript:alert(1)' }),
    })).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_SEO_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002', expected_row_version: 3, current_company_name: 'Core3 Demo Company', values: seoValues({ website_meta_title: 'x'.repeat(161) }),
    })).rejects.toMatchObject({ status: 422, code: 'BLOG_POST_SEO_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'blog-post-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: seoValues(),
    })).rejects.toMatchObject({ status: 409, code: 'BLOG_POST_SEO_STALE' });
    expect((await repository.query('SELECT row_version, website_meta_title, website_meta_description FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toMatchObject({ row_version: 3, website_meta_title: 'Core3 Engineering Blog', website_meta_description: null });
    database.close();
  });

  test('enforces permission and company scope without partial SEO writes', async () => {
    const { database, repository } = await migrate(`blog_post_seo_guards_${crypto.randomUUID().replaceAll('-', '_')}`);
    const reader = apiFor(repository, { sub: 'blog-reader', company_name: 'Core3 Demo Company', roles: ['editor'], permissions: ['blog.read'] });
    const writer = apiFor(repository, { sub: 'blog-writer', company_name: 'Other Company', roles: ['editor'], permissions: ['blog.read', 'blog.write'] });
    await expect(reader(seoRequest('blog-post-demo-002', 1, seoValues()), new URL('http://blog.test/api/actions/blog.posts.seo.update'))).rejects.toMatchObject({ status: 403 });
    await expect(writer(seoRequest('blog-post-demo-002', 1, seoValues()), new URL('http://blog.test/api/actions/blog.posts.seo.update'))).rejects.toMatchObject({ status: 403, code: 'BLOG_POST_SEO_COMPANY_SCOPE_REQUIRED' });
    expect((await repository.query('SELECT row_version, website_meta_title FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toEqual({ row_version: 1, website_meta_title: null });
    database.close();
  });

  test('retains SEO metadata and optimization after a file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-blog-post-seo-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_post_seo_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const edit = yaml('api/post-detail.yaml').actions.find((action: any) => action.id === 'update_blog_post_seo');
    await firstRepository.executeMutation(edit.mutation, { id: 'blog-post-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: seoValues() });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT website_meta_title, website_meta_description, website_meta_keywords, website_meta_og_img, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0]).toMatchObject({ ...seoValues(), row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
