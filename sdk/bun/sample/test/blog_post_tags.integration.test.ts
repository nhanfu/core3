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

describe('Blog post tag_ids parity slice', () => {
  test('keeps the post form presentation separate from its API relation contract', () => {
    const page = yaml('pages/post-detail.yaml');
    const api = yaml('api/post-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('blog-post-detail')).toEqual([
      'blog_post_detail', 'blog_post_attachments', 'blog_post_tags', 'blog_post_tag_lookup',
    ]);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ page: 'blog-post-detail' }));
    expect(page.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'blog_post_tags', parent_source: 'blog_post_detail' });
    expect(api.actions.find((action: any) => action.id === 'add_blog_post_tag')).toMatchObject({ permission: 'blog.write', handler: 'line_item' });
    expect(api.actions.find((action: any) => action.id === 'remove_blog_post_tag')).toMatchObject({ permission: 'blog.write', handler: 'line_item' });
    expect(api.datasources.find((source: any) => source.id === 'blog_post_tag_lookup').permission).toBe('blog.read');
  });

  test('persists Odoo-style tag assignment/removal with parent and line concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_tags_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_tags_test', ['schema', 'data']);
    const api = yaml('api/post-detail.yaml');
    const add = api.actions.find((action: any) => action.id === 'add_blog_post_tag');
    const remove = api.actions.find((action: any) => action.id === 'remove_blog_post_tag');

    expect((await repository.query('SELECT tag_id FROM blog_post_tags WHERE post_id = ? ORDER BY tag_id', ['blog-post-demo-002'])))
      .toEqual([{ tag_id: 'blog-tag-demo-003' }]);
    const added = await repository.executeMutation(add.mutation, {
      id: 'blog-post-demo-002',
      parent_expected_row_version: 1,
      values: { tag_id: 'blog-tag-demo-001' },
    });
    expect(added).toMatchObject({ post_id: 'blog-post-demo-002', tag_id: 'blog-tag-demo-001', name: 'yaml', row_version: 1 });
    expect((await repository.query('SELECT tags, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toMatchObject({ tags: 'migrations, yaml', row_version: 2 });
    await expect(repository.executeMutation(add.mutation, {
      id: 'blog-post-demo-002', parent_expected_row_version: 2, values: { tag_id: 'blog-tag-demo-001' },
    })).rejects.toMatchObject({ status: 409, code: 'BLOG_POST_TAG_EXISTS' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'blog-post-demo-002', parent_expected_row_version: 1, values: { tag_id: 'blog-tag-demo-002' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const relation = (await repository.query('SELECT id, row_version FROM blog_post_tags WHERE post_id = ? AND tag_id = ?', ['blog-post-demo-002', 'blog-tag-demo-001']))[0];
    const removed = await repository.executeMutation(remove.mutation, {
      id: 'blog-post-demo-002', line_id: relation.id, parent_expected_row_version: 2,
      expected_row_version: relation.row_version, values: {},
    });
    expect(removed).toEqual({ deleted: true, id: relation.id });
    expect((await repository.query('SELECT tags, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toMatchObject({ tags: 'migrations', row_version: 3 });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'blog-post-demo-002', line_id: relation.id, parent_expected_row_version: 2,
      expected_row_version: relation.row_version, values: {},
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('enforces read/write permissions at the declared action boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_tags_permission_test', ['schema', 'data']);
    const contract = yaml('api/post-detail.yaml');
    const readOnlyUser = { sub: 'blog-reader', permissions: ['blog.read'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return readOnlyUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(contract.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([['blog-post-detail', contract.datasources.map((source: any) => source.id)]]),
      pages: new Map([['blog-post-detail', contract]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['blog.read', 'blog.write'], tables: {}, endpoints: {} }, eventStore: {}, topics: {},
    });
    await expect(api(new Request('http://blog.test/api/actions/blog.posts.tags.add', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'blog-post-demo-002', expected_row_version: 1, values: { tag_id: 'blog-tag-demo-001' } }),
    }), new URL('http://blog.test/api/actions/blog.posts.tags.add'))).rejects.toMatchObject({ status: 403 });
    database.close();
  });

  test('retains post tag relations and denormalized names across restart', async () => {
    const databasePath = `/tmp/core3-blog-post-tags-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_post_tags_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const contract = yaml('api/post-detail.yaml');
    const add = contract.actions.find((action: any) => action.id === 'add_blog_post_tag');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(add.mutation, { id: 'blog-post-demo-002', parent_expected_row_version: 1, values: { tag_id: 'blog-tag-demo-001' } });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT t.name FROM blog_post_tags r JOIN blog_tags t ON t.id = r.tag_id WHERE r.post_id = ? ORDER BY t.name', ['blog-post-demo-002'])))
      .toEqual([{ name: 'migrations' }, { name: 'yaml' }]);
    expect((await secondRepository.query('SELECT tags, row_version FROM blog_posts WHERE id = ?', ['blog-post-demo-002']))[0])
      .toMatchObject({ tags: 'migrations, yaml', row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
