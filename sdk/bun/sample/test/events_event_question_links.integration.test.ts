import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = () => yaml('pages/event-detail.yaml');
const api = () => yaml('api/event-detail.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api().datasources.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_question_links_test_schema_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Events event-question relation parity', () => {
  test('maps the Odoo Questions notebook and keeps the page/API contract joined', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const eventPage = page();
    const eventApi = api();
    const questions = eventPage.components.find((component: any) => component.type === 'TabGroup').tabs
      .find((tab: any) => tab.id === 'questions').components[0];
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(sourceView).toContain('field name="question_ids"');
    expect(sourceView).toContain('string="Questions"');
    expect(sourceView).toContain("context=\"{'list_view_ref': 'event.event_question_view_list_add'}\"");
    expect(eventPage.datasources).toBeUndefined();
    expect(eventApi.page).toEqual({ id: 'event-detail' });
    expect(questions).toMatchObject({ source: 'event_detail_questions', create_action: 'add_event_detail_question', create_label: 'Add a line' });
    expect(questions.columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'mandatory', label: 'Mandatory' }),
      expect.objectContaining({ field: 'once_per_order', label: 'Once per Order' }),
    ]));
    expect(source('event_detail_question_options')).toMatchObject({ permission: 'events.read' });
    expect(action('add_event_detail_question')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'create' });
    expect(action('edit_event_detail_question')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'update' });
    expect(action('remove_event_detail_question')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'delete' });
    expect(discovered.pageDatasources.get('event-detail')).toEqual(expect.arrayContaining(['event_detail_questions', 'event_detail_question_options']));
  });

  test('seeds durable event links and excludes already-linked questions from Add a line', async () => {
    const { database, repository } = await repositoryForTest();
    try {
      const linked = await repository.querySource(source('event_detail_questions'), { id: 'event-demo-001', fixture_state: null }, 0, 50);
      expect(linked.data.map((row: any) => row.question)).toEqual(['Name', 'Email', 'Phone']);
      expect(linked.data.map((row: any) => row.sequence)).toEqual([10, 20, 30]);
      const options = await repository.querySource(source('event_detail_question_options'), { id: 'event-demo-001' }, 0, 50);
      expect(options.data).toEqual([{ value: 'question-dietary', label: 'Dietary requirements' }]);
      expect((await repository.querySource(source('event_detail_questions'), { id: 'event-demo-001', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    } finally {
      await database.close();
    }
  });

  test('attaches, edits, detaches, and persists event questions with permission and stale guards', async () => {
    const databasePath = `/tmp/core3-events-question-links-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_question_links_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const add = action('add_event_detail_question');
      const edit = action('edit_event_detail_question');
      const remove = action('remove_event_detail_question');
      const initial = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0] as any;
      const linked = await repository.executeMutation(add.mutation, {
        id: 'event-demo-001',
        parent_expected_row_version: initial.row_version,
        values: { question_id: 'question-dietary' },
      }) as any;
      expect(linked).toMatchObject({ event_id: 'event-demo-001', question_id: 'question-dietary', question: 'Dietary requirements', sequence: 40, row_version: 1 });
      expect(Number((await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0].row_version)).toBe(Number(initial.row_version) + 1);
      await expect(repository.executeMutation(add.mutation, {
        id: 'event-demo-001',
        parent_expected_row_version: initial.row_version + 1,
        values: { question_id: 'question-dietary' },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_EVENT_QUESTION_EXISTS' });

      const afterAdd = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0] as any;
      const edited = await repository.executeMutation(edit.mutation, {
        id: 'event-demo-001',
        line_id: linked.id,
        parent_expected_row_version: afterAdd.row_version,
        expected_row_version: linked.row_version,
        values: { mandatory: true, once_per_order: true, sequence: 5 },
      }) as any;
      expect(edited).toMatchObject({ id: linked.id, mandatory: true, once_per_order: true, sequence: 5, row_version: 2 });
      await expect(repository.executeMutation(edit.mutation, {
        id: 'event-demo-001',
        line_id: linked.id,
        parent_expected_row_version: afterAdd.row_version + 1,
        expected_row_version: linked.row_version,
        values: { mandatory: false, once_per_order: false, sequence: 6 },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_EVENT_QUESTION_STALE' });

      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const persisted = await repository.querySource(source('event_detail_questions'), { id: 'event-demo-001', fixture_state: null }, 0, 50);
      expect(persisted.data.find((row: any) => row.id === linked.id)).toMatchObject({ question: 'Dietary requirements', mandatory: true, once_per_order: true, sequence: 5, row_version: 2 });
      const current = (await repository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0] as any;
      await repository.executeMutation(remove.mutation, {
        id: 'event-demo-001',
        line_id: linked.id,
        parent_expected_row_version: current.row_version,
        expected_row_version: 2,
      });
      expect((await repository.querySource(source('event_detail_questions'), { id: 'event-demo-001', fixture_state: null }, 0, 50)).data.some((row: any) => row.id === linked.id)).toBe(false);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
