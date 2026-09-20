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

describe('Surveys public previous-question navigation', () => {
  test('keeps the Odoo back-navigation source, YAML action, permission, and renderer binding explicit', () => {
    const api = yaml('api/surveys.yaml');
    const previous = api.actions.find((action: any) => action.id === 'public_survey_previous_question');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');
    expect(previous).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.previous_question', handler: 'yaml_mutation' });
    expect(previous.mutation.guards.map((guard: any) => guard.code)).toEqual(['SURVEY_PUBLIC_PREVIOUS_STALE', 'SURVEY_PUBLIC_PREVIOUS_INVALID']);
    expect(yaml('operations.yaml').operations['survey.public.previous_question'].query).toContain('previous_question.sequence');
    expect(renderer).toContain('/previous_question');
    expect(renderer).toContain('navigationKey = `public-previous:');
  });

  test('moves back one durable cursor, replays safely, and survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-previous-'));
    const databasePath = join(directory, 'previous.duckdb');
    const migrationTable = 'surveys_public_previous_restart';
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'public-previous-start-001' }) });
    const answerToken = (await started.json()).answer.access_token;
    const advanced = await route(`/api/public/surveys/${token}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-rating', navigation_key: 'public-next-for-previous-001' }) });
    expect(advanced.status).toBe(200);
    const previous = await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'public-previous-001' }) });
    expect(previous.status).toBe(200);
    expect(await previous.json()).toMatchObject({ replayed: false, question: { id: 'question-feedback-rating', sequence: 1 }, answer: { current_question_id: 'question-feedback-rating', navigation_key: 'public-previous-001' } });
    expect(await repository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ current_question_id: 'question-feedback-rating', navigation_key: 'public-previous-001' }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const replay = await routeFor(reopenedRepository)(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'public-previous-001' }) });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, question: { id: 'question-feedback-rating' }, answer: { current_question_id: 'question-feedback-rating' } });
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects wrong token, stale cursor, first-question exhaustion, closed response, and non-POST requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_previous_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
    const answerToken = (await started.json()).answer.access_token;
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'wrong-public-answer-token-2026', expected_question_id: 'question-feedback-comment', navigation_key: 'bad' }) })).status).toBe(404);
    expect((await route(`/api/public/surveys/${token}/previous_question`)).status).toBe(405);
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'stale' }) })).status).toBe(409);
    await repository.run("UPDATE survey_responses SET current_question_id = 'question-feedback-comment' WHERE access_token = ?", [answerToken]);
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'back-001' }) })).status).toBe(200);
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-rating', navigation_key: 'first' }) })).status).toBe(409);
    await repository.run("UPDATE survey_responses SET current_question_id = 'question-feedback-comment', state = 'Submitted' WHERE access_token = ?", [answerToken]);
    expect((await route(`/api/public/surveys/${token}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-feedback-comment', navigation_key: 'closed' }) })).status).toBe(409);
    database.close();
  });
});
