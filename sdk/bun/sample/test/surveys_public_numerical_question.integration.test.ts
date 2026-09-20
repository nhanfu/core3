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
const surveyToken = 'numerical-public-token-2026';
const questionId = 'question-numerical-range';

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

describe('Surveys public Numerical question', () => {
  test('keeps Odoo numerical validation in the paired page/API contract and renderer', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const progress = api.actions.find((action: any) => action.id === 'public_survey_progress');
    const submit = api.actions.find((action: any) => action.id === 'public_survey_submit');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(progress).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.progress', handler: 'yaml_mutation' });
    expect(submit).toMatchObject({ permission: 'surveys.public', action: 'surveys.public.submit', handler: 'yaml_mutation' });
    expect(operations['survey.public.questions'].query).toContain('validation_min_float_value');
    expect(renderer).toContain('validation_error_msg');
    expect(renderer).toContain('type="${numericalInput ? \'number\' : \'text\'}"');
    expect(yaml('migrations/20261003000000-036-survey-public-numerical-question.yaml').version).toBe('0.0.36');
  });

  test('rejects out-of-range values without mutation, then persists and replays a valid value across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-numerical-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_public_numerical_question_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect((await landing.json()).questions).toContainEqual(expect.objectContaining({
      id: questionId,
      question_type: 'Numerical',
      validation_required: true,
      validation_min_float_value: 1.5,
      validation_max_float_value: 10.5,
      validation_error_msg: 'Enter a value from 1.5 to 10.5 minutes.',
    }));

    const started = await route(`/api/public/surveys/${surveyToken}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idempotency_key: 'public-numerical-start-001' }),
    });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;

    for (const value of ['0', '11.1', 'not-a-number']) {
      const invalid = await route(`/api/public/surveys/${surveyToken}/progress`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ answer_token: answerToken, answers: { [questionId]: value } }),
      });
      expect(invalid.status).toBe(422);
      expect(await invalid.json()).toEqual({ error: 'Invalid answers: What is the measured service time in minutes?', code: 'SURVEY_PUBLIC_ANSWER_INVALID' });
    }
    expect(await repository.query('SELECT answer_data FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ answer_data: '{}' }]);

    const valid = await route(`/api/public/surveys/${surveyToken}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { [questionId]: '7.25' } }),
    });
    expect(valid.status).toBe(200);
    expect((await valid.json()).answer.answer_data).toBe('{"question-numerical-range":"7.25"}');
    database.close();

    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    expect(await reopenedRepository.query('SELECT state, answer_data, current_question_id FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([
      { state: 'In Progress', answer_data: '{"question-numerical-range":"7.25"}', current_question_id: questionId },
    ]);

    const body = JSON.stringify({ answer_token: answerToken, answers: { [questionId]: '7.25' }, idempotency_key: 'public-numerical-submit-001' });
    const submissions = await Promise.all([
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 200]);
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'public-numerical-submit-001'"))
      .toEqual([{ count: 1 }]);
    expect((await reopenedRepository.query('SELECT state, answer_data FROM survey_responses WHERE access_token = ?', [answerToken]))[0])
      .toMatchObject({ state: 'Submitted', answer_data: '{"question-numerical-range":"7.25"}' });
    expect((await reopenedRepository.query("SELECT response_count FROM surveys WHERE id = 'survey-demo-numerical'"))[0].response_count).toBe(1);

    const wrongToken = await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers: { [questionId]: '7.25' } }),
    });
    expect(wrongToken.status).toBe(404);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
