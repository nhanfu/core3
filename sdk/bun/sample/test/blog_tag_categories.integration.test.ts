import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog Tag Categories parity slice', () => {
  test('traces the Odoo configuration menu and joined page/API contract', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items.map((item: any) => item.label)).toEqual(['Blogs', 'Tags', 'Tag Categories']);
    expect(configuration.items[2]).toMatchObject({ path: '/blog-tag-categories', permission: 'blog.read' });
    const page = yaml('pages/tag-categories.yaml');
    const api = yaml('api/tag-categories.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('blog-tag-categories')).toEqual(['blog_tag_categories', 'blog_tag_category_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual(expect.objectContaining({ page: 'blog-tag-categories', path: '/blog-tag-categories' }));
  });

  test('matches the Odoo list/form fields and enforces permissions and validation', () => {
    const page = yaml('pages/tag-categories.yaml');
    const api = yaml('api/tag-categories.yaml');
    expect(page.components[0].columns[0]).toEqual({ field: 'name', label: 'Name', type: 'PrimaryEntityCell' });
    expect(api.actions.map((action: any) => action.id)).toEqual(['create_blog_tag_category', 'edit_blog_tag_category', 'delete_blog_tag_category']);
    for (const action of api.actions) expect(action.permission).toBe('blog.write');
    expect(api.actions[0].mutation.guards.map((guard: any) => guard.code)).toEqual(['BLOG_TAG_CATEGORY_NAME_REQUIRED', 'BLOG_TAG_CATEGORY_EXISTS']);
    expect(page.components[0].columns[1].actions).toEqual([
      { id: 'edit_blog_tag_category', label: 'Edit', icon: 'edit' },
      { id: 'delete_blog_tag_category', label: 'Delete', icon: 'trash', variant: 'danger' },
    ]);
    expect(api.actions[2].mutation).toMatchObject({ operation: 'delete', table: 'blog_tag_categories', concurrency: { required: true } });
    expect(api.actions[2].mutation.guards.map((guard: any) => guard.code)).toEqual(['BLOG_TAG_CATEGORY_NOT_FOUND', 'BLOG_TAG_CATEGORY_IN_USE']);
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
    expect(yaml('migrations/20260912100000-003-blog-tag-categories.yaml').type.postgres.up).toContain('Technology');
  });

  test('deletes an unused category and protects referenced categories and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_tag_category_delete_test', ['schema', 'data']);
    const api = yaml('api/tag-categories.yaml');
    const remove = api.actions.find((action: any) => action.id === 'delete_blog_tag_category');

    await expect(repository.executeMutation(remove.mutation, { id: 'blog-category-demo-001', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_CATEGORY_IN_USE' });

    const create = api.actions.find((action: any) => action.id === 'create_blog_tag_category');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Unused category' } });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 0 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 });
    expect(await repository.query('SELECT id FROM blog_tag_categories WHERE id = ?', [created.id])).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'BLOG_TAG_CATEGORY_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'blog-category-demo-001', expected_row_version: 0 }))
      .rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_CATEGORY_IN_USE' });
    database.close();
  });
});
