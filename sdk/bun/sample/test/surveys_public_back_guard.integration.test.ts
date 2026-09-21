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

describe('Surveys public users_can_go_back guard', () => {
  test('keeps the Odoo source setting and paired page/API contract explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py', 'utf8');
    const api = yaml('api/surveys.yaml');
    const previous = api.actions.find((action: any) => action.id === 'public_survey_previous_question');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');
    expect(source).toContain("users_can_go_back = fields.Boolean");
    expect(yaml('migrations/20261010000000-043-survey-public-back-guard.yaml').version).toBe('0.0.43');
    expect(yaml('pages/surveys.yaml').page.id).toBe('surveys');
    expect(api.page.id).toBe('surveys');
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('users_can_go_back');
    expect(yaml('api/survey-detail.yaml').datasources[0].query).toContain('users_can_go_back');
    expect(yaml('pages/survey-detail.yaml').components[0].groups[1].fields).toContainEqual({ field: 'users_can_go_back', label: 'Allow going back' });
    expect(previous.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_PUBLIC_PREVIOUS_DISABLED',
      'SURVEY_PUBLIC_PREVIOUS_STALE',
      'SURVEY_PUBLIC_RESPONSE_EXPIRED',
      'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED',
      'SURVEY_PUBLIC_PREVIOUS_INVALID',
    ]);
    expect(renderer).toContain('survey.users_can_go_back !== false');
  });

  test('blocks direct Previous for a durable no-back survey, survives restart, and replays after enabling it', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-back-guard-'));
    const databasePath = join(directory, 'back-guard.duckdb');
    const migrationTable = 'surveys_public_back_guard_restart';
    const token = 'no-back-token-2026';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);
    const landing = await route(`/api/public/surveys/${token}`);
    expect(landing.status).toBe(200);
    expect(await landing.json()).toMatchObject({ survey: { id: 'survey-demo-no-back', users_can_go_back: false }, questions: [{ id: 'question-no-back-first' }, { id: 'question-no-back-second' }] });
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'public-back-guard-start-001' }) });
    const answerToken = (await started.json()).answer.access_token;
    const advanced = await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-no-back-first', navigation_key: 'public-back-guard-next-001' }) });
    expect(advanced.status).toBe(200);
    expect((await advanced.json()).answer.current_question_id).toBe('question-no-back-second');
    const before = await repository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken]);
    const blocked = await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-no-back-second', navigation_key: 'public-back-guard-previous-001' }) });
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({ error: 'This survey does not allow returning to previous questions.', code: 'SURVEY_PUBLIC_PREVIOUS_DISABLED' });
    expect(await repository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual(before);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    expect(await reopenedRepository.query("SELECT users_can_go_back FROM surveys WHERE id = 'survey-demo-no-back'")).toEqual([{ users_can_go_back: false }]);
    await reopenedRepository.run("UPDATE surveys SET users_can_go_back = true WHERE id = 'survey-demo-no-back'");
    const reopenedRoute = routeFor(reopenedRepository);
    const [first, second] = await Promise.all([
      reopenedRoute(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-no-back-second', navigation_key: 'public-back-guard-enabled-001' }) }),
      reopenedRoute(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-no-back-second', navigation_key: 'public-back-guard-enabled-001' }) }),
    ]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect((await first.json()).answer.current_question_id).toBe('question-no-back-first');
    expect((await second.json()).answer.current_question_id).toBe('question-no-back-first');
    expect(await reopenedRepository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ current_question_id: 'question-no-back-first', navigation_key: 'public-back-guard-enabled-001' }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('keeps the disabled boundary ahead of stale and wrong-token mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_back_guard_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const token = 'no-back-token-2026';
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
    const answerToken = (await started.json()).answer.access_token;
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'wrong-public-back-token-2026', expected_question_id: 'question-no-back-second', navigation_key: 'wrong' }) })).status).toBe(404);
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'wrong-question', navigation_key: 'stale' }) })).status).toBe(409);
    database.close();
  });
});
