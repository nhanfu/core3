import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys public response workflow', () => {
  test('starts, saves progress, submits, and rejects duplicate token submission', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_response_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const surveyApi = yaml('pages/surveys.yaml');
    const start = surveyApi.actions.find((candidate: any) => candidate.id === 'public_survey_start');
    const progress = surveyApi.actions.find((candidate: any) => candidate.id === 'public_survey_progress');
    const submit = surveyApi.actions.find((candidate: any) => candidate.id === 'public_survey_submit');
    const service = {
      async call(operation: string, request: any = {}) {
        if (operations[operation]) {
          const definition = operations[operation];
          const bound = bindNamedParams(definition.query, request);
          return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
        }
        const actions: Record<string, any> = {
          'surveys.public.start': start,
          'surveys.public.progress': progress,
          'surveys.public.submit': submit,
        };
        const action = actions[operation];
        if (!action) throw new Error(`Unexpected survey operation: ${operation}`);
        return repository.executeMutation(action.mutation, request);
      },
    };
    const module = new SurveysModule() as any;
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);

    const landing = await route(`/api/public/surveys/${token}`);
    expect(landing.status).toBe(200);
    expect(await landing.json()).toMatchObject({ survey: { id: 'survey-demo-feedback', state: 'Published' }, questions: expect.any(Array) });
    const started = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(started.status).toBe(200);
    const startedBody = await started.json();
    const answerToken = startedBody.answer.access_token;
    expect(startedBody.answer).toMatchObject({ survey_id: 'survey-demo-feedback', state: 'In Progress', answer_data: '{}' });
    const missing = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers: {} }) });
    expect(missing.status).toBe(422);
    expect((await missing.json()).error).toContain('Required answers are missing');
    expect((await repository.query('SELECT state, answer_data FROM survey_responses WHERE access_token = ?', [answerToken]))[0]).toEqual({ state: 'In Progress', answer_data: '{}' });
    expect((await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(4);

    const saved = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5' } }) });
    expect(saved.status).toBe(200);
    expect((await saved.json()).answer).toMatchObject({ state: 'In Progress', answer_data: '{"question-feedback-rating":"5"}' });
    const submitted = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-feedback-rating': '5', 'question-feedback-service': 'Excellent', 'question-feedback-recommend': 'Yes' }, respondent_name: 'QA Participant', respondent_email: 'qa@example.com' }) });
    expect(submitted.status).toBe(200);
    expect((await submitted.json()).answer).toMatchObject({ state: 'Submitted', answer_data: expect.stringContaining('question-feedback-recommend') });
    expect((await repository.query('SELECT state, respondent_name, respondent_email FROM survey_responses WHERE access_token = ?', [answerToken]))[0]).toEqual({ state: 'Submitted', respondent_name: 'QA Participant', respondent_email: 'qa@example.com' });
    expect((await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(5);
    const duplicate = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers: {} }) });
    expect(duplicate.status).toBe(409);
    database.close();
  });
});
