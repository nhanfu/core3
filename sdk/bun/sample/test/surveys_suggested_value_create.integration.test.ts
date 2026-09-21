import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo suggested-value create', () => {
  test('joins the Odoo Suggested Values New action through matching page/API YAML', () => {
    const page = yaml('pages/suggested-values.yaml');
    const api = yaml('api/suggested-values.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_survey_suggested_value');

    expect(page.page).toMatchObject({ id: 'survey-suggested-values', route: '/surveys/suggested-values' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(list).toMatchObject({ create_action: 'create_survey_suggested_value', create_label: 'New' });
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.suggested_values.create',
      handler: 'yaml_mutation', operation: 'create',
    });
    expect(action.fields.map((field: any) => field.field)).toEqual([
      'question_id', 'value', 'sequence', 'score', 'matrix_row', 'matrix_column', 'idempotency_key',
    ]);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SUGGESTED_VALUE_CREATE_QUESTION_NOT_FOUND',
      'SURVEY_SUGGESTED_VALUE_CREATE_IDEMPOTENCY_REPLAY',
      'SURVEY_SUGGESTED_VALUE_CREATE_PARENT_CHANGED',
      'SURVEY_SUGGESTED_VALUE_CREATE_QUESTION_CHANGED',
      'SURVEY_SUGGESTED_VALUE_CREATE_ACTOR_REQUIRED',
      'SURVEY_SUGGESTED_VALUE_CREATE_TYPE_INVALID',
      'SURVEY_SUGGESTED_VALUE_CREATE_VALUE_INVALID',
      'SURVEY_SUGGESTED_VALUE_CREATE_SEQUENCE_INVALID',
      'SURVEY_SUGGESTED_VALUE_CREATE_SCORE_INVALID',
    ]);
    expect(yaml('migrations/20261031000000-069-survey-suggested-value-create.yaml').version).toBe('0.0.69');
  });

  test('creates a relation with actor, question-type, parent, stale, validation, and replay guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_suggested_value_create_guards', ['schema', 'data']);
    const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'create_survey_suggested_value');
    const survey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-suggested-value-create'"))[0].row_version;
    const question = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-suggested-value-create'"))[0].row_version;
    const input = {
      id: 'suggested-value-create-001', idempotency_key: 'suggested-value-create-key-001',
      question_id: 'question-suggested-value-create', expected_question_row_version: question,
      expected_survey_row_version: survey, value: 'Self service', sequence: 2, score: 25,
      matrix_row: '', matrix_column: '', current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'SURVEY_SUGGESTED_VALUE_CREATE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'suggested-value-create-missing', question_id: 'missing-question' }))
      .rejects.toMatchObject({ status: 404, code: 'SURVEY_SUGGESTED_VALUE_CREATE_QUESTION_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'suggested-value-create-empty', value: ' ' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_CREATE_VALUE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'suggested-value-create-sequence', sequence: 0 }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_CREATE_SEQUENCE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'suggested-value-create-score', score: 'not-a-number' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_CREATE_SCORE_INVALID' });

    const textQuestion = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-feedback-comment'"))[0].row_version;
    const feedbackSurvey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    await expect(repository.executeMutation(action.mutation, {
      ...input, id: 'suggested-value-create-text', question_id: 'question-feedback-comment',
      expected_question_row_version: textQuestion, expected_survey_row_version: feedbackSurvey,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_CREATE_TYPE_INVALID' });

    await repository.run("UPDATE surveys SET row_version = row_version + 1 WHERE id = 'survey-demo-suggested-value-create'");
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_CREATE_PARENT_CHANGED' });
    const currentSurvey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-suggested-value-create'"))[0].row_version;
    const currentQuestion = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-suggested-value-create'"))[0].row_version;
    const successfulInput = { ...input, expected_question_row_version: currentQuestion, expected_survey_row_version: currentSurvey };
    const created = await repository.executeMutation(action.mutation, successfulInput);
    expect(created).toMatchObject({
      id: successfulInput.id, question_id: successfulInput.question_id, value: successfulInput.value,
      sequence: 2, score: 25, row_version: 1, question_row_version: currentQuestion + 1,
      survey_row_version: currentSurvey + 1,
    });
    expect(await repository.query("SELECT value, sequence, score FROM survey_suggested_values WHERE id = 'suggested-value-create-001'"))
      .toEqual([{ value: 'Self service', sequence: 2, score: 25 }]);
    await expect(repository.executeMutation(action.mutation, successfulInput))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_CREATE_IDEMPOTENCY_REPLAY' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_suggested_values WHERE id = 'suggested-value-create-001'"))
      .toEqual([{ count: 1 }]);
    database.close();
  });

  test('retains the created suggested value across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-suggested-value-create-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_create_restart', ['schema', 'data']);
      const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'create_survey_suggested_value');
      const survey = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-suggested-value-create'"))[0].row_version;
      const question = (await firstRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-suggested-value-create'"))[0].row_version;
      const input = {
        id: 'suggested-value-create-restart', idempotency_key: 'suggested-value-create-restart-key',
        question_id: 'question-suggested-value-create', expected_question_row_version: question,
        expected_survey_row_version: survey, value: 'Restart safe', sequence: 2, score: 40,
        matrix_row: '', matrix_column: '', current_user_id: 'user-admin',
      };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_create_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT value, sequence, score, row_version FROM survey_suggested_values WHERE id = 'suggested-value-create-restart'"))
        .toEqual([{ value: 'Restart safe', sequence: 2, score: 40, row_version: 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-suggested-value-create'"))
        .toEqual([{ row_version: question + 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-suggested-value-create'"))
        .toEqual([{ row_version: survey + 1 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, input))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_CREATE_IDEMPOTENCY_REPLAY' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
