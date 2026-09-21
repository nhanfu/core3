import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys question duplication', () => {
  test('exposes the Odoo question copy action through matching page/API YAML', () => {
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const pageAction = page.actions.find((action: any) => action.id === 'duplicate_survey_question');
    const apiAction = api.actions.find((action: any) => action.id === 'duplicate_question');

    expect(page.page).toMatchObject({ id: 'survey-question-detail', route: '/surveys/question-detail' });
    expect(api.page).toEqual({ id: 'survey-question-detail' });
    expect(form.action_menu).toMatchObject({ label: 'Actions', aria_label: 'Actions menu' });
    expect(form.action_menu.actions).toContainEqual(expect.objectContaining({
      id: 'duplicate_survey_question', label: 'Duplicate', icon: 'copy', permission: 'surveys.write',
    }));
    expect(pageAction).toMatchObject({ type: 'client', permission: 'surveys.write' });
    expect(pageAction.script).toContain('/api/actions/surveys.questions.duplicate');
    expect(apiAction).toMatchObject({
      type: 'server', permission: 'surveys.write', action: 'surveys.questions.duplicate',
      handler: 'yaml_mutation', operation: 'duplicate',
    });
    expect(String(apiAction.mutation.steps[1].query)).toContain('survey_suggested_values');
    expect(String(apiAction.mutation.steps[2].query)).toContain('row_version = row_version + 1');
    expect(api.datasources[0].query).toContain('survey_row_version');
  });

  test('duplicates one question and its suggested values with durable guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_question_duplicate_migrations', ['schema', 'data']);
    const action = yaml('api/question-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_question');
    const parent = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;

    const result = await repository.executeMutation(action.mutation, {
      source_id: 'question-certification-product',
      expected_survey_row_version: parent,
      duplicate_id: 'question-certification-product-copy',
    });
    expect(result).toMatchObject({
      id: 'question-certification-product-copy',
      survey_id: 'survey-demo-certification',
      question_text: 'Which product is certified?',
      question_type: 'Choice',
      sequence: 1,
      required: true,
      survey_row_version: parent + 1,
    });
    expect(await repository.query(
      "SELECT value, sequence, score FROM survey_suggested_values WHERE question_id = ? ORDER BY sequence, id",
      ['question-certification-product-copy'],
    )).toEqual([
      { value: 'Desk', sequence: 1, score: 100 },
      { value: 'Laptop', sequence: 2, score: 100 },
    ]);
    expect(await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))
      .toEqual([{ row_version: parent + 1 }]);

    await expect(repository.executeMutation(action.mutation, {
      source_id: 'question-does-not-exist', expected_survey_row_version: parent, duplicate_id: 'question-copy-missing',
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_QUESTION_DUPLICATE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'question-certification-product', expected_survey_row_version: parent, duplicate_id: 'question-copy-existing',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_DUPLICATE_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'question-certification-product', expected_survey_row_version: parent + 1, duplicate_id: 'question-certification-product-copy',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_DUPLICATE_EXISTS' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-certification'");
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'question-certification-product', expected_survey_row_version: parent + 1, duplicate_id: 'question-copy-archived',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_DUPLICATE_ARCHIVED' });
    database.close();
  });

  test('retains the duplicate across restart and rejects replay without a second row', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-question-duplicate-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_question_duplicate_restart_migrations', ['schema', 'data']);
      const action = yaml('api/question-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_question');
      const parent = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-certification'"))[0].row_version;
      const input = {
        source_id: 'question-certification-product',
        expected_survey_row_version: parent,
        duplicate_id: 'question-certification-product-restart',
      };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_question_duplicate_restart_migrations', ['schema', 'data']);
      expect(await reopenedRepository.query(
        "SELECT q.question_text, COUNT(a.id) AS suggested_count FROM survey_questions q LEFT JOIN survey_suggested_values a ON a.question_id = q.id WHERE q.id = ? GROUP BY q.question_text",
        [input.duplicate_id],
      )).toEqual([{ question_text: 'Which product is certified?', suggested_count: 2 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, { ...input, expected_survey_row_version: parent + 1 }))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_QUESTION_DUPLICATE_EXISTS' });
      expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_questions WHERE id = ?', [input.duplicate_id]))
        .toEqual([{ count: 1 }]);
      expect(action.permission).toBe('surveys.write');
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
