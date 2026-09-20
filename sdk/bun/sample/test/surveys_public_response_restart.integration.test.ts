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

function publicService(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const api = yaml('api/surveys.yaml');
  const actions = Object.fromEntries(api.actions.map((action: any) => [action.id, action]));
  return {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const action = Object.values(actions).find((candidate: any) => candidate.action === operation) as any;
      if (!action) throw new Error(`Unexpected survey operation: ${operation}`);
      return repository.executeMutation(action.mutation, request);
    },
  };
}

function routeFor(repository: YamlRepository) {
  const module = new SurveysModule() as any;
  const service = publicService(repository);
  return (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://survey.test${path}`, init),
    new URL(`http://survey.test${path}`),
    service,
  ) as Promise<Response>;
}

describe('Surveys public response restart lifecycle', () => {
  test('keeps a public in-progress response across restart and submits exactly once', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-response-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_response_restart_migrations';
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const headers = { 'Content-Type': 'application/json' };

    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);

    const publicApi = yaml('api/surveys.yaml');
    expect(publicApi.page).toEqual({ id: 'surveys' });
    expect(publicApi.actions.filter((action: any) => action.id.startsWith('public_survey_')).every((action: any) => action.permission === 'surveys.public')).toBe(true);

    const route = routeFor(repository);
    const start = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idempotency_key: 'public-restart-start-001' }),
    });
    expect(start.status).toBe(200);
    const started = await start.json();
    const answerToken = started.answer.access_token;

    const progress = await route(`/api/public/surveys/${token}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5' } }),
    });
    expect(progress.status).toBe(200);
    expect((await repository.query('SELECT state, answer_data FROM survey_responses WHERE access_token = ?', [answerToken]))[0]).toEqual({
      state: 'In Progress',
      answer_data: '{"question-feedback-rating":"5"}',
    });
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    expect((await reopenedRoute(`/api/public/surveys/${token}?answer_token=${answerToken}`)).status).toBe(200);

    const submit = await reopenedRoute(`/api/public/surveys/${token}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answer_token: answerToken,
        answers: {
          'question-feedback-rating': '5',
          'question-feedback-service': 'Excellent',
          'question-feedback-recommend': 'Yes',
        },
        idempotency_key: 'public-restart-submit-001',
      }),
    });
    expect(submit.status).toBe(200);
    expect((await submit.json()).answer).toMatchObject({ state: 'Submitted', submitted_at: '2026-01-15 09:30:00' });
    expect(await reopenedRepository.query('SELECT state, CAST(submitted_at AS VARCHAR) AS submitted_at FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([
      { state: 'Submitted', submitted_at: '2026-01-15 09:30:00' },
    ]);
    expect((await reopenedRepository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(5);

    const replay = await reopenedRoute(`/api/public/surveys/${token}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: {}, idempotency_key: 'public-restart-submit-001' }),
    });
    expect(replay.status).toBe(200);
    expect((await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = ?', ['public-restart-submit-001']))[0].count).toBe(1);

    const unauthenticatedRead = await reopenedRoute(`/api/public/surveys/${token}`);
    expect(unauthenticatedRead.status).toBe(200);
    const wrongSurvey = await reopenedRoute('/api/public/surveys/4ead4bc8-b8f2-4760-a682-1fde8ddb95ac/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: {} }),
    });
    expect(wrongSurvey.status).toBe(404);
    expect((await reopenedRepository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(5);

    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
