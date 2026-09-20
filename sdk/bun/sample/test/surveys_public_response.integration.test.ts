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
    const submittedSnapshot = await repository.query('SELECT state, answer_data, respondent_name, respondent_email FROM survey_responses WHERE access_token = ?', [answerToken]);
    const resumeSubmitted = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken }) });
    expect(resumeSubmitted.status).toBe(409);
    expect(await repository.query('SELECT state, answer_data, respondent_name, respondent_email FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual(submittedSnapshot);
    database.close();
  });

  test('retries start and submit idempotently without duplicate responses or counts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_idempotency_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const surveyApi = yaml('pages/surveys.yaml');
    const actions = Object.fromEntries(['public_survey_start', 'public_survey_submit'].map((id) => [id, surveyApi.actions.find((candidate: any) => candidate.id === id)]));
    const service = {
      async call(operation: string, request: any = {}) {
        if (operations[operation]) {
          const definition = operations[operation];
          const bound = bindNamedParams(definition.query, request);
          return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
        }
        const action = operation === 'surveys.public.start' ? actions.public_survey_start : actions.public_survey_submit;
        return repository.executeMutation(action.mutation, request);
      },
    };
    const module = new SurveysModule() as any;
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);
    const headers = { 'Content-Type': 'application/json' };
    const initialSurvey = (await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0];
    const initialResponses = (await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = ? AND state = 'Submitted'", ['survey-demo-feedback']))[0].count;
    const startBody = JSON.stringify({ idempotency_key: 'qa-start-retry-001' });
    const firstStart = await (await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: startBody })).json();
    const retryStart = await (await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: startBody })).json();
    expect(retryStart.answer).toMatchObject({ id: firstStart.answer.id, access_token: firstStart.answer.access_token });
    expect((await repository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = ?', ['qa-start-retry-001']))[0].count).toBe(1);

    const submit = (body: Record<string, unknown>) => route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify(body) });
    const submitBody = { answer_token: firstStart.answer.access_token, answers: { 'question-feedback-rating': '5', 'question-feedback-service': 'Excellent', 'question-feedback-recommend': 'Yes' }, idempotency_key: 'qa-submit-retry-001' };
    expect((await submit(submitBody)).status).toBe(200);
    const retrySubmit = await submit({ ...submitBody, answers: {} });
    expect(retrySubmit.status).toBe(200);
    expect((await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(initialSurvey.response_count + 1);
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = ? AND state = 'Submitted'", ['survey-demo-feedback']))[0].count).toBe(initialResponses + 1);
    database.close();
  });

  test('refuses invalid, expired, cross-survey, and stale tokens without disclosure or mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_boundary_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const surveyApi = yaml('pages/surveys.yaml');
    const actions = Object.fromEntries(['public_survey_start', 'public_survey_progress', 'public_survey_submit'].map((id) => [id, surveyApi.actions.find((candidate: any) => candidate.id === id)]));
    const service = {
      async call(operation: string, request: any = {}) {
        if (operations[operation]) {
          const definition = operations[operation];
          const bound = bindNamedParams(definition.query, request);
          return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
        }
        const action = operation === 'surveys.public.start' ? actions.public_survey_start : operation === 'surveys.public.progress' ? actions.public_survey_progress : actions.public_survey_submit;
        return repository.executeMutation(action.mutation, request);
      },
    };
    const module = new SurveysModule() as any;
    const token = 'b135640d-14d4-4748-9ef6-344ca256531e';
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);
    const headers = { 'Content-Type': 'application/json' };
    const initialCount = (await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count;

    const invalid = await route('/api/public/surveys/not-a-valid-survey-token');
    expect(invalid.status).toBe(404);
    expect(await invalid.json()).toEqual({ error: 'Survey is unavailable' });
    const crossSurvey = await route('/api/public/surveys/4ead4bc8-b8f2-4760-a682-1fde8ddb95ac/start', { method: 'POST', headers, body: JSON.stringify({ answer_token: 'missing-feedback-answer-token-2026' }) });
    expect(crossSurvey.status).toBe(404);
    expect(await crossSurvey.json()).toEqual({ error: 'Survey response is unavailable' });

    await repository.run("INSERT INTO survey_responses(id, survey_id, survey_name, answer_data, access_token, state) VALUES ('expired-public-response', 'survey-demo-feedback', 'Feedback Form', '{\"old\":\"answer\"}', 'expired-public-answer-token-2026', 'Expired')");
    const expiredBefore = await repository.query("SELECT state, answer_data FROM survey_responses WHERE id = 'expired-public-response'");
    const expiredProgress = await route(`/api/public/surveys/${token}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'expired-public-answer-token-2026', answers: { 'question-feedback-rating': '1' } }) });
    expect(expiredProgress.status).toBe(409);
    expect(await expiredProgress.json()).toEqual({ error: 'This survey response is no longer available for editing' });
    const expiredSubmit = await route(`/api/public/surveys/${token}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: 'expired-public-answer-token-2026', answers: { 'question-feedback-rating': '1', 'question-feedback-service': 'Good', 'question-feedback-recommend': 'Yes' } }) });
    expect(expiredSubmit.status).toBe(409);
    expect(await repository.query("SELECT state, answer_data FROM survey_responses WHERE id = 'expired-public-response'")).toEqual(expiredBefore);
    expect((await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(initialCount);

    await repository.run("UPDATE surveys SET state = 'Closed' WHERE id = 'survey-demo-feedback'");
    const closedStart = await route(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
    expect(closedStart.status).toBe(404);
    expect(await closedStart.json()).toEqual({ error: 'Survey is unavailable' });
    expect((await repository.query('SELECT response_count FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0].response_count).toBe(initialCount);
    database.close();
  });
});
