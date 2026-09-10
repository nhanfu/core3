import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/event-question-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_question_answers_test_schema_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Events question answer-choice editor parity', () => {
  test('binds the answer editor to the detail page and keeps the Odoo x2many contract', () => {
    const page = yaml('pages/event-question-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const answers = page.components.find((component: any) => component.type === 'LineItemGrid');
    expect(form).toMatchObject({ source: 'event_question_detail', content_slot: true });
    expect(form.notebook.tabs).toEqual([{ id: 'answers', label: 'Answers', content_slot: true }]);
    expect(answers).toMatchObject({ type: 'LineItemGrid', source: 'event_question_answers', parent_source: 'event_question_detail', variant: 'odoo_x2many' });
    expect(answers.children.map((child: any) => child.field).filter(Boolean)).toEqual(['sequence', 'name']);
    expect(api.page.id).toBe('event-question-detail');
    expect(api.datasources.map((source: any) => source.id)).toEqual(['event_question_detail', 'event_question_answers']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('event-question-detail')).toEqual(['event_question_detail', 'event_question_answers']);
  });

  test('keeps every answer action permissioned and concurrency-aware', () => {
    const answers = yaml('pages/event-question-detail.yaml').components.find((component: any) => component.type === 'LineItemGrid');
    for (const id of ['add_event_question_answer', 'edit_event_question_answer', 'delete_event_question_answer']) {
      expect(action(id), id).toMatchObject({ permission: 'events.write', handler: 'line_item' });
    }
    expect(answers.actions[0]).toMatchObject({ id: 'add_event_question_answer', permission: 'events.write' });
    expect(action('edit_event_question_answer').mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409, 409, 422, 409, 422]);
    expect(action('delete_event_question_answer').mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409, 409]);
    expect(api.datasources[1]).toMatchObject({ permission: 'events.read', error_states: { transport_error: { status: 503, code: 'EVENT_QUESTION_ANSWERS_UNAVAILABLE' } } });
  });

  test('supports deterministic answer CRUD, duplicate/validation/stale/missing guards, and parent projection', async () => {
    const { database, repository } = await repositoryForTest();
    const list = api.datasources[1];
    const create = action('add_event_question_answer');
    const edit = action('edit_event_question_answer');
    const remove = action('delete_event_question_answer');
    const initial = await repository.querySource(list, { id: 'question-dietary', fixture_state: null }, 0, 50);
    expect(initial.data.map((row: any) => row.name)).toEqual(['Vegetarian', 'Vegan', 'No preference']);
    expect(initial.data[0]).toMatchObject({ question_id: 'question-dietary', sequence: 10, row_version: 1 });

    const created = await repository.executeMutation(create.mutation, {
      id: 'question-dietary', parent_expected_row_version: 1,
      values: { name: 'Gluten-free', sequence: 40 },
    });
    expect(created).toMatchObject({ question_id: 'question-dietary', name: 'Gluten-free', sequence: 40, row_version: 1 });
    expect((await repository.querySource(list, { id: 'question-dietary', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Vegetarian', 'Vegan', 'No preference', 'Gluten-free']);
    expect((await repository.query('SELECT answers, row_version FROM event_questions WHERE id = ?', ['question-dietary']))[0])
      .toMatchObject({ answers: 'Vegetarian, Vegan, No preference, Gluten-free', row_version: 2 });

    await expect(repository.executeMutation(create.mutation, { id: 'question-dietary', parent_expected_row_version: 2, values: { name: ' gluten-FREE ' } }))
      .rejects.toMatchObject({ status: 409, code: 'EVENT_QUESTION_ANSWER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'question-dietary', parent_expected_row_version: 2, values: { name: '  ' } }))
      .rejects.toMatchObject({ status: 422, code: 'EVENT_QUESTION_ANSWER_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { id: 'question-dietary', parent_expected_row_version: 1, values: { name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'question-dietary', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1,
      values: { name: 'Gluten-free meals', sequence: 5 },
    });
    expect(updated).toMatchObject({ id: created.id, name: 'Gluten-free meals', sequence: 5, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'question-dietary', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1,
      values: { name: 'Stale answer', sequence: 6 },
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_QUESTION_ANSWER_STALE' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'question-dietary', line_id: 'missing-answer', parent_expected_row_version: 3, expected_row_version: 1,
      values: { name: 'Missing answer', sequence: 6 },
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_QUESTION_ANSWER_STALE' });

    await expect(repository.executeMutation(remove.mutation, {
      id: 'question-dietary', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_QUESTION_ANSWER_STALE' });
    await repository.executeMutation(remove.mutation, {
      id: 'question-dietary', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 2,
    });
    expect((await repository.querySource(list, { id: 'question-dietary', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Vegetarian', 'Vegan', 'No preference']);
    await expect(repository.executeMutation(remove.mutation, {
      id: 'missing-question', line_id: created.id, parent_expected_row_version: 1, expected_row_version: 2,
    })).rejects.toMatchObject({ status: 404, code: 'EVENT_QUESTION_NOT_FOUND' });
    database.close();
  });
});
