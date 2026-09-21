import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo question/page reorder', () => {
  test('joins the Questions-tab reorder action through the separate page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid' && component.source === 'survey_questions');
    const action = api.actions.find((candidate: any) => candidate.id === 'reorder_survey_question');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'reorder_survey_question', label: 'Reorder', permission: 'surveys.write' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.questions.reorder', handler: 'yaml_mutation', operation: 'update' });
    expect(action.params).toEqual({ id: '{state.id}', expected_row_version: '{state.survey_detail.row_version}' });
    expect(action.fields.map((field: any) => field.field)).toEqual(['question_id', 'new_sequence']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_QUESTION_REORDER_NOT_FOUND',
      'SURVEY_QUESTION_REORDER_PARENT_CHANGED',
      'SURVEY_QUESTION_REORDER_LINE_NOT_FOUND',
      'SURVEY_QUESTION_REORDER_ACTOR_REQUIRED',
      'SURVEY_QUESTION_REORDER_SEQUENCE_INVALID',
    ]);
    expect(String(action.mutation.steps[0].query)).toContain('ROW_NUMBER() OVER');
    expect(String(action.mutation.steps[1].query)).toContain('row_version = row_version + 1');
    expect(yaml('migrations/20261026000000-064-survey-question-reorder-index.yaml').version).toBe('0.0.64');
  });

  test('moves an ordered question atomically and rejects actor, missing, stale, and invalid requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_question_reorder_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'reorder_survey_question');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    const input = {
      id: 'survey-demo-feedback',
      expected_row_version: before,
      question_id: 'question-feedback-comment',
      new_sequence: 5,
      current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'SURVEY_QUESTION_REORDER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'missing-survey' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_QUESTION_REORDER_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, new_sequence: 99 })).rejects.toMatchObject({ status: 422, code: 'SURVEY_QUESTION_REORDER_SEQUENCE_INVALID' });

    const reordered = await repository.executeMutation(action.mutation, input);
    expect(reordered).toMatchObject({ id: 'question-feedback-rating', sequence: 1 });
    expect(await repository.query("SELECT id, sequence FROM survey_questions WHERE survey_id = 'survey-demo-feedback' ORDER BY sequence, id")).toEqual([
      { id: 'question-feedback-rating', sequence: 1 },
      { id: 'question-feedback-service', sequence: 2 },
      { id: 'question-feedback-recommend', sequence: 3 },
      { id: 'question-feedback-support', sequence: 4 },
      { id: 'question-feedback-comment', sequence: 5 },
      { id: 'question-feedback-followup', sequence: 6 },
      { id: 'question-feedback-notes', sequence: 7 },
    ]);
    expect((await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version).toBe(before + 1);
    await expect(repository.executeMutation(action.mutation, input)).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_REORDER_PARENT_CHANGED' });
    await expect(repository.executeMutation(action.mutation, { ...input, expected_row_version: before + 1, question_id: 'missing-question' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_QUESTION_REORDER_LINE_NOT_FOUND' });
    database.close();
  });

  test('persists the reordered graph through a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-question-reorder-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_question_reorder_restart', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'reorder_survey_question');
      const parent = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', expected_row_version: parent, question_id: 'question-feedback-notes', new_sequence: 1, current_user_id: 'user-admin',
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_question_reorder_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT id, sequence FROM survey_questions WHERE survey_id = 'survey-demo-feedback' ORDER BY sequence, id LIMIT 3")).toEqual([
        { id: 'question-feedback-notes', sequence: 1 },
        { id: 'question-feedback-rating', sequence: 2 },
        { id: 'question-feedback-comment', sequence: 3 },
      ]);
      expect((await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version).toBe(parent + 1);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
