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
  const api = yaml('api/surveys.yaml');
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

describe('Surveys public answer validation', () => {
  test('keeps validation on the token-scoped YAML public submit/progress contract', () => {
    const api = yaml('api/surveys.yaml');
    const submit = api.actions.find((action: any) => action.id === 'public_survey_submit');
    const progress = api.actions.find((action: any) => action.id === 'public_survey_progress');
    const module = readFileSync(join(root, 'module.ts'), 'utf8');
    expect(submit).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.submit', handler: 'yaml_mutation' });
    expect(progress).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.progress', handler: 'yaml_mutation' });
    expect(module).toContain('SURVEY_PUBLIC_ANSWER_INVALID');
    expect(module).toContain('invalidPublicAnswers');
    expect(module).toContain('Number.isFinite');
  });

  test('rejects invalid choice/rating/numeric values without mutation, then persists valid answers across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-answer-validation-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_answer_validation_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'answer-validation-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    const invalid = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '9' } }) });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({ error: 'Invalid answers: How satisfied are you?', code: 'SURVEY_PUBLIC_ANSWER_INVALID' });
    expect(await repository.query('SELECT state, answer_data FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ state: 'In Progress', answer_data: '{}' }]);
    const valid = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5' } }) });
    expect(valid.status).toBe(200);
    expect((await valid.json()).answer.answer_data).toBe('{"question-feedback-rating":"5"}');
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/${token}?answer_token=${encodeURIComponent(answerToken)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ answer: { access_token: answerToken, answer_data: '{"question-feedback-rating":"5"}' } });
    const replayInvalid = await reopenedRoute(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '9', 'question-feedback-service': 'Excellent', 'question-feedback-recommend': 'Yes' }, idempotency_key: 'answer-validation-submit-invalid-001' }) });
    expect(replayInvalid.status).toBe(422);
    const submitted = await reopenedRoute(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5', 'question-feedback-service': 'Excellent', 'question-feedback-recommend': 'Yes' }, idempotency_key: 'answer-validation-submit-001' }) });
    expect(submitted.status).toBe(200);
    expect((await submitted.json()).answer.state).toBe('Submitted');
    const replay = await reopenedRoute(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: {}, idempotency_key: 'answer-validation-submit-001' }) });
    expect(replay.status).toBe(200);
    expect((await replay.json()).answer.state).toBe('Submitted');
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
