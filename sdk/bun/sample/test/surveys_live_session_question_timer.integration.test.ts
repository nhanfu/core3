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
const sessionCode = '5177';

function routeFor(repository: YamlRepository) {
  const operations = yaml('operations.yaml').operations;
  const api = yaml('api/live-session-join.yaml');
  const actions = Object.fromEntries(api.actions.map((action: any) => [action.action, action]));
  const service = {
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
  const module = new SurveysModule() as any;
  return (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://survey.test${path}`, init),
    new URL(`http://survey.test${path}`),
    service,
  ) as Promise<Response>;
}

const headers = { 'Content-Type': 'application/json' };

describe('Surveys live-session question timer', () => {
  test('keeps Odoo timer state in the paired page/API contract and renderer', () => {
    const api = yaml('api/live-session-join.yaml');
    const page = yaml('pages/live-session-join.yaml');
    const answer = api.actions.find((candidate: any) => candidate.id === 'submit_live_session_answer_public');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicLiveSession.ts'), 'utf8');
    expect(api.page).toEqual({ id: 'survey-live-session-join' });
    expect(page.page.id).toBe(api.page.id);
    expect(answer).toMatchObject({ action: 'surveys.sessions.answer', permission: 'surveys.public', handler: 'yaml_mutation' });
    expect(answer.mutation.guards.map((guard: any) => guard.code)).toContain('SURVEY_SESSION_QUESTION_TIME_EXPIRED');
    expect(operations['survey.public.session'].query).toContain('question_started_at');
    expect(operations['survey.public.session.question'].query).toContain('time_limit');
    expect(renderer).toContain('data-question-timer');
    expect(renderer).toContain('Time expired');
    expect(yaml('migrations/20261007000000-040-survey-live-question-timer.yaml').version).toBe('0.0.40');
  });

  test('rejects late answers without mutation, then accepts and replays within the durable timer after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-live-question-timer-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_live_question_timer_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-timer-sauce', current_question_text = 'Which sauce goes with a burger?', question_started_at = TIMESTAMP '2026-01-15 10:00:00' WHERE session_code = '5177'");
    const route = routeFor(repository);

    const joined = await route(`/api/public/surveys/session/${sessionCode}`, { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Timer Guest' }) });
    expect(joined.status).toBe(200);
    const joinedBody = await joined.json();
    const restored = await route(`/api/public/surveys/session/${sessionCode}?attendee_token=${encodeURIComponent(joinedBody.attendee_token)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ question: { id: 'question-timer-sauce', is_time_limited: true, time_limit: 30 }, session: { question_started_at: expect.stringContaining('2026-01-15') } });

    const late = await route(`/api/public/surveys/session/${sessionCode}/answer`, { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: 'Ketchup' }) });
    expect(late.status).toBe(409);
    expect(await late.json()).toEqual({ error: 'Sorry, you have not been fast enough. Wait for the host to start the next question.', code: 'SURVEY_SESSION_QUESTION_TIME_EXPIRED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE session_id = 'live-session-timer'")).toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT answer_count, question_answer_count FROM survey_live_sessions WHERE session_code = '5177'")).toEqual([{ answer_count: 0, question_answer_count: 0 }]);

    await repository.run("UPDATE survey_live_sessions SET question_started_at = TIMESTAMP '2099-01-15 10:00:00' WHERE session_code = '5177'");
    const valid = await route(`/api/public/surveys/session/${sessionCode}/answer`, { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: 'Ketchup' }) });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({ replayed: false, answer: { answer_value: 'Ketchup', question_id: 'question-timer-sauce' } });
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    expect(await reopenedRepository.query("SELECT answer_value, question_id FROM survey_live_session_answers WHERE session_id = 'live-session-timer'")).toEqual([{ answer_value: 'Ketchup', question_id: 'question-timer-sauce' }]);
    const replay = await reopenedRoute(`/api/public/surveys/session/${sessionCode}/answer`, { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: 'Tea' }) });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, answer: { answer_value: 'Ketchup', question_id: 'question-timer-sauce' } });
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE session_id = 'live-session-timer'")).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
