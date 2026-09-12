import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Forum Posts website-content slice', () => {
  test('keeps the Odoo Forum Posts action trace and page/API separation', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/forum-post-pages.yaml');
    const api = yaml('api/forum-post-pages.yaml');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'forum-post-pages', route: '/forum-post-pages', auth: { require: ['forum.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list).toMatchObject({ source: 'forum_post_pages', view_navigation: 'tabs', default_filters: { content_scope: 'posts' }, empty_state: { title: 'No forum posts found' } });
    expect(list.views.map((view: any) => view.label)).toEqual(['List', 'Kanban', 'Graph']);
    expect(api.page.id).toBe('forum-post-pages');
    expect(discovered.pageDatasources.get('forum-post-pages')).toEqual(['forum_post_page_states', 'forum_post_pages']);
    expect(api.actions[0]).toMatchObject({ id: 'open_forum_post_page', permission: 'forum.read', navigate_to: '/forum-question-detail' });
  });

  test('supports deterministic populated, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_post_pages_schema_migrations', ['schema', 'data']);
    const source = yaml('api/forum-post-pages.yaml').datasources[1];
    const params = { q: null, state: null, content_scope: 'posts', fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.title)).toEqual(['Migration ordering across services', 'How do I add a new YAML service?']);
    expect(populated.data[0]).toMatchObject({ forum_name: 'Core3 Platform Q&A', answer_count: 0, is_seo_optimized: true });
    expect((await repository.querySource(source, { ...params, q: 'yaml' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'FORUM_POST_PAGES_UNAVAILABLE' });
    database.close();
  });
});
