import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo suggested-value edit', () => {
  test('joins the Odoo Suggested Values list/form edit through matching page/API YAML', () => {
    const page = yaml('pages/suggested-values.yaml');
    const api = yaml('api/suggested-values.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'edit_survey_suggested_value');

    expect(page.page).toMatchObject({ id: 'survey-suggested-values', route: '/surveys/suggested-values' });
    expect(api.page).toEqual({ id: 'survey-suggested-values' });
    expect(list).toMatchObject({
      row_open_action: 'edit_survey_suggested_value',
      row_double_click_action: 'edit_survey_suggested_value',
      row_actions: 'menu',
    });
    expect(list.columns).toContainEqual(expect.objectContaining({
      field: 'id',
      actions: [expect.objectContaining({ id: 'edit_survey_suggested_value', label: 'Edit', permission: 'surveys.write' })],
    }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.suggested_values.update',
      handler: 'yaml_mutation', operation: 'update', prefill: 'row',
    });
    expect(action.params).toEqual({
      id: '{row.id}', expected_row_version: '{row.row_version}',
      expected_question_row_version: '{row.question_row_version}',
      expected_survey_row_version: '{row.survey_row_version}',
    });
    expect(action.fields.map((field: any) => field.field)).toEqual(['value', 'sequence', 'score', 'matrix_row', 'matrix_column']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SUGGESTED_VALUE_NOT_FOUND',
      'SURVEY_SUGGESTED_VALUE_PARENT_CHANGED',
      'SURVEY_SUGGESTED_VALUE_QUESTION_CHANGED',
      'SURVEY_SUGGESTED_VALUE_STALE',
      'SURVEY_SUGGESTED_VALUE_ACTOR_REQUIRED',
      'SURVEY_SUGGESTED_VALUE_TYPE_INVALID',
      'SURVEY_SUGGESTED_VALUE_INVALID',
      'SURVEY_SUGGESTED_VALUE_SEQUENCE_INVALID',
      'SURVEY_SUGGESTED_VALUE_SCORE_INVALID',
    ]);
    expect(String(action.mutation.steps[0].query)).toContain('row_version = row_version + 1');
    expect(String(action.mutation.steps[1].query)).toContain('survey_questions SET row_version = row_version + 1');
    expect(yaml('migrations/20261028000000-066-survey-suggested-value-edit.yaml').version).toBe('0.0.66');
  });

  test('edits a suggested value with actor, relation, type, validation, archive, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_suggested_value_edit_guards', ['schema', 'data']);
    const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'edit_survey_suggested_value');
    const survey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
    const question = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))[0].row_version;
    const row = (await repository.query("SELECT row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))[0].row_version;
    const input = {
      id: 'answer-certification-laptop', question_id: 'question-certification-product',
      expected_row_version: row, expected_question_row_version: question, expected_survey_row_version: survey,
      value: 'Laptop Pro', sequence: 2, score: 95, matrix_row: '', matrix_column: '', current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'SURVEY_SUGGESTED_VALUE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'missing-suggested-value' }))
      .rejects.toMatchObject({ status: 404, code: 'SURVEY_SUGGESTED_VALUE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, value: ' ' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...input, sequence: 0 }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_SEQUENCE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...input, score: 'not-a-number' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_SCORE_INVALID' });

    const invalidType = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-feedback-rating'"))[0].row_version;
    const invalidSurvey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    await expect(repository.executeMutation(action.mutation, {
      ...input, id: 'answer-feedback-1', question_id: 'question-feedback-rating',
      expected_row_version: 1, expected_question_row_version: invalidType, expected_survey_row_version: invalidSurvey,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_TYPE_INVALID' });

    const edited = await repository.executeMutation(action.mutation, input);
    expect(edited).toMatchObject({
      id: input.id, value: 'Laptop Pro', sequence: 2, score: 95,
      row_version: row + 1, question_row_version: question + 1, survey_row_version: survey + 1,
    });
    expect(await repository.query("SELECT value, sequence, score, row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))
      .toEqual([{ value: 'Laptop Pro', sequence: 2, score: 95, row_version: row + 1 }]);
    expect(await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))
      .toEqual([{ row_version: question + 1 }]);
    expect(await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))
      .toEqual([{ row_version: survey + 1 }]);

    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_PARENT_CHANGED' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-certification'");
    await expect(repository.executeMutation(action.mutation, {
      ...input, expected_row_version: row + 1, expected_question_row_version: question + 1, expected_survey_row_version: survey + 1,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_PARENT_CHANGED' });
    database.close();
  });

  test('retains the edited suggested value across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-suggested-value-edit-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_edit_restart', ['schema', 'data']);
      const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'edit_survey_suggested_value');
      const survey = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
      const question = (await firstRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))[0].row_version;
      const row = (await firstRepository.query("SELECT row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))[0].row_version;
      const input = {
        id: 'answer-certification-laptop', question_id: 'question-certification-product',
        expected_row_version: row, expected_question_row_version: question, expected_survey_row_version: survey,
        value: 'Restart-safe laptop', sequence: 2, score: 91, matrix_row: '', matrix_column: '', current_user_id: 'user-admin',
      };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_edit_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT value, sequence, score, row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))
        .toEqual([{ value: input.value, sequence: 2, score: 91, row_version: row + 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))
        .toEqual([{ row_version: question + 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))
        .toEqual([{ row_version: survey + 1 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, input))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_PARENT_CHANGED' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
