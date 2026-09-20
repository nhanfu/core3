import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Questions-tab Add a question', () => {
  test('matches the Odoo inline create control and page/API ownership', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid');
    const action = api.actions.find((candidate: any) => candidate.id === 'add_survey_question');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.auth.require).toEqual(['surveys.read']);
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'add_survey_question', label: 'Add a question', permission: 'surveys.write' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.questions.create_inline', handler: 'line_item', operation: 'create' });
    expect(action.params).toEqual({ id: '{state.id}' });
    expect(String(action.mutation.steps[0].query)).toContain('INSERT INTO survey_questions');
    expect(String(action.mutation.steps[1].query)).toContain('row_version = row_version + 1');
    expect(action.fields.map((field: any) => field.field)).toEqual(['question_text', 'question_type', 'required', 'answer_options']);
  });

  test('creates a durable question with deterministic sequence and guarded validation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_question_create_migrations', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_question');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
    const created = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback',
      parent_expected_row_version: before,
      question_id: 'question-feedback-inline-created',
      values: { question_text: 'How did you hear about us?', question_type: 'Choice', required: true, answer_options: 'Email,Phone,Chat' },
    });
    expect(created).toMatchObject({ id: 'question-feedback-inline-created', survey_id: 'survey-demo-feedback', question_text: 'How did you hear about us?', question_type: 'Choice', sequence: 8, required: true, is_page: false });
    expect(await repository.query("SELECT question_text, sequence, answer_options FROM survey_questions WHERE id = 'question-feedback-inline-created'")).toEqual([
      { question_text: 'How did you hear about us?', sequence: 8, answer_options: 'Email,Phone,Chat' },
    ]);
    expect(await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'")).toEqual([{ row_version: before + 1 }]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', parent_expected_row_version: before + 1, question_id: 'question-feedback-invalid',
      values: { question_text: ' ', question_type: 'Text' },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_QUESTION_TITLE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', parent_expected_row_version: before, question_id: 'question-feedback-stale',
      values: { question_text: 'Stale question', question_type: 'Text' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_PARENT_CHANGED' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', parent_expected_row_version: before + 1, question_id: 'question-feedback-archived',
      values: { question_text: 'Archived question', question_type: 'Text' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_PARENT_CHANGED' });
    database.close();
  });

  test('persists the inline question through a file-backed restart and retains the write boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-question-create-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_question_restart_migrations', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_question');
      const parent = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0].row_version;
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', parent_expected_row_version: parent, question_id: 'question-feedback-restart',
        values: { question_text: 'Restart-safe question', question_type: 'Text' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_question_restart_migrations', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT question_text, question_type FROM survey_questions WHERE id = 'question-feedback-restart'"))
        .toEqual([{ question_text: 'Restart-safe question', question_type: 'Text' }]);
      expect(action.permission).toBe('surveys.write');
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
