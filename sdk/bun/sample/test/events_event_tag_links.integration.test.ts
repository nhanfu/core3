import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/event-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Events event.event tag_ids parity', () => {
  test('maps the source many2many_tags field through the event detail page/API contract', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const page = yaml('pages/event-detail.yaml');
    const tabs = page.components.find((component: any) => component.type === 'TabGroup');
    const tags = tabs.tabs.find((tab: any) => tab.id === 'tags');
    const grid = tags.components.find((component: any) => component.type === 'LineItemGrid');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(sourceView).toContain('field name="tag_ids" widget="many2many_tags"');
    expect(sourceModel).toContain('tag_ids = fields.Many2many(');
    expect(sourceModel).toContain("        'event.tag', string=\"Tags\"");
    expect(page.datasources).toBeUndefined();
    expect(tags.label).toBe('Tags');
    expect(grid).toMatchObject({
      source: 'event_detail_tags',
      parent_source: 'event_detail',
      variant: 'odoo_x2many',
      actions: [expect.objectContaining({ id: 'add_event_detail_tag', label: 'Add a tag' })],
    });
    expect(grid.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name', label: 'Tag', readonly: true }),
      expect.objectContaining({ field: 'category', label: 'Category', readonly: true }),
    ]));
    expect(api.page).toEqual({ id: 'event-detail' });
    expect(discovered.pageDatasources.get('event-detail')).toContain('event_detail_tags');
    expect(discovered.pageDatasources.get('event-detail')).toContain('event_detail_tag_options');
    expect(action('add_event_detail_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'create' });
    expect(action('remove_event_detail_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'delete' });
  });

  test('persists scoped tag links, guards duplicates/stale writes, and survives restart', async () => {
    const databasePath = `/tmp/core3-events-event-tags-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_event_tags_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);

      const initialDetail = (await repository.querySource(source('event_detail'), { id: 'event-demo-001', fixture_state: null }, 0, 1)).data as any;
      expect(initialDetail).toMatchObject({ id: 'event-demo-001', tags: 'Music, Conference' });
      const initialRowVersion = initialDetail.row_version;
      expect((await repository.querySource(source('event_detail_tags'), { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
        .toMatchObject([
          { id: 'event-tag-link-event-demo-001-music', tag_id: 'event-tag-culture-music', name: 'Music', category: 'Culture', row_version: 1 },
          { id: 'event-tag-link-event-demo-001-conference', tag_id: 'event-tag-activity-conference', name: 'Conference', category: 'Activity', row_version: 1 },
        ]);
      expect((await repository.querySource(source('event_detail_tag_options'), { id: 'event-demo-001' }, 0, 50)).data)
        .toEqual([{ value: 'event-tag-culture-sport', label: 'Sport · Culture' }]);
      expect((await repository.querySource(source('event_detail_tags'), { id: 'event-demo-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

      const add = action('add_event_detail_tag');
      const remove = action('remove_event_detail_tag');
      const created = await repository.executeMutation(add.mutation, {
        id: 'event-demo-001', parent_expected_row_version: initialRowVersion,
        values: { tag_id: 'event-tag-culture-sport' },
      }) as any;
      expect(created).toMatchObject({
        id: 'event-tag-link-event-demo-001-event-tag-culture-sport', tag_id: 'event-tag-culture-sport', name: 'Sport', category: 'Culture', row_version: 1,
      });
      const afterAdd = (await repository.querySource(source('event_detail'), { id: 'event-demo-001', fixture_state: null }, 0, 1)).data as any;
      expect(afterAdd).toMatchObject({ tags: 'Music, Conference, Sport', row_version: initialRowVersion + 1 });
      await expect(repository.executeMutation(add.mutation, {
        id: 'event-demo-001', parent_expected_row_version: initialRowVersion + 1, values: { tag_id: 'event-tag-culture-sport' },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_EVENT_TAG_EXISTS' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'event-demo-001', parent_expected_row_version: initialRowVersion, values: { tag_id: 'event-tag-culture-sport' },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TAG_EVENT_CLOSED' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'event-demo-001', parent_expected_row_version: initialRowVersion + 1, values: { tag_id: 'unknown-event-tag' },
      })).rejects.toMatchObject({ status: 422, code: 'EVENT_EVENT_TAG_INVALID' });

      await repository.executeMutation(remove.mutation, {
        id: 'event-demo-001', line_id: created.id, parent_expected_row_version: initialRowVersion + 1, expected_row_version: 1,
      });
      expect((await repository.querySource(source('event_detail_tags'), { id: 'event-demo-001', fixture_state: null }, 0, 50)).data)
        .toHaveLength(2);
      await expect(repository.executeMutation(remove.mutation, {
        id: 'event-demo-001', line_id: 'event-tag-link-event-demo-001-music', parent_expected_row_version: initialRowVersion + 2, expected_row_version: 99,
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_EVENT_TAG_STALE' });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(source('event_detail_tags'), { id: 'event-demo-001', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
        .toEqual(['Music', 'Conference']);
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
