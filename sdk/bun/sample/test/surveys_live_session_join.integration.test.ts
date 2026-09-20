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

describe('Surveys public live-session join', () => {
  test('keeps the source route, YAML page/API contract, and public permission boundary explicit', () => {
    const api = yaml('api/live-session-join.yaml');
    const page = yaml('pages/live-session-join.yaml');
    expect(api.page).toEqual({ id: 'survey-live-session-join' });
    expect(page.page.id).toBe('survey-live-session-join');
    expect(page.page.route).toBe('/surveys/live-session-join');
    expect(api.datasources[0]).toMatchObject({ id: 'survey_live_session_join', permission: 'surveys.read' });
    expect(api.actions[0]).toMatchObject({ action: 'surveys.sessions.join', permission: 'surveys.public' });
    expect(page.actions.find((action: any) => action.id === 'join_live_session_preview')).toMatchObject({ type: 'client', permission: 'surveys.public' });
  });

  test('validates session code, joins In Progress and Ready sessions idempotently, and rejects closed or certification access', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_session_join_guards', ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };

    const invalid = await route('/api/public/surveys/session/0000');
    expect(invalid.status).toBe(404);
    expect(await invalid.json()).toEqual({ error: 'The live session is unavailable', code: 'SURVEY_SESSION_NOT_FOUND' });

    const empty = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: ' ' }) });
    expect(empty.status).toBe(422);

    const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Alice Morgan' }) });
    expect(joined.status).toBe(200);
    const joinedBody = await joined.json();
    expect(joinedBody).toMatchObject({ attendee_name: 'Alice Morgan', state: 'In Progress', survey_name: 'Feedback Form', session_code: '5822', session_state: 'In Progress', question: { id: 'question-feedback-rating' } });
    expect(joinedBody.attendee_token).toBe('live-token-alice-morgan-5822');
    expect((await repository.query("SELECT attendee_name, state, attendee_token, join_key FROM survey_live_attendees WHERE attendee_name = 'Alice Morgan'"))[0]).toEqual({ attendee_name: 'Alice Morgan', state: 'In Progress', attendee_token: 'live-token-alice-morgan-5822', join_key: 'session:live-session-feedback:name:alice-morgan' });

    const retry = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Alice Morgan' }) });
    expect(retry.status).toBe(200);
    expect((await retry.json()).attendee_token).toBe(joinedBody.attendee_token);
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_live_attendees WHERE join_key = 'session:live-session-feedback:name:alice-morgan'"))[0].count).toBe(1);

    await repository.run("UPDATE survey_live_sessions SET state = 'Closed' WHERE session_code = '5822'");
    const closed = await route('/api/public/surveys/session/5822');
    expect(closed.status).toBe(409);
    expect(await closed.json()).toMatchObject({ code: 'SURVEY_SESSION_CLOSED' });

    await repository.run("UPDATE survey_live_sessions SET state = 'Ready' WHERE session_code = '4448'");
    const waiting = await route('/api/public/surveys/session/4448', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Ready Guest' }) });
    expect(waiting.status).toBe(200);
    expect((await waiting.json()).state).toBe('Waiting');
    const certification = await route('/api/public/surveys/session/3919', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Certified Guest' }) });
    expect(certification.status).toBe(404);
    database.close();
  });

  test('retains the attendee token and idempotent rejoin across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-live-session-join-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_live_session_join_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const first = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Restart Guest' }) });
    expect(first.status).toBe(200);
    const token = (await first.json()).attendee_token;
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const retry = await reopenedRoute('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Restart Guest' }) });
    expect(retry.status).toBe(200);
    expect((await retry.json()).attendee_token).toBe(token);
    expect(await reopenedRepository.query("SELECT attendee_name, attendee_token, state FROM survey_live_attendees WHERE attendee_name = 'Restart Guest'"))
      .toEqual([{ attendee_name: 'Restart Guest', attendee_token: 'live-token-restart-guest-5822', state: 'In Progress' }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
