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

const headers = { 'Content-Type': 'application/json' };

describe('Surveys public live-session polling', () => {
  test('keeps the polling route token-scoped and paired to the live-session page/API', async () => {
    const api = yaml('api/live-session-join.yaml');
    const page = yaml('pages/live-session-join.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicLiveSession.ts'), 'utf8');
    expect(api.page).toEqual({ id: 'survey-live-session-join' });
    expect(page.page.id).toBe(api.page.id);
    expect(operations['survey.public.session.poll'].query).toContain('poll_revision');
    expect(operations['survey.public.session.poll'].query).toContain(':session_code');
    expect(renderer).toContain('/poll');
    expect(renderer).toContain('setInterval(() => void load(true), 3000)');
    expect(renderer).toContain('poll_revision');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_live_poll_contract', ['schema', 'data']);
    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
    const route = routeFor(repository);
    const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Poll Guest' }) });
    expect(joined.status).toBe(200);
    const attendeeToken = (await joined.json()).attendee_token;

    const missingToken = await route('/api/public/surveys/session/5822/poll');
    expect(missingToken.status).toBe(401);
    const first = await route(`/api/public/surveys/session/5822/poll?attendee_token=${attendeeToken}`);
    expect(first.status).toBe(200);
    const firstPayload = await first.json();
    expect(firstPayload).toMatchObject({ question: { id: 'question-feedback-rating' }, attendee: { attendee_token: attendeeToken } });
    expect(Number(firstPayload.session.poll_revision)).toBeGreaterThan(0);
    expect((await route('/api/public/surveys/session/5822/poll', { method: 'POST', headers, body: '{}' })).status).toBe(405);
    expect((await route(`/api/public/surveys/session/5822/poll?attendee_token=foreign-poll-token-2026`)).status).toBe(404);

    await repository.run("UPDATE survey_live_sessions SET current_question_id = 'question-feedback-comment', current_question_text = 'What can we improve?', question_started_at = TIMESTAMP '2026-01-15 10:10:00', row_version = row_version + 1 WHERE session_code = '5822'");
    const polls = await Promise.all([
      route(`/api/public/surveys/session/5822/poll?attendee_token=${attendeeToken}`),
      route(`/api/public/surveys/session/5822/poll?attendee_token=${attendeeToken}`),
    ]);
    expect(polls.map((response) => response.status)).toEqual([200, 200]);
    const payloads = await Promise.all(polls.map((response) => response.json()));
    expect(payloads[0]).toMatchObject({ question: { id: 'question-feedback-comment' } });
    expect(payloads[1].session.poll_revision).toBe(payloads[0].session.poll_revision);
    expect(payloads[0].session.poll_revision).toBeGreaterThan(firstPayload.session.poll_revision);
    database.close();
  });

  test('preserves the poll revision and current question across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-live-poll-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_live_poll_restart', ['schema', 'data']);
      await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-rating', current_question_text = 'How satisfied are you?' WHERE session_code = '5822'");
      const route = routeFor(repository);
      const joined = await route('/api/public/surveys/session/5822', { method: 'POST', headers, body: JSON.stringify({ attendee_name: 'Restart Poll Guest' }) });
      const attendeeToken = (await joined.json()).attendee_token;
      await repository.run("UPDATE survey_live_sessions SET current_question_id = 'question-feedback-comment', current_question_text = 'What can we improve?', row_version = row_version + 1 WHERE session_code = '5822'");
      const beforeRestart = await route(`/api/public/surveys/session/5822/poll?attendee_token=${attendeeToken}`);
      const beforePayload = await beforeRestart.json();
      database.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_live_poll_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const afterRestart = await reopenedRoute(`/api/public/surveys/session/5822/poll?attendee_token=${attendeeToken}`);
      expect(afterRestart.status).toBe(200);
      expect(await afterRestart.json()).toMatchObject({
        question: { id: 'question-feedback-comment' },
        session: { poll_revision: beforePayload.session.poll_revision },
      });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
