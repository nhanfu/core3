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

describe('Surveys public next-question navigation', () => {
  test('keeps Odoo next-question route, page/API ownership, public permission, and guards explicit', () => {
    const api = yaml('api/surveys.yaml');
    const next = api.actions.find((action: any) => action.id === 'public_survey_next_question');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(next).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.next_question', handler: 'yaml_mutation' });
    expect(next.mutation).toMatchObject({ operation: 'update', table: 'survey_responses' });
    expect(next.mutation.guards.map((guard: any) => guard.code)).toEqual(['SURVEY_PUBLIC_NEXT_STALE', 'SURVEY_PUBLIC_RESPONSE_EXPIRED', 'SURVEY_PUBLIC_NEXT_INVALID']);
    expect(yaml('operations.yaml').operations['survey.public.next_question'].query).toContain('next_question.sequence');
    expect(renderer).toContain('current_question_id');
    expect(renderer).toContain('/next_question');
    expect(renderer).toContain('expected_question_id: question.id');
    expect(renderer).toContain('navigation_key: navigationKey');
    expect(renderer).toContain('/previous_question');
    expect(renderer).toContain('expected_question_id: question.id');
    expect(renderer).not.toContain('questionIndex += 1');
  });

  test('advances one durable question cursor, replays safely, and survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-next-'));
    const databasePath = join(directory, 'next.duckdb');
    const migrationTable = 'surveys_public_next_restart';
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'public-next-start-001' }) });
    expect(started.status).toBe(200);
    const startedBody = await started.json();
    const answerToken = startedBody.answer.access_token;
    expect(startedBody.answer.current_question_id).toBe('question-feedback-rating');

    const advanced = await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-rating', navigation_key: 'public-next-001' }) });
    expect(advanced.status).toBe(200);
    const advancedBody = await advanced.json();
    expect(advancedBody).toMatchObject({ replayed: false, question: { id: 'question-feedback-comment', sequence: 2 }, answer: { current_question_id: 'question-feedback-comment', navigation_key: 'public-next-001' } });
    expect(await repository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ current_question_id: 'question-feedback-comment', navigation_key: 'public-next-001' }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const replay = await reopenedRoute(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-rating', navigation_key: 'public-next-001' }) });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, question: { id: 'question-feedback-comment' }, answer: { current_question_id: 'question-feedback-comment' } });
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects wrong token, stale cursor, invalid next question, final question, closed, and non-POST requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_next_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
    const answerToken = (await started.json()).answer.access_token;
    expect((await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'wrong-public-answer-token-2026', expected_question_id: 'question-feedback-rating', navigation_key: 'bad' }) })).status).toBe(404);
    expect((await route(`/api/public/surveys/${token}/next_question`)).status).toBe(405);
    expect((await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'stale' }) })).status).toBe(409);
    expect((await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-rating', next_question_id: 'question-certification-product', navigation_key: 'invalid' }) })).status).toBe(200);
    await repository.run("UPDATE survey_responses SET current_question_id = 'question-feedback-notes' WHERE access_token = ?", [answerToken]);
    expect((await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-notes', navigation_key: 'final' }) })).status).toBe(409);
    await repository.run("UPDATE survey_responses SET state = 'Submitted' WHERE access_token = ?", [answerToken]);
    expect((await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-notes', navigation_key: 'closed' }) })).status).toBe(409);
    database.close();
  });
});
