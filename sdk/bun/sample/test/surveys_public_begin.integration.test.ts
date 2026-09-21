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

describe('Surveys public begin lifecycle', () => {
  test('keeps Odoo begin behavior in the paired page/API YAML contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const begin = api.actions.find((action: any) => action.id === 'public_survey_begin');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(begin).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.begin', handler: 'yaml_mutation' });
    expect(begin.mutation).toMatchObject({ operation: 'update', table: 'survey_responses', concurrency: false });
    expect(begin.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_PUBLIC_BEGIN_STATE', 'SURVEY_PUBLIC_RESPONSE_EXPIRED', 'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED', 'SURVEY_PUBLIC_BEGIN_QUESTION',
    ]);
  });

  test('begins an existing New token response and safely replays concurrent starts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_begin_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const answerToken = 'test-token-feedback-2026';
    const headers = { 'Content-Type': 'application/json' };

    const responses = await Promise.all([
      route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) }),
      route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    const payloads = await Promise.all(responses.map((response) => response.json()));
    expect(payloads.map((payload) => payload.answer.access_token)).toEqual([answerToken, answerToken]);
    expect(payloads.some((payload) => payload.replayed === true)).toBe(true);
    expect(await repository.query("SELECT state, current_question_id FROM survey_responses WHERE access_token = ?", [answerToken]))
      .toEqual([{ state: 'In Progress', current_question_id: 'question-feedback-rating' }]);
    database.close();
  });

  test('retains the begun state across restart and rejects a submitted replay without mutation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-begin-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_begin_restart';
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const answerToken = 'test-token-feedback-2026';
    const headers = { 'Content-Type': 'application/json' };
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const firstRoute = routeFor(firstRepository);
    expect((await firstRoute(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) })).status).toBe(200);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const secondRoute = routeFor(secondRepository);
    const resumed = await secondRoute(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) });
    expect(resumed.status).toBe(200);
    expect(await resumed.json()).toMatchObject({ answer: { state: 'In Progress', current_question_id: 'question-feedback-rating' } });
    await secondRepository.run("UPDATE survey_responses SET state = 'Submitted' WHERE access_token = ?", [answerToken]);
    const before = await secondRepository.query("SELECT state, current_question_id FROM survey_responses WHERE access_token = ?", [answerToken]);
    const submitted = await secondRoute(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) });
    expect(submitted.status).toBe(409);
    expect(await secondRepository.query("SELECT state, current_question_id FROM survey_responses WHERE access_token = ?", [answerToken])).toEqual(before);
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
