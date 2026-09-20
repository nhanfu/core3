import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function createService(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const api = yaml('api/surveys.yaml');
  const actions = Object.fromEntries([
    'public_survey_start',
    'public_survey_progress',
    'public_survey_submit',
    'public_survey_next_question',
    'public_survey_previous_question',
    'public_survey_retry',
  ].map((id) => [id, api.actions.find((candidate: any) => candidate.id === id)]));
  return {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const actionId = operation === 'surveys.public.start'
        ? 'public_survey_start'
        : operation === 'surveys.public.progress'
          ? 'public_survey_progress'
          : operation === 'surveys.public.submit'
            ? 'public_survey_submit'
            : operation === 'surveys.public.next_question'
              ? 'public_survey_next_question'
              : operation === 'surveys.public.previous_question'
                ? 'public_survey_previous_question'
                : 'public_survey_retry';
      return repository.executeMutation(actions[actionId].mutation, request);
    },
  };
}

describe('Surveys public response deadline workflow', () => {
  test('declares a durable deadline and applies the YAML/API guard to public mutations', () => {
    const api = yaml('api/surveys.yaml');
    const publicActions = api.actions.filter((action: any) => [
      'public_survey_progress',
      'public_survey_submit',
      'public_survey_next_question',
      'public_survey_previous_question',
    ].includes(action.id));
    expect(publicActions).toHaveLength(4);
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(publicActions.every((action: any) => action.mutation.guards.some((guard: any) => guard.code === 'SURVEY_PUBLIC_RESPONSE_EXPIRED' && guard.status === 410))).toBe(true);
    expect(yaml('migrations/20260921100000-023-survey-public-deadlines.yaml').version).toBe('0.0.23');
    expect(yaml('operations.yaml').operations['survey.public.response'].query).toContain('deadline');
    expect(readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8')).toContain('errorPayload.error');
  });

  test('rejects expired tokens before progress, navigation, submit, and retry without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_deadline_guards', ['schema', 'data']);
    const service = createService(repository);
    const module = new SurveysModule() as any;
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const expiredToken = 'expired-deadline-fixture-token-2026';
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);
    const headers = { 'Content-Type': 'application/json' };
    const before = await repository.query("SELECT state, answer_data, current_question_id, deadline FROM survey_responses WHERE access_token = ?", [expiredToken]);
    const get = await route(`/api/public/surveys/${token}?answer_token=${expiredToken}`);
    expect(get.status).toBe(410);
    expect(await get.json()).toEqual({ error: 'This survey response has expired', code: 'SURVEY_PUBLIC_RESPONSE_EXPIRED' });

    for (const operation of ['progress', 'next_question', 'previous_question', 'submit'] as const) {
      const body = operation === 'progress'
        ? { answer_token: expiredToken, answers: { 'question-feedback-rating': '4' } }
        : operation === 'submit'
          ? { answer_token: expiredToken, answers: { 'question-feedback-rating': '4', 'question-feedback-service': 'Good', 'question-feedback-recommend': 'Yes' } }
          : { answer_token: expiredToken, expected_question_id: 'question-feedback-rating', navigation_key: `expired-${operation}-001` };
      const response = await route(`/api/public/surveys/${token}/${operation}`, { method: 'POST', headers, body: JSON.stringify(body) });
      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({ error: 'This survey response has expired', code: 'SURVEY_PUBLIC_RESPONSE_EXPIRED' });
    }
    const retry = await route(`/api/public/surveys/${token}/retry`, { method: 'POST', headers, body: JSON.stringify({ answer_token: expiredToken, idempotency_key: 'expired-retry-001' }) });
    expect(retry.status).toBe(410);
    expect(await retry.json()).toEqual({ error: 'This survey response has expired', code: 'SURVEY_PUBLIC_RESPONSE_EXPIRED' });
    expect(await repository.query("SELECT state, answer_data, current_question_id, deadline FROM survey_responses WHERE access_token = ?", [expiredToken])).toEqual(before);
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'expired-retry-001'")).toEqual([{ count: 0 }]);
    database.close();
  });

  test('keeps the deadline boundary durable across reopen while an active response remains editable', async () => {
    const path = `/tmp/surveys-public-deadline-${process.pid}-${Date.now()}.duckdb`;
    const first = await DuckDbDatabase.open(path);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_deadline_restart', ['schema', 'data']);
    const service = createService(firstRepository);
    const module = new SurveysModule() as any;
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const headers = { 'Content-Type': 'application/json' };
    const route = (pathName: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${pathName}`, init), new URL(`http://survey.test${pathName}`), service);
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'deadline-active-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    await firstRepository.run("UPDATE survey_responses SET deadline = TIMESTAMP '2099-01-15 08:00:00' WHERE access_token = ?", [answerToken]);
    const progress = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5' } }) });
    expect(progress.status).toBe(200);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'surveys_public_deadline_restart', ['schema', 'data']);
    const reopened = await secondRepository.query('SELECT state, answer_data, CAST(deadline AS VARCHAR) AS deadline FROM survey_responses WHERE access_token = ?', [answerToken]);
    expect(reopened[0]).toMatchObject({ state: 'In Progress', answer_data: '{"question-feedback-rating":"5"}', deadline: expect.stringContaining('2099-01-15') });
    const replayService = createService(secondRepository);
    const replayModule = new SurveysModule() as any;
    const replay = await replayModule.handlePublicRoute(new Request(`http://survey.test/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) }), new URL(`http://survey.test/api/public/surveys/${token}/start`), replayService);
    expect(replay.status).toBe(200);
    expect((await replay.json()).answer.access_token).toBe(answerToken);
    second.close();
  });
});
