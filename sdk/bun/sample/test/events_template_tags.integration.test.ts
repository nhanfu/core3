import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/event-template-detail.yaml');
const page = yaml('pages/event-template-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Events event template tag_ids parity', () => {
  test('maps Odoo event.type tag_ids through the existing page/API pair', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_type_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_type.py', 'utf8');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid' && component.source === 'event_template_tags');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(sourceView).toContain('field name="tag_ids" widget="many2many_tags"');
    expect(sourceModel).toContain('tag_ids = fields.Many2many');
    expect(sourceModel).toContain("'event.tag'");
    expect(page.components[0].datasources).toBeUndefined();
    expect(grid).toMatchObject({ source: 'event_template_tags', parent_source: 'event_template_detail', variant: 'odoo_x2many' });
    expect(grid.actions).toEqual([expect.objectContaining({ id: 'add_event_template_tag', label: 'Add a tag' })]);
    expect(discovered.pageDatasources.get('event-template-detail')).toEqual(expect.arrayContaining([
      'event_template_detail', 'event_template_tags', 'event_template_tag_options',
    ]));
    expect(action('add_event_template_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'create' });
    expect(action('remove_event_template_tag')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'delete' });
  });

  test('persists template tag links with scoped options, duplicate, stale, replay, and restart guards', async () => {
    const databasePath = `/tmp/core3-events-template-tags-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_template_tags_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

      const initialDetail = (await repository.querySource(source('event_template_detail'), { id: 'template-exhibition', fixture_state: null }, 0, 1)).data as any;
      expect(initialDetail).toMatchObject({ id: 'template-exhibition', row_version: 1 });
      const initialRowVersion = initialDetail.row_version;
      expect((await repository.querySource(source('event_template_tags'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data)
        .toMatchObject([
          { id: 'event-template-tag-exhibition-music', tag_id: 'event-tag-culture-music', name: 'Music', category: 'Culture', row_version: 1 },
          { id: 'event-template-tag-exhibition-conference', tag_id: 'event-tag-activity-conference', name: 'Conference', category: 'Activity', row_version: 1 },
        ]);
      expect((await repository.querySource(source('event_template_tag_options'), { id: 'template-exhibition' }, 0, 50)).data)
        .toEqual([{ value: 'event-tag-culture-sport', label: 'Sport · Culture' }]);
      expect((await repository.querySource(source('event_template_tags'), { id: 'template-exhibition', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

      const add = action('add_event_template_tag');
      const remove = action('remove_event_template_tag');
      const linked = await repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: initialRowVersion, values: { tag_id: 'event-tag-culture-sport' },
      }) as any;
      expect(linked).toMatchObject({ id: 'event-template-tag-template-exhibition-event-tag-culture-sport', name: 'Sport', category: 'Culture', sequence: 30, row_version: 1 });
      expect((await repository.querySource(source('event_template_tag_options'), { id: 'template-exhibition' }, 0, 50)).data).toEqual([]);
      await expect(repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: initialRowVersion + 1, values: { tag_id: 'event-tag-culture-sport' },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_TAG_EXISTS' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: initialRowVersion + 1, values: { tag_id: 'missing-tag' },
      })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_TAG_INVALID' });
      await expect(repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: initialRowVersion, expected_row_version: 1,
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(source('event_template_tags'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data)
        .toEqual(expect.arrayContaining([expect.objectContaining({ id: linked.id, name: 'Sport' })]));
      const current = (await repository.query("SELECT row_version FROM event_templates WHERE id = 'template-exhibition'"))[0] as any;
      await repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: current.row_version, expected_row_version: 1,
      });
      await expect(repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: Number(current.row_version) + 1, expected_row_version: 1,
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_TAG_STALE' });
      expect((await repository.querySource(source('event_template_tags'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
        .toEqual(['Music', 'Conference']);
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
