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
              : 'public_survey_previous_question';
      return repository.executeMutation(actions[actionId].mutation, request);
    },
  };
}

describe('Surveys public survey-level time limit workflow', () => {
  test('declares paired timer contracts and keeps the elapsed-time guard separate from response deadlines', () => {
    const api = yaml('api/surveys.yaml');
    const publicActions = api.actions.filter((action: any) => [
      'public_survey_begin',
      'public_survey_progress',
      'public_survey_submit',
      'public_survey_next_question',
      'public_survey_previous_question',
    ].includes(action.id));
    expect(publicActions).toHaveLength(5);
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(publicActions.every((action: any) => action.mutation.guards.some((guard: any) => guard.code === 'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED' && guard.status === 410))).toBe(true);
    expect(yaml('migrations/20261008000000-041-survey-public-time-limit.yaml').version).toBe('0.0.41');
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('is_time_limited');
    expect(yaml('operations.yaml').operations['survey.public.response'].query).toContain('start_datetime');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');
    expect(renderer).toContain('data-survey-timer');
    expect(renderer).toContain('Time expired');
    expect(renderer).toContain('time_limit');
  });

  test('starts an attempt with durable timer state, blocks after expiry, then survives reopen', async () => {
    const path = `/tmp/surveys-public-survey-timer-${process.pid}-${Date.now()}.duckdb`;
    const first = await DuckDbDatabase.open(path);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_survey_timer', ['schema', 'data']);
    const service = createService(firstRepository);
    const module = new SurveysModule() as any;
    const token = 'public-timer-token-2026';
    const route = (pathName: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${pathName}`, init), new URL(`http://survey.test${pathName}`), service);
    const headers = { 'Content-Type': 'application/json' };

    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'public-timer-start-001' }) });
    expect(started.status).toBe(200);
    const startedPayload = await started.json();
    const answerToken = startedPayload.answer.access_token;
    expect(startedPayload.survey.is_time_limited).toBe(true);
    expect(startedPayload.survey.time_limit).toBe(1);
    expect(startedPayload.answer.state).toBe('In Progress');
    expect(startedPayload.answer.start_datetime).toBeTruthy();

    await firstRepository.run("UPDATE survey_responses SET start_datetime = TIMESTAMP '2026-01-15 10:00:00' WHERE access_token = ?", [answerToken]);
    const expiredGet = await route(`/api/public/surveys/${token}?answer_token=${answerToken}`);
    expect(expiredGet.status).toBe(410);
    expect(await expiredGet.json()).toEqual({ error: "This survey's time limit has expired", code: 'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED' });
    const before = await firstRepository.query('SELECT state, answer_data, current_question_id, start_datetime FROM survey_responses WHERE access_token = ?', [answerToken]);
    const expiredProgress = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-public-timer': 'Calm' } }) });
    expect(expiredProgress.status).toBe(410);
    expect(await expiredProgress.json()).toEqual({ error: "This survey's time limit has expired", code: 'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED' });
    expect(await firstRepository.query('SELECT state, answer_data, current_question_id, start_datetime FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual(before);

    await firstRepository.run("UPDATE survey_responses SET start_datetime = TIMESTAMP '2099-01-15 10:00:00' WHERE access_token = ?", [answerToken]);
    const progress = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-public-timer': 'Focused' } }) });
    expect(progress.status).toBe(200);
    expect((await progress.json()).answer.state).toBe('In Progress');
    first.close();

    const second = await DuckDbDatabase.open(path);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'surveys_public_survey_timer', ['schema', 'data']);
    const reopened = await secondRepository.query('SELECT state, answer_data, CAST(start_datetime AS VARCHAR) AS start_datetime FROM survey_responses WHERE access_token = ?', [answerToken]);
    expect(reopened[0]).toMatchObject({ state: 'In Progress', answer_data: '{"question-public-timer":"Focused"}', start_datetime: expect.stringContaining('2099-01-15') });
    const replayService = createService(secondRepository);
    const replayModule = new SurveysModule() as any;
    const replay = await replayModule.handlePublicRoute(new Request(`http://survey.test/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken }) }), new URL(`http://survey.test/api/public/surveys/${token}/start`), replayService);
    expect(replay.status).toBe(200);
    expect((await replay.json()).answer.access_token).toBe(answerToken);
    second.close();
  });
});
