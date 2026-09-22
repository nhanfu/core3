import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/event-tag-category-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Events tag category relation parity', () => {
  test('maps the Odoo tag_ids editor through the category detail page/API contract', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_tag_views.xml', 'utf8');
    const page = yaml('pages/event-tag-category-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(sourceView).toContain('field name="tag_ids"');
    expect(sourceView).toContain('field name="color" widget="color_picker"');
    expect(page.datasources).toBeUndefined();
    expect(grid).toMatchObject({
      source: 'event_tag_category_tags',
      parent_source: 'event_tag_category_detail',
      variant: 'odoo_x2many',
      actions: [expect.objectContaining({ id: 'add_event_tag', label: 'Add a line' })],
    });
    expect(grid.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'sequence', label: '#' }),
      expect.objectContaining({ field: 'name', label: 'Tag' }),
      expect.objectContaining({ field: 'color', label: 'Color', input_type: 'number' }),
    ]));
    expect(api.page).toEqual({ id: 'event-tag-category-detail' });
    expect(discovered.pageDatasources.get('event-tag-category-detail')).toEqual([
      'event_tag_category_detail', 'event_tag_category_tags',
    ]);
    expect(action('add_event_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'create' });
    expect(action('edit_event_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'update' });
    expect(action('delete_event_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'delete' });
  });

  test('persists tag CRUD, category summary, permissions, validation, stale guards, and restart state', async () => {
    const databasePath = `/tmp/core3-events-tag-lines-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_tag_lines_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);

      const detail = await repository.querySource(source('event_tag_category_detail'), { id: 'tag-culture', fixture_state: null }, 0, 1);
      expect(detail.data).toMatchObject({ id: 'tag-culture', name: 'Culture', tags: 'Music, Sport', row_version: 1 });
      expect((await repository.querySource(source('event_tag_category_tags'), { id: 'tag-culture', q: null, fixture_state: null }, 0, 50)).data)
        .toMatchObject([
          { id: 'event-tag-culture-music', sequence: 10, name: 'Music', color: 3, row_version: 1 },
          { id: 'event-tag-culture-sport', sequence: 20, name: 'Sport', color: 7, row_version: 1 },
        ]);
      expect((await repository.querySource(source('event_tag_category_tags'), { id: 'tag-culture', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

      const add = action('add_event_tag');
      const edit = action('edit_event_tag');
      const remove = action('delete_event_tag');
      const created = await repository.executeMutation(add.mutation, {
        id: 'tag-culture', parent_expected_row_version: 1,
        values: { name: 'Design', color: 9 },
      }) as any;
      expect(created).toMatchObject({ id: 'event-tag-tag-culture-30', category_id: 'tag-culture', sequence: 30, name: 'Design', color: 9, row_version: 1 });
      expect((await repository.querySource(source('event_tag_category_detail'), { id: 'tag-culture', fixture_state: null }, 0, 1)).data)
        .toMatchObject({ tags: 'Music, Sport, Design', row_version: 2 });
      await expect(repository.executeMutation(add.mutation, {
        id: 'tag-culture', parent_expected_row_version: 2, values: { name: 'music', color: 2 },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TAG_EXISTS' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'tag-culture', parent_expected_row_version: 2, values: { name: 'No color', color: 12 },
      })).rejects.toMatchObject({ status: 422, code: 'EVENT_TAG_COLOR_INVALID' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'tag-culture', parent_expected_row_version: 2, values: { name: ' ', color: 2 },
      })).rejects.toMatchObject({ status: 422, code: 'EVENT_TAG_NAME_REQUIRED' });

      const edited = await repository.executeMutation(edit.mutation, {
        id: 'tag-culture', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1,
        values: { name: 'Design & Music', color: 10 },
      }) as any;
      expect(edited).toMatchObject({ id: created.id, name: 'Design & Music', color: 10, row_version: 2 });
      await expect(repository.executeMutation(edit.mutation, {
        id: 'tag-culture', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1,
        values: { name: 'Stale tag', color: 1 },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TAG_STALE' });

      await repository.executeMutation(remove.mutation, {
        id: 'tag-culture', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 2,
      });
      expect((await repository.querySource(source('event_tag_category_tags'), { id: 'tag-culture', q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
        .toEqual(['Music', 'Sport']);
      expect((await repository.querySource(source('event_tag_category_detail'), { id: 'tag-culture', fixture_state: null }, 0, 1)).data)
        .toMatchObject({ tags: 'Music, Sport', row_version: 4 });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(source('event_tag_category_tags'), { id: 'tag-culture', q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
        .toEqual(['Music', 'Sport']);
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
