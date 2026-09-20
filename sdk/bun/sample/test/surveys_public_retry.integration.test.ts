import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function routeFor(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const surveyApi = yaml('api/surveys.yaml');
  const actions = Object.fromEntries(['public_survey_retry', 'public_survey_progress', 'public_survey_submit'].map((id) => [
    id,
    surveyApi.actions.find((candidate: any) => candidate.id === id),
  ]));
  const service = {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const action = operation === 'surveys.public.retry'
        ? actions.public_survey_retry
        : operation === 'surveys.public.progress'
          ? actions.public_survey_progress
          : actions.public_survey_submit;
      if (!action) throw new Error(`Unexpected survey operation: ${operation}`);
      return repository.executeMutation(action.mutation, request);
    },
  };
  const module = new SurveysModule() as any;
  return (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://survey.test${path}`, init),
    new URL(`http://survey.test${path}`),
    service,
  );
}

describe('Surveys public retry workflow', () => {
  test('keeps the Odoo retry route in the YAML/API contract and protects it with public permission', () => {
    const api = yaml('api/surveys.yaml');
    const retry = api.actions.find((candidate: any) => candidate.id === 'public_survey_retry');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(retry).toMatchObject({
      type: 'server_form',
      permission: 'surveys.public',
      action: 'surveys.public.retry',
      handler: 'yaml_mutation',
    });
    expect(retry.mutation).toMatchObject({ operation: 'insert', table: 'survey_responses' });
    expect(retry.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_PUBLIC_RETRY_UNAVAILABLE',
      'SURVEY_PUBLIC_RETRY_SOURCE_STATE',
      'SURVEY_PUBLIC_RETRY_TOKEN_EXISTS',
    ]);
    expect(yaml('operations.yaml').operations['survey.public.retry.source'].query).toContain('state');
    expect(yaml('operations.yaml').operations['survey.public.retry.idempotency'].query).toContain('idempotency_key');
  });

  test('creates a durable fresh attempt, preserves respondent context, and replays an idempotency key', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-retry-'));
    const databasePath = join(directory, 'retry.duckdb');
    const migrationTable = 'surveys_public_retry_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const surveyToken = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const sourceToken = 'print-feedback-answer-2026';
    const retry = await route(`/api/public/surveys/${surveyToken}/retry`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: sourceToken, idempotency_key: 'public-retry-001' }),
    });
    expect(retry.status).toBe(200);
    const retryBody = await retry.json();
    expect(retryBody).toMatchObject({
      retry_of: 'print-response-survey-demo-feedback',
      attempt_no: 1,
      replayed: false,
      answer: {
        survey_id: 'survey-demo-feedback',
        state: 'In Progress',
        answer_data: '{}',
        respondent_name: 'Azure Interior',
        respondent_email: 'azure@example.com',
        test_entry: false,
        idempotency_key: 'public-retry-001',
      },
    });
    const retryToken = retryBody.answer.access_token;
    expect(retryToken).toBe('retry-answer-print-feedback-answer-2026-1');
    expect(retryBody.start_url).toContain(`answer_token=${retryToken}`);
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback' AND id LIKE 'retry-response-%'")).toEqual([{ count: 1 }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const resumed = await reopenedRoute(`/api/public/surveys/${surveyToken}?answer_token=${encodeURIComponent(retryToken)}`);
    expect(resumed.status).toBe(200);
    expect((await resumed.json()).answer).toMatchObject({ access_token: retryToken, state: 'In Progress', answer_data: '{}' });
    const replay = await reopenedRoute(`/api/public/surveys/${surveyToken}/retry`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: sourceToken, idempotency_key: 'public-retry-001' }),
    });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, answer: { id: retryBody.answer.id, access_token: retryToken } });
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback' AND id LIKE 'retry-response-%'")).toEqual([{ count: 1 }]);

    const submitted = await reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answer_token: retryToken,
        answers: {
          'question-feedback-rating': '5',
          'question-feedback-service': 'Excellent',
          'question-feedback-recommend': 'Yes',
        },
      }),
    });
    expect(submitted.status).toBe(200);
    expect((await submitted.json()).answer).toMatchObject({ access_token: retryToken, state: 'Submitted' });
    expect(await reopenedRepository.query('SELECT state, respondent_name, respondent_email FROM survey_responses WHERE access_token = ?', [retryToken])).toEqual([
      { state: 'Submitted', respondent_name: 'Azure Interior', respondent_email: 'azure@example.com' },
    ]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects wrong, in-progress, closed, and non-POST retry requests without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_retry_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const surveyToken = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const before = await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback'");
    const invalid = await route(`/api/public/surveys/${surveyToken}/retry`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'missing-public-answer-token-2026' }) });
    expect(invalid.status).toBe(404);
    const notPost = await route(`/api/public/surveys/${surveyToken}/retry`);
    expect(notPost.status).toBe(405);
    await repository.run("INSERT INTO survey_responses(id, survey_id, survey_name, answer_data, access_token, state) VALUES ('retry-in-progress-source', 'survey-demo-feedback', 'Feedback Form', '{}', 'retry-in-progress-token-2026', 'In Progress')");
    const inProgress = await route(`/api/public/surveys/${surveyToken}/retry`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'retry-in-progress-token-2026' }) });
    expect(inProgress.status).toBe(409);
    await repository.run("UPDATE surveys SET state = 'Closed' WHERE id = 'survey-demo-feedback'");
    const closed = await route(`/api/public/surveys/${surveyToken}/retry`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'print-feedback-answer-2026' }) });
    expect(closed.status).toBe(404);
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback'")).toEqual([{ count: before[0].count + 1 }]);
    database.close();
  });
});
