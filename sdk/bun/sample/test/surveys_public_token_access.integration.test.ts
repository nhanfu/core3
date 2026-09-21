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
  const actions = Object.fromEntries(yaml('api/surveys.yaml').actions.map((action: any) => [action.id, action]));
  const service = {
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
  const module = new SurveysModule() as any;
  return (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://survey.test${path}`, init),
    new URL(`http://survey.test${path}`),
    service,
  ) as Promise<Response>;
}

describe('Surveys token-only public access', () => {
  test('keeps access mode, answer-token operation, and page/API binding explicit', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const start = api.actions.find((action: any) => action.id === 'public_survey_start');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('access_mode');
    expect(yaml('operations.yaml').operations['survey.public.access'].query).toContain(':answer_token');
    expect(start).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.start', handler: 'yaml_mutation' });
    expect(start.mutation.guards.map((guard: any) => guard.code)).toContain('SURVEY_PUBLIC_TOKEN_REQUIRED');
    expect(start.fields.map((field: any) => field.field)).toContain('answer_token');
    expect(yaml('migrations/20261011000000-044-survey-public-token-access.yaml').version).toBe('0.0.44');
  });

  test('does not disclose token-only questions and begins only the durable invitation answer', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_token_access_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const surveyToken = 'token-access-token-2026';
    const answerToken = 'token-access-answer-2026';
    const headers = { 'Content-Type': 'application/json' };

    const missing = await route(`/api/public/surveys/${surveyToken}`);
    expect(missing.status).toBe(403);
    expect(await missing.json()).toEqual({ error: 'An invitation answer token is required to access this survey.', code: 'SURVEY_PUBLIC_TOKEN_REQUIRED' });

    const wrong = await route(`/api/public/surveys/${surveyToken}?answer_token=wrong-answer-token-2026`);
    expect(wrong.status).toBe(404);
    expect((await wrong.json()).code).toBe('SURVEY_PUBLIC_TOKEN_WRONG');

    const valid = await route(`/api/public/surveys/${surveyToken}?answer_token=${answerToken}`);
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({
      survey: { access_mode: 'token', id: 'survey-demo-token-access' },
      answer: { access_token: answerToken, state: 'New' },
      questions: [{ id: 'question-token-access' }],
    });

    const started = await route(`/api/public/surveys/${surveyToken}/start`, {
      method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }),
    });
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ answer: { access_token: answerToken, state: 'In Progress' } });
    expect(await repository.query("SELECT access_token, state, current_question_id FROM survey_responses WHERE id = 'token-access-answer-2026'"))
      .toEqual([{ access_token: answerToken, state: 'In Progress', current_question_id: 'question-token-access' }]);

    const missingStart = await route(`/api/public/surveys/${surveyToken}/start`, {
      method: 'POST', headers, body: JSON.stringify({}),
    });
    expect(missingStart.status).toBe(403);
    expect((await missingStart.json()).code).toBe('SURVEY_PUBLIC_TOKEN_REQUIRED');
    database.close();
  });

  test('preserves the invited answer across concurrent start and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-token-access-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const surveyToken = 'token-access-token-2026';
    const answerToken = 'token-access-answer-2026';
    const headers = { 'Content-Type': 'application/json' };
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_token_access_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const start = () => firstRoute(`/api/public/surveys/${surveyToken}/start`, {
        method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }),
      });
      const starts = await Promise.all([start(), start()]);
      expect(starts.map((response) => response.status).sort()).toEqual([200, 200]);
      const payloads = await Promise.all(starts.map((response) => response.json()));
      expect(new Set(payloads.map((payload) => payload.answer.access_token))).toEqual(new Set([answerToken]));
      expect(await firstRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-token-access'"))
        .toEqual([{ count: 1 }]);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_token_access_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT access_token, state, current_question_id FROM survey_responses WHERE id = 'token-access-answer-2026'"))
        .toEqual([{ access_token: answerToken, state: 'In Progress', current_question_id: 'question-token-access' }]);
      const resumed = await routeFor(reopenedRepository)(`/api/public/surveys/${surveyToken}?answer_token=${answerToken}`);
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).answer).toMatchObject({ access_token: answerToken, state: 'In Progress' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
