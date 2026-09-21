import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function publicService(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const api = yaml('api/live-session-join.yaml');
  const actions = Object.fromEntries(api.actions.map((action: any) => [action.action, action]));
  return {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const action = actions[operation];
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

const headers = { 'Content-Type': 'application/json' };

describe('Surveys live-session speed rating parity', () => {
  test('joins the Odoo setting to separate survey-detail and live-session page/API contracts', () => {
    const detailPage = yaml('pages/survey-detail.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const joinPage = yaml('pages/live-session-join.yaml');
    const joinApi = yaml('api/live-session-join.yaml');
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const update = detailApi.actions.find((action: any) => action.id === 'update_survey_speed_rating');

    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(joinApi.page.id).toBe(joinPage.page.id);
    expect(detailApi.datasources.find((source: any) => source.id === 'survey_detail').query).toContain('session_speed_rating');
    expect(joinApi.datasources.find((source: any) => source.id === 'survey_live_session_join').query).toContain('speed_rating_time_limit');
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'update_survey_speed_rating', permission: 'surveys.write' }));
    expect(form.groups).toContainEqual(expect.objectContaining({
      title: 'Live Session',
      fields: expect.arrayContaining([
        expect.objectContaining({ field: 'session_speed_rating' }),
        expect.objectContaining({ field: 'session_speed_rating_time_limit' }),
      ]),
    }));
    expect(update).toMatchObject({ action: 'surveys.records.live_speed_rating.update', permission: 'surveys.write', handler: 'yaml_mutation' });
    expect(update.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SPEED_RATING_NOT_FOUND', 'SURVEY_SPEED_RATING_STALE',
      'SURVEY_SPEED_RATING_ACTOR_REQUIRED', 'SURVEY_SPEED_RATING_LIMIT_INVALID',
    ]);
    expect(yaml('migrations/20261025000000-062-survey-live-speed-rating.yaml').version).toBe('0.0.62');
    expect(yaml('migrations/20261025010000-063-survey-live-speed-rating-demo.yaml').version).toBe('0.0.63');
  });

  test('updates the durable setting with permission, missing, invalid, and stale guards, then survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-speed-rating-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_speed_rating_guards', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_speed_rating');
      const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;

      await expect(repository.executeMutation(action.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: '',
        values: { session_speed_rating: true, session_speed_rating_time_limit: 30 },
      })).rejects.toMatchObject({ status: 403, code: 'SURVEY_SPEED_RATING_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(action.mutation, {
        id: 'missing-survey', expected_row_version: 1, current_user_id: 'user-admin',
        values: { session_speed_rating: true, session_speed_rating_time_limit: 30 },
      })).rejects.toMatchObject({ status: 404, code: 'SURVEY_SPEED_RATING_NOT_FOUND' });
      await expect(repository.executeMutation(action.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { session_speed_rating: true, session_speed_rating_time_limit: 0 },
      })).rejects.toMatchObject({ status: 422, code: 'SURVEY_SPEED_RATING_LIMIT_INVALID' });

      const updated = await repository.executeMutation(action.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { session_speed_rating: true, session_speed_rating_time_limit: 30 },
      });
      expect(updated).toMatchObject({ id: 'survey-demo-001', session_speed_rating: true, session_speed_rating_time_limit: 30 });
      await expect(repository.executeMutation(action.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { session_speed_rating: false, session_speed_rating_time_limit: 0 },
      })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SPEED_RATING_STALE' });
      first.close();

      const reopened = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopened);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_speed_rating_guards', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT session_speed_rating, session_speed_rating_time_limit FROM surveys WHERE id = 'survey-demo-001'"))
        .toEqual([{ session_speed_rating: true, session_speed_rating_time_limit: 30 }]);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('applies deterministic quick-answer scoring, idempotent replay, and restart persistence', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-speed-rating-flow-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_speed_rating_flow', ['schema', 'data']);
      await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-burger-6', current_question_text = 'Rate this burger', question_started_at = TIMESTAMP '2026-01-15 10:00:00' WHERE session_code = '4448'");
      const route = routeFor(repository);
      const fastJoined = await route('/api/public/surveys/session/4448', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Fast Guest' }) });
      const slowJoined = await route('/api/public/surveys/session/4448', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Slow Guest' }) });
      const fastToken = (await fastJoined.json()).attendee_token;
      const slowToken = (await slowJoined.json()).attendee_token;
      const fast = await route('/api/public/surveys/session/4448/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: fastToken, answer_value: '5', submitted_at: '2026-01-15T10:00:01' }) });
      const slow = await route('/api/public/surveys/session/4448/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: slowToken, answer_value: '5', submitted_at: '2026-01-15T10:00:45' }) });
      expect(fast.status).toBe(200);
      expect((await fast.json()).answer).toMatchObject({ score: 100, answer_value: '5' });
      expect(slow.status).toBe(200);
      expect((await slow.json()).answer).toMatchObject({ score: 75, answer_value: '5' });
      const replay = await route('/api/public/surveys/session/4448/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: fastToken, answer_value: '1', submitted_at: '2026-01-15T10:01:00' }) });
      expect(await replay.json()).toMatchObject({ replayed: true, answer: { score: 100, answer_value: '5' } });
      expect(await repository.query("SELECT score FROM survey_live_attendees WHERE session_id = 'live-session-burger' ORDER BY attendee_name"))
        .toEqual([{ score: 100 }, { score: 75 }]);
      first.close();

      const reopened = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopened);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_speed_rating_flow', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT answer_value, score FROM survey_live_session_answers WHERE session_id = 'live-session-burger' ORDER BY attendee_id"))
        .toEqual([{ answer_value: '5', score: 100 }, { answer_value: '5', score: 75 }]);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
