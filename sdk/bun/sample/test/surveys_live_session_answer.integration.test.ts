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

describe('Surveys public live-session answers', () => {
  test('keeps the YAML page/API split and submits one scoped current-question answer', async () => {
    const api = yaml('api/live-session-join.yaml');
    const page = yaml('pages/live-session-join.yaml');
    const answer = api.actions.find((candidate: any) => candidate.id === 'submit_live_session_answer_public');
    expect(api.page).toEqual({ id: 'survey-live-session-join' });
    expect(page.page.id).toBe(api.page.id);
    expect(answer).toMatchObject({ action: 'surveys.sessions.answer', permission: 'surveys.public', handler: 'yaml_mutation' });
    expect(answer.mutation.table).toBe('survey_live_session_answers');
    expect(answer.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SESSION_NOT_IN_PROGRESS', 'SURVEY_SESSION_ATTENDEE_NOT_FOUND',
      'SURVEY_SESSION_ANSWER_REQUIRED', 'SURVEY_SESSION_ANSWER_INVALID', 'SURVEY_SESSION_ANSWER_ALREADY_SUBMITTED',
    ]);
    expect(api.datasources[0].query).toContain(':attendee_token');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_session_answer_contract', ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Answer Guest' }) });
    expect(joined.status).toBe(200);
    const joinedBody = await joined.json();

    const submitted = await route('/api/public/surveys/session/5822/answer', {
      method: 'POST', headers,
      body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '5' }),
    });
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toMatchObject({ replayed: false, answer: { answer_value: '5', score: 100, question_id: 'question-feedback-rating' } });
    expect(await repository.query("SELECT answer_value, score FROM survey_live_session_answers WHERE attendee_id = ?", [joinedBody.id]))
      .toEqual([{ answer_value: '5', score: 100 }]);
    expect(await repository.query("SELECT score FROM survey_live_attendees WHERE id = ?", [joinedBody.id]))
      .toEqual([{ score: 100 }]);
    expect(await repository.query("SELECT answer_count, question_answer_count FROM survey_live_sessions WHERE session_code = '5822'"))
      .toEqual([{ answer_count: 1, question_answer_count: 1 }]);

    const replay = await route('/api/public/surveys/session/5822/answer', {
      method: 'POST', headers,
      body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '4' }),
    });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, answer: { answer_value: '5' } });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE attendee_id = ?", [joinedBody.id]))
      .toEqual([{ count: 1 }]);

    expect((await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '' }) })).status).toBe(422);
    expect((await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: 'missing-live-token-2026', answer_value: '5' }) })).status).toBe(404);
    expect((await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: 'live-token-other-5822', answer_value: '9' }) })).status).toBe(404);

    await repository.run("UPDATE survey_live_sessions SET state = 'Closed' WHERE session_code = '5822'");
    expect((await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '4' }) })).status).toBe(409);
    database.close();
  });

  test('retains the answer and replay boundary across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-live-session-answer-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_live_session_answer_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Restart Answer Guest' }) });
    const joinedBody = await joined.json();
    await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '4' }) });
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/session/5822?attendee_token=${encodeURIComponent(joinedBody.attendee_token)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ attendee: { attendee_name: 'Restart Answer Guest' }, answer: { answer_value: '4', question_id: 'question-feedback-rating' } });
    const replay = await reopenedRoute('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '5' }) });
    expect(await replay.json()).toMatchObject({ replayed: true, answer: { answer_value: '4' } });
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE attendee_id = ?", [joinedBody.id]))
      .toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
