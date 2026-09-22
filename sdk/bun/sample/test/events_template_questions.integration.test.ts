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

describe('Events event template question relation parity', () => {
  test('maps Odoo template question_ids through the existing page/API pair', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_type_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_type.py', 'utf8');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid' && component.source === 'event_template_questions');
    const questionsTab = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'questions');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(sourceView).toContain('field name="question_ids"');
    expect(sourceView).toContain('string="Questions"');
    expect(model).toContain('question_ids = fields.Many2many(');
    expect(model).toContain("'event.question'");
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'event-template-detail' });
    expect(questionsTab).toMatchObject({ id: 'questions', label: 'Questions', content_slot: true });
    expect(grid).toMatchObject({ source: 'event_template_questions', parent_source: 'event_template_detail', variant: 'odoo_x2many' });
    expect(grid.actions).toEqual([expect.objectContaining({ id: 'add_event_template_question', label: 'Add a line' })]);
    expect(discovered.pageDatasources.get('event-template-detail')).toEqual(expect.arrayContaining([
      'event_template_detail', 'event_template_communications', 'event_template_questions', 'event_template_question_options',
    ]));
    expect(action('add_event_template_question')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'create' });
    expect(action('remove_event_template_question')).toMatchObject({ permission: 'events.write', handler: 'line_item', operation: 'delete' });
    expect(action('remove_event_template_question').mutation.concurrency).toMatchObject({ required: true });
  });

  test('persists template question links with reusable options, duplicate, stale, replay, and restart guards', async () => {
    const databasePath = `/tmp/core3-events-template-questions-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_template_questions_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

      expect((await repository.querySource(source('event_template_questions'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
        .toEqual(['Name', 'Email', 'Phone']);
      expect((await repository.querySource(source('event_template_question_options'), { id: 'template-exhibition' }, 0, 50)).data)
        .toMatchObject([{ value: 'question-dietary', label: 'Dietary requirements' }]);
      expect((await repository.querySource(source('event_template_questions'), { id: 'template-exhibition', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

      const add = action('add_event_template_question');
      const remove = action('remove_event_template_question');
      const linked = await repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: 1, values: { question_id: 'question-dietary' },
      }) as any;
      expect(linked).toMatchObject({ id: 'event-template-question-template-exhibition-question-dietary', title: 'Dietary requirements', sequence: 40, row_version: 1 });
      expect((await repository.querySource(source('event_template_question_options'), { id: 'template-exhibition' }, 0, 50)).data).toEqual([]);

      await expect(repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: 2, values: { question_id: 'question-dietary' },
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_QUESTION_EXISTS' });
      await expect(repository.executeMutation(add.mutation, {
        id: 'template-exhibition', parent_expected_row_version: 2, values: { question_id: 'missing-question' },
      })).rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_QUESTION_INVALID' });
      await expect(repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: 1, expected_row_version: 1,
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(source('event_template_questions'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data)
        .toEqual(expect.arrayContaining([expect.objectContaining({ id: linked.id, title: 'Dietary requirements' })]));
      const current = (await repository.query("SELECT row_version FROM event_templates WHERE id = 'template-exhibition'"))[0] as any;
      await repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: current.row_version, expected_row_version: 1,
      });
      await expect(repository.executeMutation(remove.mutation, {
        id: 'template-exhibition', line_id: linked.id, parent_expected_row_version: Number(current.row_version) + 1, expected_row_version: 1,
      })).rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_QUESTION_STALE' });
      expect((await repository.querySource(source('event_template_questions'), { id: 'template-exhibition', fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
        .toEqual(['Name', 'Email', 'Phone']);
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
