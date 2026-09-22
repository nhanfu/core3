import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('BLOG-POST-WEBSITE-001', () => {
  test('maps Odoo open_website_url to a guarded public Core3 action', () => {
    const page = yaml('pages/posts.yaml');
    const api = yaml('api/posts.yaml');
    const detailPage = yaml('pages/post-detail.yaml');
    const detailApi = yaml('api/post-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_pages_views.xml', 'utf8');
    const list = page.components[0];
    const listAction = api.actions.find((action: any) => action.id === 'open_blog_post_website');
    const detailAction = detailApi.actions.find((action: any) => action.id === 'open_blog_post_website');

    expect(source).toContain('<list js_class="website_pages_list" type="object" action="open_website_url"');
    expect(source).toContain('<kanban js_class="website_pages_kanban" class="o_kanban_mobile" action="open_website_url"');
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(page.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(list.columns.map((column: any) => column.field)).toContain('website_url');
    expect(list.columns.find((column: any) => column.field === 'name').actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_blog_post_website' }),
      expect.objectContaining({ id: 'view_blog_post' }),
    ]));
    expect(list.row_open_action).toBe('open_blog_post_website');
    expect(listAction).toMatchObject({ type: 'client', permission: 'blog.read' });
    expect(detailAction).toMatchObject({ type: 'client', permission: 'blog.read' });
    expect(listAction.script).toContain('window.location.assign(url)');
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'open_blog_post_website' }));
  });

  test('projects durable post records to the published Core3 website route', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_website_contract', ['schema', 'data']);
    const api = yaml('api/posts.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'blog_posts');
    const rows = (await repository.querySource(source, { q: null, state: null, active: 'active' }, 0, 50)).data;

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'blog-post-demo-001', website_url: '/blog/post?id=blog-post-demo-001' }),
      expect.objectContaining({ id: 'blog-post-demo-002', website_url: '/blog/post?id=blog-post-demo-002' }),
    ]));
    expect(source.permission).toBe('blog.read');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    database.close();
  });

  test('keeps the website action read-only and public visibility guarded', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_website_visibility', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const publicList = operations['blog.public.posts'].query;
    const publicDetail = operations['blog.public.post'].query;
    const detailSource = yaml('api/post-detail.yaml').datasources.find((candidate: any) => candidate.id === 'blog_post_detail');

    expect(publicList).toContain('p.active = TRUE');
    expect(publicList).toContain("p.state = 'Published'");
    expect(publicDetail).toContain('p.active = TRUE');
    expect(publicDetail).toContain("p.state = 'Published'");
    expect(detailSource.query).toContain("'/blog/post?id=' || id AS website_url");
    expect(yaml('api/posts.yaml').actions.find((action: any) => action.id === 'open_blog_post_website').permission).toBe('blog.read');
    database.close();
  });
});
