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

const token = 'public-language-token-2026';
const headers = { 'Content-Type': 'application/json' };

describe('Surveys public respondent language', () => {
  test('keeps language in the paired page/API contracts and rejects unsupported public choices', async () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');
    const start = api.actions.find((action: any) => action.id === 'public_survey_start');
    const detail = detailApi.datasources.find((source: any) => source.id === 'survey_detail');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(start.permission).toBe('surveys.public');
    expect(start.mutation.fields).toContain('language_code');
    expect(start.mutation.result.query).toContain('language_code');
    expect(detail.query).toContain('languages');
    expect(detailApi.datasources.find((source: any) => source.id === 'survey_responses').query).toContain('language_code');
    expect(operations['survey.public.detail'].query).toContain('languages');
    expect(operations['survey.public.response'].query).toContain('language_code');
    expect(renderer).toContain('data-language');
    expect(renderer).toContain('language_code');
    expect(yaml('migrations/20261016000000-049-survey-public-language.yaml').version).toBe('0.0.49');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_language_contract', ['schema', 'data']);
    const route = routeFor(repository);
    const detailResponse = await route(`/api/public/surveys/${token}`);
    expect(detailResponse.status).toBe(200);
    expect((await detailResponse.json()).survey.languages).toBe('en_US||fr_FR');

    const invalid = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST', headers, body: JSON.stringify({ language_code: 'de_DE', idempotency_key: 'language-invalid' }),
    });
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).code).toBe('SURVEY_PUBLIC_LANGUAGE_INVALID');
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-public-language'"))
      .toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists language through concurrent idempotent start and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-language-'));
    const databasePath = join(directory, 'surveys.duckdb');
    let answerToken = '';
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_language_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const start = () => firstRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ language_code: 'fr_FR', idempotency_key: 'language-start-1' }),
      });
      const started = await Promise.all([start(), start()]);
      expect(started.map((response) => response.status).sort()).toEqual([200, 200]);
      const payload = await started[0].json();
      answerToken = payload.answer.access_token;
      expect(payload.answer.language_code).toBe('fr_FR');
      expect(await firstRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-public-language'"))
        .toEqual([{ count: 1 }]);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_language_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const resumed = await reopenedRoute(`/api/public/surveys/${token}?answer_token=${answerToken}`);
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).answer).toMatchObject({ state: 'In Progress', language_code: 'fr_FR' });

      const locked = await reopenedRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, language_code: 'en_US' }),
      });
      expect(locked.status).toBe(409);
      expect((await locked.json()).code).toBe('SURVEY_PUBLIC_LANGUAGE_LOCKED');
      expect(await reopenedRepository.query(`SELECT language_code FROM survey_responses WHERE access_token = '${answerToken}'`))
        .toEqual([{ language_code: 'fr_FR' }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
