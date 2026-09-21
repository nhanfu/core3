import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo suggested-value reorder', () => {
  test('joins the Odoo Suggested Values sequence handle through matching page/API YAML', () => {
    const page = yaml('pages/suggested-values.yaml');
    const api = yaml('api/suggested-values.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'reorder_survey_suggested_value');

    expect(page.page).toMatchObject({ id: 'survey-suggested-values', route: '/surveys/suggested-values' });
    expect(api.page).toEqual({ id: 'survey-suggested-values' });
    expect(list).toMatchObject({ row_open_action: 'edit_survey_suggested_value', row_actions: 'menu' });
    expect(list.columns).toContainEqual(expect.objectContaining({
      field: 'id',
      actions: expect.arrayContaining([
        expect.objectContaining({ id: 'reorder_survey_suggested_value', label: 'Reorder', permission: 'surveys.write' }),
      ]),
    }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.suggested_values.reorder',
      handler: 'yaml_mutation', operation: 'update',
    });
    expect(action.params).toEqual({
      id: '{row.id}', question_id: '{row.question_id}', expected_row_version: '{row.row_version}',
      expected_question_row_version: '{row.question_row_version}',
      expected_survey_row_version: '{row.survey_row_version}',
    });
    expect(action.fields.map((field: any) => field.field)).toEqual(['new_sequence']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SUGGESTED_VALUE_REORDER_NOT_FOUND',
      'SURVEY_SUGGESTED_VALUE_REORDER_PARENT_CHANGED',
      'SURVEY_SUGGESTED_VALUE_REORDER_QUESTION_CHANGED',
      'SURVEY_SUGGESTED_VALUE_REORDER_STALE',
      'SURVEY_SUGGESTED_VALUE_REORDER_ACTOR_REQUIRED',
      'SURVEY_SUGGESTED_VALUE_REORDER_TYPE_INVALID',
      'SURVEY_SUGGESTED_VALUE_REORDER_SEQUENCE_INVALID',
    ]);
    expect(String(action.mutation.steps[0].query)).toContain('ROW_NUMBER() OVER');
    expect(String(action.mutation.steps[1].query)).toContain('survey_questions SET row_version = row_version + 1');
    expect(yaml('migrations/20261029000000-067-survey-suggested-value-delete-index.yaml').version).toBe('0.0.67');
  });

  test('moves a suggested value with actor, relation, type, position, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_suggested_value_reorder_guards', ['schema', 'data']);
    const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'reorder_survey_suggested_value');
    const survey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
    const question = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))[0].row_version;
    const row = (await repository.query("SELECT row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))[0].row_version;
    const input = {
      id: 'answer-certification-laptop', question_id: 'question-certification-product',
      expected_row_version: row, expected_question_row_version: question, expected_survey_row_version: survey,
      new_sequence: 1, current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'SURVEY_SUGGESTED_VALUE_REORDER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'missing-suggested-value' }))
      .rejects.toMatchObject({ status: 404, code: 'SURVEY_SUGGESTED_VALUE_REORDER_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, new_sequence: 99 }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SUGGESTED_VALUE_REORDER_SEQUENCE_INVALID' });

    await repository.run("UPDATE surveys SET row_version = row_version + 1 WHERE id = 'survey-demo-certification'");
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_PARENT_CHANGED' });
    await repository.run("UPDATE surveys SET row_version = ? WHERE id = 'survey-demo-certification'", [survey]);

    await repository.run("UPDATE survey_questions SET row_version = row_version + 1 WHERE id = 'question-certification-product'");
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_QUESTION_CHANGED' });
    await repository.run("UPDATE survey_questions SET row_version = ? WHERE id = 'question-certification-product'", [question]);

    await repository.run("UPDATE survey_suggested_values SET row_version = row_version + 1 WHERE id = 'answer-certification-laptop'");
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_STALE' });
    await repository.run("UPDATE survey_suggested_values SET row_version = ? WHERE id = 'answer-certification-laptop'", [row]);

    const invalidType = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-feedback-rating'"))[0].row_version;
    const invalidSurvey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    await expect(repository.executeMutation(action.mutation, {
      ...input, id: 'answer-feedback-1', question_id: 'question-feedback-rating', expected_row_version: 1,
      expected_question_row_version: invalidType, expected_survey_row_version: invalidSurvey,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_TYPE_INVALID' });

    const reordered = await repository.executeMutation(action.mutation, input);
    expect(reordered).toMatchObject({
      id: input.id, question_id: input.question_id, sequence: 1,
      row_version: row + 1, question_row_version: question + 1, survey_row_version: survey + 1,
    });
    expect(await repository.query("SELECT id, sequence FROM survey_suggested_values WHERE question_id = 'question-certification-product' ORDER BY sequence, id"))
      .toEqual([
        { id: 'answer-certification-laptop', sequence: 1 },
        { id: 'answer-certification-desk', sequence: 2 },
      ]);
    expect(await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))
      .toEqual([{ row_version: question + 1 }]);
    expect(await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))
      .toEqual([{ row_version: survey + 1 }]);
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_PARENT_CHANGED' });
    database.close();
  });

  test('persists suggested-value order across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-suggested-value-reorder-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_reorder_restart', ['schema', 'data']);
      const action = yaml('api/suggested-values.yaml').actions.find((candidate: any) => candidate.id === 'reorder_survey_suggested_value');
      const survey = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
      const question = (await firstRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))[0].row_version;
      const row = (await firstRepository.query("SELECT row_version FROM survey_suggested_values WHERE id = 'answer-certification-laptop'"))[0].row_version;
      const input = {
        id: 'answer-certification-laptop', question_id: 'question-certification-product',
        expected_row_version: row, expected_question_row_version: question, expected_survey_row_version: survey,
        new_sequence: 1, current_user_id: 'user-admin',
      };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_suggested_value_reorder_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT id, sequence, row_version FROM survey_suggested_values WHERE question_id = 'question-certification-product' ORDER BY sequence, id"))
        .toEqual([
          { id: 'answer-certification-laptop', sequence: 1, row_version: row + 1 },
          { id: 'answer-certification-desk', sequence: 2, row_version: 2 },
        ]);
      expect(await reopenedRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-certification-product'"))
        .toEqual([{ row_version: question + 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))
        .toEqual([{ row_version: survey + 1 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, input))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_SUGGESTED_VALUE_REORDER_PARENT_CHANGED' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
