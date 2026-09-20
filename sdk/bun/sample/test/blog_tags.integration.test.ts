import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog Tags parity slice', () => {
  test('keeps the page presentation separate from its joined API contract', () => {
    const page = yaml('pages/tags.yaml');
    const api = yaml('api/tags.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('blog-tags')).toEqual(['blog_tags', 'blog_tag_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual(expect.objectContaining({ page: 'blog-tags', path: '/blog-tags' }));
    expect(page.components[0].columns.at(-1).actions).toEqual([
      { id: 'edit_blog_tag', label: 'Edit', icon: 'edit' },
      { id: 'delete_blog_tag', label: 'Delete', icon: 'trash', variant: 'danger' },
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual(['create_blog_tag', 'edit_blog_tag', 'delete_blog_tag']);
    expect(api.actions.every((action: any) => action.permission === 'blog.write')).toBe(true);
  });

  test('persists tag CRUD, rejects duplicates and protects referenced tags', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_tags_test', ['schema', 'data']);
    const api = yaml('api/tags.yaml');
    const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

    await expect(repository.executeMutation(action('create_blog_tag').mutation, { values: { name: '  ' } }))
      .rejects.toMatchObject({ status: 422, code: 'BLOG_TAG_NAME_REQUIRED' });
    await expect(repository.executeMutation(action('create_blog_tag').mutation, { values: { name: 'YAML' } }))
      .rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_EXISTS' });

    const created = await repository.executeMutation(action('create_blog_tag').mutation, { values: { name: 'Release', category: 'Technology', color: 4 } });
    expect(created).toMatchObject({ name: 'Release', category: 'Technology', color: 4, row_version: 1 });
    await repository.executeMutation(action('edit_blog_tag').mutation, { id: created.id, expected_row_version: 1, values: { name: 'Release Notes', category: 'Technology', color: 6 } });
    await expect(repository.executeMutation(action('edit_blog_tag').mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', category: 'Technology', color: 7 } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_blog_tag').mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT id FROM blog_tags WHERE id = ?', [created.id])).toEqual([]);
    await expect(repository.executeMutation(action('delete_blog_tag').mutation, { id: 'blog-tag-demo-001', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_IN_USE' });
    database.close();
  });

  test('preserves tag edits across restart and rejects a retried duplicate', async () => {
    const databasePath = `/tmp/core3-blog-tag-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_tag_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const api = yaml('api/tags.yaml');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_blog_tag');
    const edit = api.actions.find((candidate: any) => candidate.id === 'edit_blog_tag');

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(create.mutation, {
      values: { name: 'Restart Release', category: 'Technology', color: 3 },
    });
    const updated = await firstRepository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: created.row_version,
      values: { name: 'Restart Release Notes', category: 'Technology', color: 8 },
    });
    expect(updated).toMatchObject({ id: created.id, name: 'Restart Release Notes', color: 8, row_version: 2 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, category, color, row_version FROM blog_tags WHERE id = ?', [created.id]))[0])
      .toEqual({ name: 'Restart Release Notes', category: 'Technology', color: 8, row_version: 2 });
    await expect(secondRepository.executeMutation(create.mutation, {
      values: { name: 'Restart Release Notes', category: 'Technology', color: 8 },
    })).rejects.toMatchObject({ status: 409, code: 'BLOG_TAG_EXISTS' });
    expect((await secondRepository.query("SELECT COUNT(*) AS count FROM blog_tags WHERE name = 'Restart Release Notes'", []))[0].count).toBe(1);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
