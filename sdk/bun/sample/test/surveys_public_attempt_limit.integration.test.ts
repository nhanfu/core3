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

describe('Surveys public per-respondent attempt limit', () => {
  test('keeps Odoo attempt fields and guards in the paired page/API contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const start = api.actions.find((action: any) => action.id === 'public_survey_start');
    const retry = api.actions.find((action: any) => action.id === 'public_survey_retry');
    const submit = api.actions.find((action: any) => action.id === 'public_survey_submit');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(api.datasources.find((source: any) => source.id === 'surveys').query).toContain('attempts_limit');
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('users_login_required');
    expect(yaml('operations.yaml').operations['survey.public.attempts'].query).toContain("state = 'Submitted'");
    expect(start).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.start', handler: 'yaml_mutation' });
    expect(start.mutation.fields).toContain('respondent_email');
    expect(start.mutation.guards.map((guard: any) => guard.code)).toEqual(['SURVEY_PUBLIC_LOGIN_REQUIRED', 'SURVEY_PUBLIC_LANGUAGE_INVALID', 'SURVEY_PUBLIC_TOKEN_REQUIRED', 'SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED']);
    expect(retry.mutation.guards.map((guard: any) => guard.code)).toContain('SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED');
    expect(submit.mutation.guards.map((guard: any) => guard.code)).toContain('SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED');
    expect(yaml('migrations/20261009000000-042-survey-public-attempt-limit.yaml').version).toBe('0.0.42');
  });

  test('requires respondent identity, persists one completed attempt, and blocks retry', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_attempt_limit_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const token = 'attempt-limit-token-2026';
    const headers = { 'Content-Type': 'application/json' };

    const missingEmail = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
    expect(missingEmail.status).toBe(401);
    expect(await missingEmail.json()).toEqual({ error: 'Enter an email address before starting this survey.', code: 'SURVEY_PUBLIC_LOGIN_REQUIRED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-attempt-limit'"))
      .toEqual([{ count: 0 }]);

    const started = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST', headers, body: JSON.stringify({ respondent_email: 'Limit.User@Example.com' }),
    });
    expect(started.status).toBe(200);
    const startedPayload = await started.json();
    const answerToken = startedPayload.answer.access_token;
    expect(startedPayload.answer).toMatchObject({ respondent_email: 'limit.user@example.com', state: 'In Progress' });

    const submitted = await route(`/api/public/surveys/${token}/submit`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-attempt-limit': 'Helpful' } }),
    });
    expect(submitted.status).toBe(200);
    expect(await repository.query("SELECT state, respondent_email FROM survey_responses WHERE survey_id = 'survey-demo-attempt-limit'"))
      .toEqual([{ state: 'Submitted', respondent_email: 'limit.user@example.com' }]);

    const secondStart = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST', headers, body: JSON.stringify({ respondent_email: 'limit.user@example.com' }),
    });
    expect(secondStart.status).toBe(409);
    expect(await secondStart.json()).toEqual({ error: 'You have no attempts left for this survey.', code: 'SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED' });
    const retry = await route(`/api/public/surveys/${token}/retry`, {
      method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, idempotency_key: 'attempt-limit-retry-1' }),
    });
    expect(retry.status).toBe(409);
    expect((await retry.json()).code).toBe('SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED');
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-attempt-limit'"))
      .toEqual([{ count: 1 }]);
    database.close();
  });

  test('converges idempotent starts and preserves the limit across file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-attempt-limit-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const token = 'attempt-limit-token-2026';
    const headers = { 'Content-Type': 'application/json' };
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_attempt_limit_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const start = () => firstRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ respondent_email: 'restart@example.com', idempotency_key: 'attempt-limit-start-1' }),
      });
      const started = await Promise.all([start(), start()]);
      expect(started.map((response) => response.status).sort()).toEqual([200, 200]);
      const payloads = await Promise.all(started.map((response) => response.json()));
      expect(new Set(payloads.map((payload) => payload.answer.access_token)).size).toBe(1);
      expect(await firstRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-attempt-limit'"))
        .toEqual([{ count: 1 }]);
      const answerToken = payloads[0].answer.access_token;
      const submitted = await firstRoute(`/api/public/surveys/${token}/submit`, {
        method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-attempt-limit': 'Neutral' }, idempotency_key: 'attempt-limit-submit-1' }),
      });
      expect(submitted.status).toBe(200);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_attempt_limit_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const blocked = await reopenedRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ respondent_email: 'RESTART@example.com', idempotency_key: 'attempt-limit-start-2' }),
      });
      expect(blocked.status).toBe(409);
      expect((await blocked.json()).code).toBe('SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED');
      expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-attempt-limit'"))
        .toEqual([{ count: 1 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
