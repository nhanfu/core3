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

describe('Surveys public cookie resume', () => {
  test('keeps the Odoo cookie resume behavior in the paired public page/API contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const apiStart = api.actions.find((action: any) => action.id === 'public_survey_start');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(apiStart).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.start', handler: 'yaml_mutation' });
    expect(apiStart.fields.map((field: any) => field.field)).toContain('answer_token');
    expect(readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8')).toContain('answer_token');
  });

  test('sets, resumes, replays, and persists the survey cookie across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-cookie-'));
    const databasePath = join(directory, 'cookie.duckdb');
    const migrationTable = 'surveys_public_cookie_restart';
    const surveyToken = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'cookie-start-001' }) });
    expect(started.status).toBe(200);
    const startedBody = await started.json();
    const answerToken = startedBody.answer.access_token;
    const setCookie = started.headers.get('set-cookie') || '';
    expect(setCookie).toBe(`survey_${surveyToken}=${answerToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    const cookieHeaders = { cookie: setCookie, ...headers };
    const resumed = await route(`/api/public/surveys/${surveyToken}`, { headers: { cookie: setCookie } });
    expect(resumed.status).toBe(200);
    expect(await resumed.json()).toMatchObject({ answer: { access_token: answerToken, state: 'In Progress' } });

    const concurrent = await Promise.all([
      route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers: cookieHeaders, body: '{}' }),
      route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers: cookieHeaders, body: '{}' }),
    ]);
    expect(concurrent.map((response) => response.status)).toEqual([200, 200]);
    expect((await concurrent[0].json()).answer.access_token).toBe(answerToken);
    expect((await concurrent[1].json()).answer.access_token).toBe(answerToken);
    expect(await repository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ count: 1 }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const reopened = await reopenedRoute(`/api/public/surveys/${surveyToken}`, { headers: { cookie: setCookie } });
    expect(reopened.status).toBe(200);
    expect(await reopened.json()).toMatchObject({ answer: { access_token: answerToken, current_question_id: 'question-feedback-rating' } });
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('ignores stale cookies while preserving explicit token and invalid-cookie boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_cookie_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const surveyToken = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const stale = await route(`/api/public/surveys/${surveyToken}`, { headers: { cookie: `survey_${surveyToken}=stale-answer-token-2026` } });
    expect(stale.status).toBe(200);
    expect(await stale.json()).not.toHaveProperty('answer');
    const malformedCookie = await route(`/api/public/surveys/${surveyToken}`, { headers: { cookie: `survey_${surveyToken}=bad` } });
    expect(malformedCookie.status).toBe(200);
    expect(await malformedCookie.json()).not.toHaveProperty('answer');
    const explicit = await route(`/api/public/surveys/${surveyToken}?answer_token=stale-answer-token-2026`);
    expect(explicit.status).toBe(404);
    database.close();
  });
});
