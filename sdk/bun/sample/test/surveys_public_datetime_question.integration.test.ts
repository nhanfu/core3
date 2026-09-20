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
const surveyToken = '4ead4bc8-b8f2-4760-a682-1fde8ddb95ac';
const requiredAnswers = {
  'question-certification-product': 'Desk',
  'question-certification-policy': 'Yes',
  'question-certification-3': 'Yes',
  'question-certification-4': ['Desk'],
  'question-certification-5': ['Color'],
  'question-certification-6': '1',
  'question-certification-8': '$10',
  'question-certification-9': ['Desk', 'Chair'],
  'question-certification-11': '30',
  'question-certification-12': '30 days',
  'question-certification-13': 'Standard',
  'question-certification-datetime': '2026-01-15 09:30:00',
};

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

describe('Surveys public Datetime question', () => {
  test('keeps the Odoo datetime source and paired page/API contract explicit', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const progress = api.actions.find((action: any) => action.id === 'public_survey_progress');
    const submit = api.actions.find((action: any) => action.id === 'public_survey_submit');
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(progress).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.progress', handler: 'yaml_mutation' });
    expect(submit).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.submit', handler: 'yaml_mutation' });
    expect(renderer).toContain('YYYY-MM-DD HH:MM:SS');
    expect(renderer).toContain('isIsoDatetime');
    expect(yaml('migrations/20260924000000-027-survey-public-datetime-question.yaml').version).toBe('0.0.27');
  });

  test('rejects impossible datetimes without mutation, persists a valid value across restart, and replays one submit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-datetime-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_datetime_question_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect((await landing.json()).questions).toContainEqual(expect.objectContaining({ id: 'question-certification-datetime', question_type: 'Datetime' }));
    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'public-datetime-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    await repository.run("UPDATE survey_responses SET current_question_id = 'question-certification-datetime' WHERE access_token = ?", [answerToken]);

    const invalid = await route(`/api/public/surveys/${surveyToken}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-certification-datetime': '2026-02-30 09:30:00' } }),
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({ error: 'Invalid answers: When did you complete the vendor training session?', code: 'SURVEY_PUBLIC_ANSWER_INVALID' });
    expect(await repository.query('SELECT answer_data FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ answer_data: '{}' }]);

    const valid = await route(`/api/public/surveys/${surveyToken}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-certification-datetime': '2026-01-15 09:30:00' } }),
    });
    expect(valid.status).toBe(200);
    expect((await valid.json()).answer.answer_data).toBe('{"question-certification-datetime":"2026-01-15 09:30:00"}');
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    expect(await reopenedRepository.query('SELECT state, answer_data, current_question_id FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([
      { state: 'In Progress', answer_data: '{"question-certification-datetime":"2026-01-15 09:30:00"}', current_question_id: 'question-certification-datetime' },
    ]);

    const body = JSON.stringify({ answer_token: answerToken, answers: requiredAnswers, idempotency_key: 'public-datetime-submit-001' });
    const submissions = await Promise.all([
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 200]);
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'public-datetime-submit-001'")).toEqual([{ count: 1 }]);
    expect((await reopenedRepository.query('SELECT state, answer_data FROM survey_responses WHERE access_token = ?', [answerToken]))[0]).toMatchObject({ state: 'Submitted', answer_data: expect.stringContaining('question-certification-datetime') });
    expect((await reopenedRepository.query("SELECT response_count FROM surveys WHERE id = 'survey-demo-certification'"))[0].response_count).toBe(5);

    const wrongToken = await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers: { 'question-certification-datetime': '2026-01-15 09:30:00' } }) });
    expect(wrongToken.status).toBe(404);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
