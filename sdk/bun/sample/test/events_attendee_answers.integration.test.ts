import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/attendee-detail.yaml').actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_attendee_answers_test_schema_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Events attendee answer editor parity', () => {
  test('keeps the attendee Questions x2many page/API contract and permissions', () => {
    const page = yaml('pages/attendee-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');
    const api = yaml('api/attendee-detail.yaml');
    expect(grid).toMatchObject({ source: 'event_attendee_answers', parent_source: 'event_attendee_detail', variant: 'odoo_x2many' });
    expect(grid.children.map((child: any) => child.field).filter(Boolean)).toEqual(['question_id', 'question_type', 'suggested_answer', 'text_answer']);
    expect(api.datasources.map((source: any) => source.id)).toEqual(['event_attendee_detail', 'event_attendee_answers', 'event_attendee_question_options', 'event_attendee_answer_options']);
    for (const id of ['add_event_attendee_answer', 'edit_event_attendee_answer', 'delete_event_attendee_answer']) {
      expect(action(id), id).toMatchObject({ permission: 'events.write', handler: 'line_item' });
    }
    expect(api.datasources[1].error_states.transport_error.status).toBe(503);
  });

  test('persists create, edit, delete, relation guards, and stale writes', async () => {
    const { database, repository } = await repositoryForTest();
    const list = yaml('api/attendee-detail.yaml').datasources[1];
    const create = action('add_event_attendee_answer');
    const edit = action('edit_event_attendee_answer');
    const remove = action('delete_event_attendee_answer');
    const initial = await repository.querySource(list, { id: 'registration-demo-002' }, 0, 50);
    expect(initial.data).toHaveLength(3);
    expect(initial.data.find((row: any) => row.id === 'registration-answer-dietary-demo-001')).toMatchObject({ question_id: 'question-dietary', suggested_answer: 'No preference', row_version: 1 });

    const created = await repository.executeMutation(create.mutation, {
      id: 'registration-demo-003', question_id: 'question-name', suggested_answer_id: null, text_answer: 'Architect',
    });
    expect(created).toMatchObject({ question_id: 'question-name', question_type: 'Name', text_answer: 'Architect', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, {
      id: 'registration-demo-003', question_id: 'question-name', suggested_answer_id: null, text_answer: 'Duplicate',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_ANSWER_EXISTS' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'registration-demo-003', line_id: created.id, expected_row_version: 1,
      question_id: 'question-phone', suggested_answer_id: null, text_answer: '+1 202 555 0199',
    });
    expect(updated).toMatchObject({ question_id: 'question-phone', suggested_answer: '', text_answer: '+1 202 555 0199', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'registration-demo-003', line_id: created.id, expected_row_version: 1,
      question_id: 'question-phone', suggested_answer_id: null, text_answer: '+1 202 555 0188',
    })).rejects.toMatchObject({ status: 409, code: 'EVENT_ATTENDEE_ANSWER_STALE' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'registration-demo-003', line_id: created.id, expected_row_version: 2,
      question_id: 'question-dietary', suggested_answer_id: 'missing-choice', text_answer: '',
    })).rejects.toMatchObject({ status: 422, code: 'EVENT_ATTENDEE_ANSWER_CHOICE_INVALID' });

    await repository.executeMutation(remove.mutation, { id: 'registration-demo-003', line_id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(list, { id: 'registration-demo-003' }, 0, 50)).data.some((row: any) => row.id === created.id)).toBe(false);
    database.close();
  });
});
