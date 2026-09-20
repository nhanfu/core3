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

describe('Surveys public live-session renderer binding', () => {
  test('binds the Odoo /s route to the existing page/API contract and token guards', () => {
    const app = readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicLiveSession.ts'), 'utf8');
    const page = yaml('pages/live-session-join.yaml');
    const api = yaml('api/live-session-join.yaml');
    expect(app).toContain("path.match(/^\\/s(?:\\/([A-Za-z0-9_-]+))?$/)");
    expect(app).toContain("./components/PublicLiveSession.ts");
    expect(renderer).toContain('/api/public/surveys/session/');
    expect(renderer).toContain('/answer');
    expect(renderer).toContain('attendee_token');
    expect(page.page.id).toBe(api.page.id);
    expect(api.actions.map((action: any) => action.permission)).toContain('surveys.public');
    expect(api.actions.find((action: any) => action.action === 'surveys.sessions.answer').mutation.guards.map((guard: any) => guard.code)).toContain('SURVEY_SESSION_ANSWER_ALREADY_SUBMITTED');
  });

  test('joins, answers, reloads, and replays one durable attendee state after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-session-renderer-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_session_renderer_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Renderer Guest' }) });
    expect(joined.status).toBe(200);
    const joinedBody = await joined.json();
    const submitted = await route('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '5' }) });
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toMatchObject({ replayed: false, answer: { answer_value: '5', question_id: 'question-feedback-rating' } });
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/session/5822?attendee_token=${encodeURIComponent(joinedBody.attendee_token)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ attendee: { attendee_name: 'Renderer Guest', attendee_token: joinedBody.attendee_token }, answer: { answer_value: '5' } });
    const replay = await reopenedRoute('/api/public/surveys/session/5822/answer', { method: 'POST', headers, body: JSON.stringify({ attendee_token: joinedBody.attendee_token, answer_value: '4' }) });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, answer: { answer_value: '5' } });
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE attendee_id = ?', [joinedBody.id])).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
