import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function testAction() {
  return yaml('api/survey-test.yaml').actions.find((action: any) => action.id === 'start_survey_test_action');
}

function launch(repository: YamlRepository, surveyId = 'survey-demo-feedback', idempotencyKey = `survey-test:${surveyId}`) {
  return repository.executeMutation(testAction().mutation, {
    id: `test-response-${surveyId}`,
    survey_id: surveyId,
    idempotency_key: idempotencyKey,
    values: { state: 'New', test_entry: true, answer_data: '{}', idempotency_key: idempotencyKey },
  });
}

describe('Surveys authenticated test-entry lifecycle', () => {
  test('keeps Odoo test launch page/API ownership, permission, token, and key guards explicit', () => {
    const page = yaml('pages/survey-test.yaml');
    const api = yaml('api/survey-test.yaml');
    const start = testAction();
    expect(page.page).toMatchObject({ id: 'survey-test', route: '/surveys/test' });
    expect(api.page).toEqual({ id: 'survey-test' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'survey_test' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['survey_test', 'survey_test_questions']);
    expect(start).toMatchObject({ permission: 'surveys.write', action: 'surveys.test.start', handler: 'yaml_mutation' });
    expect(start.mutation).toMatchObject({ operation: 'update', table: 'survey_responses', concurrency: false });
    expect(start.mutation.fields).toContain('idempotency_key');
    expect(start.mutation.guards.map((guard: any) => guard.code)).toEqual([
      undefined,
      'SURVEY_TEST_ENTRY_NOT_FOUND',
      'SURVEY_TEST_ENTRY_KEY_CHANGED',
    ]);
    expect(String(start.mutation.guards[0].query)).toContain("s.state <> 'Archived'");
    expect(String(start.mutation.guards[0].query)).toContain('s.access_token IS NOT NULL');
    expect(String(start.mutation.guards[1].query)).toContain('test_entry = true');
    expect(String(start.mutation.guards[2].query)).toContain('idempotency_key');
    expect(yaml('operations.yaml')).toBeDefined();
  });

  test('persists one deterministic test entry, replays it idempotently, and survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-test-entry-'));
    const databasePath = join(directory, 'test-entry.duckdb');
    const migrationTable = 'surveys_test_entry_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);

    const first = await launch(repository);
    expect(first).toMatchObject({
      id: 'test-response-survey-demo-feedback',
      access_token: 'test-token-feedback-2026',
      survey_id: 'survey-demo-feedback',
      state: 'New',
      test_entry: true,
      idempotency_key: 'survey-test:survey-demo-feedback',
    });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback' AND test_entry = true")).toEqual([{ count: 1 }]);

    const firstRow = (await repository.query("SELECT state, answer_data, access_token, idempotency_key FROM survey_responses WHERE id = 'test-response-survey-demo-feedback'"))[0];
    await repository.run("UPDATE survey_responses SET state = 'In Progress', answer_data = '{\"question-feedback-rating\":\"5\"}' WHERE id = 'test-response-survey-demo-feedback'");
    const second = await launch(repository);
    expect(second).toMatchObject({ id: first.id, access_token: first.access_token, state: 'New', test_entry: true, idempotency_key: first.idempotency_key });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE id = 'test-response-survey-demo-feedback'")).toEqual([{ count: 1 }]);
    expect((await repository.query("SELECT answer_data FROM survey_responses WHERE id = 'test-response-survey-demo-feedback'"))[0]).toEqual({ answer_data: '{}' });
    expect(firstRow.idempotency_key).toBe('survey-test:survey-demo-feedback');

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const resumed = await reopenedRepository.query("SELECT id, access_token, state, test_entry, idempotency_key, answer_data FROM survey_responses WHERE id = 'test-response-survey-demo-feedback'");
    expect(resumed).toEqual([{
      id: 'test-response-survey-demo-feedback',
      access_token: 'test-token-feedback-2026',
      state: 'New',
      test_entry: true,
      idempotency_key: 'survey-test:survey-demo-feedback',
      answer_data: '{}',
    }]);
    const replay = await launch(reopenedRepository);
    expect(replay).toMatchObject({ id: second.id, access_token: second.access_token, idempotency_key: second.idempotency_key });
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback' AND test_entry = true")).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects archived, missing-question, wrong-key, and missing test-entry launches atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_test_entry_guards', ['schema', 'data']);

    await repository.run("UPDATE survey_responses SET idempotency_key = 'survey-test:survey-demo-feedback' WHERE id = 'test-response-survey-demo-feedback'");
    await expect(launch(repository, 'survey-demo-feedback', 'wrong-key')).rejects.toMatchObject({ status: 409, code: 'SURVEY_TEST_ENTRY_KEY_CHANGED' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-feedback'");
    await expect(launch(repository)).rejects.toMatchObject({ status: 409 });
    await repository.run("UPDATE surveys SET state = 'Published' WHERE id = 'survey-demo-feedback'");
    await repository.run("DELETE FROM survey_questions WHERE survey_id = 'survey-demo-feedback'");
    await expect(launch(repository)).rejects.toMatchObject({ status: 409 });
    await repository.run("UPDATE surveys SET state = 'Published' WHERE id = 'survey-demo-feedback'");
    await repository.run("INSERT INTO survey_questions(id, survey_id, question_text, question_type, sequence, required, answer_options) VALUES ('test-entry-guard-question', 'survey-demo-feedback', 'Guard question', 'Text', 1, false, '')");
    await repository.run("DELETE FROM survey_responses WHERE id = 'test-response-survey-demo-feedback'");
    await expect(launch(repository)).rejects.toMatchObject({ status: 409, code: 'SURVEY_TEST_ENTRY_NOT_FOUND' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback'")).toEqual([{ count: 2 }]);
    database.close();
  });
});
