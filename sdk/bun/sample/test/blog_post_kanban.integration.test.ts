import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('BLOG-POST-KANBAN-001', () => {
  test('maps Odoo list, kanban, and form action through separate page/API YAML', () => {
    const page = yaml('pages/posts.yaml');
    const api = yaml('api/posts.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_pages_views.xml', 'utf8');
    const list = page.components[0];

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(source).toContain('<field name="view_mode">list,kanban,form</field>');
    expect(source).toContain('<record id="blog_post_view_kanban"');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.views[1]).toMatchObject({
      label: 'Kanban',
      mobile: true,
      card: { title: 'name', subtitle: 'blog_name' },
    });
    expect(list.views[1].card.fields).toEqual([
      { field: 'post_date', label: 'Post date' },
      { field: 'author_name', label: 'Author' },
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'import_blog_posts', 'create_blog_post', 'view_blog_post', 'open_blog_post_website', 'publish_blog_post',
      'unpublish_blog_post', 'archive_blog_post', 'unarchive_blog_post',
    ]);
  });

  test('queries durable kanban card state with permission and workflow guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_kanban_contract', ['schema', 'data']);
    const api = yaml('api/posts.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'blog_posts');

    expect(source.permission).toBe('blog.read');
    expect(source.workflow).toBe('blog_posts');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    const rows = (await repository.querySource(source, { q: null, state: null, active: 'active' }, 0, 50)).data;
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'blog-post-demo-001', post_date: expect.any(String), is_published: true, publication_status: 'Published' }),
      expect.objectContaining({ id: 'blog-post-demo-002', post_date: expect.any(String), is_published: false, publication_status: 'Not Published' }),
    ]));
    await repository.run("UPDATE blog_posts SET active = FALSE, state = 'Archived' WHERE id = 'blog-post-demo-002'");
    expect((await repository.querySource(source, { q: null, state: null, active: 'active' }, 0, 50)).data.map((row: any) => row.id)).not.toContain('blog-post-demo-002');
    expect((await repository.querySource(source, { q: null, state: null, active: 'archived' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'blog-post-demo-002', publication_status: 'Not Published', state: 'Archived' }),
    ]);
    database.close();
  });

  test('keeps kanban card state after a file-backed restart and migration reapply', async () => {
    const databasePath = `/tmp/core3-blog-post-kanban-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_post_kanban_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const source = yaml('api/posts.yaml').datasources.find((candidate: any) => candidate.id === 'blog_posts');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const firstRows = (await firstRepository.querySource(source, { q: null, state: 'Published', active: 'active' }, 0, 50)).data;
    expect(firstRows).toEqual([expect.objectContaining({ id: 'blog-post-demo-001', publication_status: 'Published' })]);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.querySource(source, { q: null, state: 'Published', active: 'active' }, 0, 50)).data)
      .toEqual([expect.objectContaining({ id: 'blog-post-demo-001', publication_status: 'Published' })]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
