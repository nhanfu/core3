import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events Event Tag Categories detail parity', () => {
  test('binds the list/detail workflow through page IDs and Odoo form controls', () => {
    const page = yaml('pages/event-tags.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const detailPage = yaml('pages/event-tag-category-detail.yaml');
    const detail = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(list).toMatchObject({ row_open_action: 'view_event_tag_category', row_double_click_action: 'view_event_tag_category', empty_state: { title: 'No event tag categories' } });
    expect(page.actions.find((action: any) => action.id === 'view_event_tag_category')).toMatchObject({ navigate_to: '/events/tags/detail', permission: 'events.read' });
    expect(detailPage.page).toMatchObject({ id: 'event-tag-category-detail', route: '/events/tags/detail', auth: { require: ['events.read'] } });
    expect(detail.header_actions.map((action: any) => action.id)).toEqual(['back_to_event_tag_categories', 'edit_event_tag_category', 'delete_event_tag_category']);
    expect(yaml('api/event-tag-category-detail.yaml').page.id).toBe('event-tag-category-detail');
    expect(discovered.pageDatasources.get('event-tag-category-detail')).toContain('event_tag_category_detail');
  });

  test('seeds deterministic categories and guards duplicate, missing, and detail reads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_tags_test_schema_migrations', ['schema', 'data']);

    const source = yaml('api/event-tag-category-detail.yaml').datasources[0];
    const detail = await repository.querySource(source, { id: 'tag-culture', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'tag-culture', name: 'Culture', row_version: 1, tags: 'Music, Sport' });
    expect((await repository.querySource(source, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const create = yaml('pages/event-tags.yaml').actions.find((action: any) => action.id === 'create_event_tag_category');
    const update = yaml('pages/event-tag-category-detail.yaml').actions.find((action: any) => action.id === 'edit_event_tag_category');
    expect(create.mutation.guards[0]).toMatchObject({ status: 409, code: 'EVENT_TAG_CATEGORY_EXISTS' });
    expect(update.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409]);
    expect(yaml('migrations/20260910231000-012-event-tag-category-detail.yaml').version).toBe('0.0.12');
  });
});
