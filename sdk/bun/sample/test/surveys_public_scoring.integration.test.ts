import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
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
  const actions = Object.fromEntries(['public_survey_start', 'public_survey_submit'].map((id) => [id, api.actions.find((candidate: any) => candidate.id === id)]));
  return {
    async call(operation: string, request: any = {}) {
      if (operations[operation]) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      }
      const action = operation === 'surveys.public.start' ? actions.public_survey_start : actions.public_survey_submit;
      if (!action) throw new Error(`Unexpected survey operation: ${operation}`);
      return repository.executeMutation(action.mutation, request);
    },
  };
}

const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
const answers = {
  'question-feedback-rating': '5',
  'question-feedback-service': 'Excellent',
  'question-feedback-recommend': 'Yes',
};

async function seedScoring(repository: YamlRepository) {
  await repository.query('INSERT INTO survey_suggested_values(id, question_id, question_text, value, sequence, score) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET score = excluded.score RETURNING id', [
    'score-feedback-service-excellent-2026', 'question-feedback-service', 'How would you rate our service?', 'Excellent', 1, 100,
  ]);
  await repository.query('INSERT INTO survey_suggested_values(id, question_id, question_text, value, sequence, score) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET score = excluded.score RETURNING id', [
    'score-feedback-service-needs-2026', 'question-feedback-service', 'How would you rate our service?', 'Needs improvement', 3, 0,
  ]);
  await repository.query('INSERT INTO survey_suggested_values(id, question_id, question_text, value, sequence, score) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET score = excluded.score RETURNING id', [
    'score-feedback-recommend-yes-2026', 'question-feedback-recommend', 'Would you recommend us?', 'Yes', 1, 100,
  ]);
  await repository.query('INSERT INTO survey_suggested_values(id, question_id, question_text, value, sequence, score) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET score = excluded.score RETURNING id', [
    'score-feedback-recommend-no-2026', 'question-feedback-recommend', 'Would you recommend us?', 'No', 2, 0,
  ]);
}

describe('Surveys public response scoring', () => {
  test('declares the page/API contract and persists score/pass state through restart', async () => {
    const api = yaml('api/surveys.yaml');
    const page = yaml('pages/surveys.yaml');
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    const submit = api.actions.find((candidate: any) => candidate.id === 'public_survey_submit');
    expect(page.page.id).toBe('surveys');
    expect(submit.permission).toBe('surveys.public');
    expect(submit.mutation.fields).toEqual(expect.arrayContaining(['score', 'quiz_passed']));
    expect(submit.mutation.result.query).toContain('score');
    expect(renderer).toContain('quiz_passed');
    expect(renderer).toContain('Score:');
    expect(yaml('operations.yaml').operations['survey.public.scoring_answers'].query).toContain('survey_suggested_values');
    expect(yaml('migrations/20260921200000-024-survey-public-scoring.yaml').version).toBe('0.0.24');

    const path = `/tmp/core3-surveys-public-scoring-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await DuckDbDatabase.open(path);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_scoring_restart', ['schema', 'data']);
      await seedScoring(firstRepository);
      const service = createService(firstRepository);
      const module = new SurveysModule() as any;
      const route = (requestPath: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${requestPath}`, init), new URL(`http://survey.test${requestPath}`), service);
      const headers = { 'Content-Type': 'application/json' };
      const started = await (await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'scoring-start-001' }) })).json();
      const answerToken = started.answer.access_token;
      const submitted = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers, idempotency_key: 'scoring-submit-001' }) });
      expect(submitted.status).toBe(200);
      expect((await submitted.json()).answer).toMatchObject({ state: 'Submitted', score: 100, quiz_passed: true });
      expect(await firstRepository.query('SELECT score, quiz_passed FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ score: 100, quiz_passed: true }]);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'surveys_public_scoring_restart', ['schema', 'data']);
      const resumed = (await secondRepository.query('SELECT state, score, quiz_passed FROM survey_responses WHERE access_token = ?', [answerToken]))[0];
      expect(resumed).toEqual({ state: 'Submitted', score: 100, quiz_passed: true });
      second.close();
    } finally {
      if (existsSync(path)) unlinkSync(path);
    }
  });

  test('keeps a failing score stable across idempotent concurrent submit and rejects token misuse', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_scoring_boundary', ['schema', 'data']);
    await seedScoring(repository);
    const service = createService(repository);
    const module = new SurveysModule() as any;
    const route = (requestPath: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${requestPath}`, init), new URL(`http://survey.test${requestPath}`), service);
    const headers = { 'Content-Type': 'application/json' };
    const started = await (await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' })).json();
    const answerToken = started.answer.access_token;
    const submitBody = JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '1', 'question-feedback-service': 'Needs improvement', 'question-feedback-recommend': 'No' }, idempotency_key: 'scoring-fail-001' });
    const responses = await Promise.all([
      route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: submitBody }),
      route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: submitBody }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    expect((await repository.query('SELECT state, score, quiz_passed FROM survey_responses WHERE access_token = ?', [answerToken]))[0]).toEqual({ state: 'Submitted', score: 0, quiz_passed: false });
    expect((await repository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = ?', ['scoring-fail-001']))[0].count).toBe(1);
    const wrongToken = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers }) });
    expect(wrongToken.status).toBe(404);
    database.close();
  });
});
