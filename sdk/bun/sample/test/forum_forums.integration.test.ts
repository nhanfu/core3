import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Forum Forums list action', () => {
  test('joins the presentation page to the API and records the Odoo list contract', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/forums.yaml');
    const api = yaml('api/forums.yaml');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'forum-forums', route: '/forums', auth: { require: ['forum.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list).toMatchObject({ source: 'forum_forums', empty_state: { title: 'No forums found' } });
    expect(list.columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'website_name', 'total_posts', 'total_views']);
    expect(api.page.id).toBe('forum-forums');
    expect(discovered.pageDatasources.get('forum-forums')).toEqual(['forum_forums']);
    expect(api.datasources[0].permission).toBe('forum.read');
  });

  test('supports active, archived, search, empty, and transport-error fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'forum_forums_schema_migrations', ['schema', 'data']);
    const source = yaml('api/forums.yaml').datasources[0];
    const params = { q: null, active: 'active', fixture_state: null };

    const active = await repository.querySource(source, params, 0, 50);
    expect(active.data.map((row: any) => row.name)).toEqual(['Core3 Platform Q&A']);
    expect(active.data[0]).toMatchObject({ total_posts: 2, total_views: 59, active: true });
    expect((await repository.querySource(source, { ...params, active: 'archived' })).data.map((row: any) => row.name)).toEqual(['Legacy Forum']);
    expect((await repository.querySource(source, { ...params, q: 'platform' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'FORUM_FORUMS_UNAVAILABLE' });
    database.close();
  });
});
