import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo question edit', () => {
  test('joins the Odoo question form edit action through matching page/API YAML', () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const action = api.actions.find((candidate: any) => candidate.id === 'edit_survey_question');

    expect(page.page).toMatchObject({ id: 'survey-question-detail', route: '/surveys/question-detail' });
    expect(api.page).toEqual({ id: 'survey-question-detail' });
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'edit_survey_question', permission: 'surveys.write' }));
    expect(page.actions.some((candidate: any) => candidate.id === 'edit_survey_question')).toBe(false);
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.questions.update',
      handler: 'yaml_mutation', operation: 'update', prefill: 'state.survey_question_detail',
    });
    expect(action.params).toEqual({
      id: '{state.survey_question_detail.id}',
      expected_question_row_version: '{state.survey_question_detail.row_version}',
      expected_survey_row_version: '{state.survey_question_detail.survey_row_version}',
    });
    expect(action.fields.map((field: any) => field.field)).toEqual([
      'question_text', 'question_type', 'sequence', 'required', 'answer_options',
    ]);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_QUESTION_EDIT_NOT_FOUND',
      'SURVEY_QUESTION_EDIT_PARENT_CHANGED',
      'SURVEY_QUESTION_EDIT_STALE',
      'SURVEY_QUESTION_EDIT_ACTOR_REQUIRED',
      'SURVEY_QUESTION_EDIT_TITLE_REQUIRED',
      'SURVEY_QUESTION_EDIT_TYPE_INVALID',
      'SURVEY_QUESTION_EDIT_SEQUENCE_INVALID',
    ]);
    expect(String(action.mutation.steps[0].query)).toContain('row_version = row_version + 1');
    expect(String(action.mutation.steps[1].query)).toContain('surveys SET row_version = row_version + 1');
    expect(yaml('migrations/20261027000000-065-survey-question-edit.yaml').version).toBe('0.0.65');
  });

  test('edits question metadata with actor, missing, archive, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_question_edit_guards', ['schema', 'data']);
    const action = yaml('api/question-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_survey_question');
    const parent = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    const question = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'question-feedback-comment'"))[0].row_version;
    const input = {
      id: 'question-feedback-comment', expected_question_row_version: question, expected_survey_row_version: parent,
      question_text: 'What should we improve in the next release?', question_type: 'Text', sequence: 2,
      required: true, answer_options: '', current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'SURVEY_QUESTION_EDIT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'question-does-not-exist' }))
      .rejects.toMatchObject({ status: 404, code: 'SURVEY_QUESTION_EDIT_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, question_text: ' ' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_QUESTION_EDIT_TITLE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, question_type: 'Unsupported' }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_QUESTION_EDIT_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { ...input, sequence: 0 }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_QUESTION_EDIT_SEQUENCE_INVALID' });

    const edited = await repository.executeMutation(action.mutation, input);
    expect(edited).toMatchObject({
      id: input.id, question_text: input.question_text, question_type: 'Text', sequence: 2,
      required: true, row_version: question + 1, survey_row_version: parent + 1,
    });
    expect((await repository.query("SELECT question_text, row_version FROM survey_questions WHERE id = 'question-feedback-comment'")))
      .toEqual([{ question_text: input.question_text, row_version: question + 1 }]);
    expect((await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'")))
      .toEqual([{ row_version: parent + 1 }]);

    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_EDIT_PARENT_CHANGED' });
    const archivedParent = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-certification'");
    await expect(repository.executeMutation(action.mutation, {
      ...input, id: 'question-certification-product', expected_question_row_version: 1,
      expected_survey_row_version: archivedParent,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_EDIT_PARENT_CHANGED' });
    database.close();
  });

  test('retains an edited question across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-question-edit-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_question_edit_restart', ['schema', 'data']);
      const action = yaml('api/question-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_survey_question');
      const parent = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
      const question = (await firstRepository.query("SELECT row_version FROM survey_questions WHERE id = 'question-feedback-comment'"))[0].row_version;
      const input = {
        id: 'question-feedback-comment', expected_question_row_version: question, expected_survey_row_version: parent,
        question_text: 'Restart-safe edited question', question_type: 'Text', sequence: 2,
        required: false, answer_options: '', current_user_id: 'user-admin',
      };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_question_edit_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT question_text, required, row_version FROM survey_questions WHERE id = 'question-feedback-comment'"))
        .toEqual([{ question_text: input.question_text, required: false, row_version: question + 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))
        .toEqual([{ row_version: parent + 1 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, input))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_EDIT_PARENT_CHANGED' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
