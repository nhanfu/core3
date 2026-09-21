import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('BLOG-TAG-POSTS-001', () => {
  test('maps the Odoo Tag form reverse relation through separate page/API YAML', () => {
    const listPage = yaml('pages/tags.yaml');
    const detailPage = yaml('pages/tag-detail.yaml');
    const api = yaml('api/tag-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_blog_views.xml', 'utf8');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(api.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(listPage.components[0].form_view).toEqual({ page: 'apps/services/blog/pages/tag-detail.yaml', side_panel: true });
    expect(detailPage.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'blog_tag_posts', parent_source: 'blog_tag_detail', title: 'Used in' });
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'back_to_blog_tags', 'edit_blog_tag_detail', 'add_blog_tag_post', 'remove_blog_tag_post',
    ]);
    expect(discovered.pageDatasources.get('blog-tag-detail')).toEqual([
      'blog_tag_detail_form', 'blog_tag_posts', 'blog_tag_post_lookup',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ page: 'blog-tag-detail', path: '/blog-tags/detail' }));
    expect(source).toContain('<field name="post_ids"/>');
    expect(source).toContain('<label for="post_ids" string="Used in: "/>');
  });

  test('persists reverse tag assignment/removal with parent and line concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_tag_posts_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_tag_posts_test', ['schema', 'data']);
    const api = yaml('api/tag-detail.yaml');
    const add = api.actions.find((action: any) => action.id === 'add_blog_tag_post');
    const remove = api.actions.find((action: any) => action.id === 'remove_blog_tag_post');

    expect(await repository.query('SELECT post_id FROM blog_post_tags WHERE tag_id = ? ORDER BY post_id', ['blog-tag-demo-001']))
      .toEqual([{ post_id: 'blog-post-demo-001' }]);
    const added = await repository.executeMutation(add.mutation, {
      id: 'blog-tag-demo-001', parent_expected_row_version: 1,
      values: { post_id: 'blog-post-demo-002' },
    });
    expect(added).toMatchObject({ tag_id: 'blog-tag-demo-001', post_id: 'blog-post-demo-002', name: 'Inside the migration pipeline', row_version: 1 });
    expect((await repository.query('SELECT tags, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toMatchObject({ tags: 'migrations, yaml', row_version: 2 });
    expect((await repository.query('SELECT row_version FROM blog_tags WHERE id = ?', ['blog-tag-demo-001']))[0])
      .toEqual({ row_version: 2 });

    await expect(repository.executeMutation(add.mutation, {
      id: 'blog-tag-demo-001', parent_expected_row_version: 2, values: { post_id: 'blog-post-demo-002' },
    })).rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_POST_EXISTS' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'blog-tag-demo-001', parent_expected_row_version: 1, values: { post_id: 'missing-post' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM blog_post_tags WHERE tag_id = ?', ['blog-tag-demo-001']))
      .toEqual([{ count: 2 }]);

    const relation = (await repository.query('SELECT id, row_version FROM blog_post_tags WHERE tag_id = ? AND post_id = ?', ['blog-tag-demo-001', 'blog-post-demo-002']))[0];
    const removed = await repository.executeMutation(remove.mutation, {
      id: 'blog-tag-demo-001', line_id: relation.id, parent_expected_row_version: 2,
      expected_row_version: relation.row_version, values: {},
    });
    expect(removed).toEqual({ deleted: true, id: relation.id });
    expect((await repository.query('SELECT tags, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toMatchObject({ tags: 'migrations', row_version: 3 });
    expect((await repository.query('SELECT row_version FROM blog_tags WHERE id = ?', ['blog-tag-demo-001']))[0])
      .toEqual({ row_version: 3 });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'blog-tag-demo-001', line_id: relation.id, parent_expected_row_version: 3,
      expected_row_version: relation.row_version, values: {},
    })).rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_POST_STALE' });
    database.close();
  });

  test('enforces read/write permissions at the reverse relation action boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_tag_posts_permission_test', ['schema', 'data']);
    const contract = yaml('api/tag-detail.yaml');
    const readOnlyUser = { sub: 'blog-reader', permissions: ['blog.read'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return readOnlyUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(contract.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([['blog-tag-detail', contract.datasources.map((source: any) => source.id)]]),
      pages: new Map([['blog-tag-detail', contract]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['blog.read', 'blog.write'], tables: {}, endpoints: {} }, eventStore: {}, topics: {},
    });
    await expect(api(new Request('http://blog.test/api/actions/blog.tags.posts.add', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'blog-tag-demo-001', expected_row_version: 1, values: { post_id: 'blog-post-demo-002' } }),
    }), new URL('http://blog.test/api/actions/blog.tags.posts.add'))).rejects.toMatchObject({ status: 403 });
    expect(await repository.query('SELECT post_id FROM blog_post_tags WHERE tag_id = ? AND post_id = ?', ['blog-tag-demo-001', 'blog-post-demo-002']))
      .toEqual([]);
    database.close();
  });

  test('retains reverse relation and synchronized post names across restart', async () => {
    const databasePath = `/tmp/core3-blog-tag-posts-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_tag_posts_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const add = yaml('api/tag-detail.yaml').actions.find((action: any) => action.id === 'add_blog_tag_post');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(add.mutation, {
      id: 'blog-tag-demo-001', parent_expected_row_version: 1, values: { post_id: 'blog-post-demo-002' },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT p.name, p.tags FROM blog_post_tags r JOIN blog_posts p ON p.id = r.post_id WHERE r.tag_id = ? ORDER BY p.name', ['blog-tag-demo-001']))
      .toEqual([{ name: 'Inside the migration pipeline', tags: 'migrations, yaml' }, { name: 'Shipping YAML-first services', tags: 'yaml,services' }]);
    expect((await secondRepository.query('SELECT row_version FROM blog_tags WHERE id = ?', ['blog-tag-demo-001']))[0])
      .toEqual({ row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
