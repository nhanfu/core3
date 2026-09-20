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
const surveyToken = 'b135640d-14d4-4748-9ef6-344ca256531e';
const answers = {
  'question-feedback-rating': '5',
  'question-feedback-service': 'Excellent',
  'question-feedback-recommend': 'Yes',
};

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

async function openRepository(name: string, path = ':memory:') {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Surveys public completion message', () => {
  test('keeps the Odoo description_done field in the paired public contract and renderer', () => {
    const page = yaml('pages/surveys.yaml');
    const detail = yaml('operations.yaml').operations['survey.public.detail'];
    const submit = yaml('api/surveys.yaml').actions.find((candidate: any) => candidate.id === 'public_survey_submit');
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    expect(page.page.id).toBe('surveys');
    expect(detail.query).toContain('description_done');
    expect(submit.permission).toBe('surveys.public');
    expect(submit.mutation.result.query).toContain('description_done');
    expect(renderer).toContain('survey.description_done');
    expect(yaml('migrations/20260922200000-025-survey-public-end-message.yaml').version).toBe('0.0.25');
  });

  test('returns the durable completion copy on submit and after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-end-message-'));
    const databasePath = join(directory, 'survey.duckdb');
    try {
      const first = await openRepository('surveys_public_end_message_restart', databasePath);
      const service = createService(first.repository);
      const module = new SurveysModule() as any;
      const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);
      const headers = { 'Content-Type': 'application/json' };
      const started = await (await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: '{}' })).json();
      const answerToken = started.answer.access_token;
      const submitted = await route(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers, idempotency_key: 'end-message-submit-001' }) });
      expect(submitted.status).toBe(200);
      expect((await submitted.json()).survey).toMatchObject({ description_done: 'Thank you for completing the Feedback Form.' });
      first.database.close();

      const second = await openRepository('surveys_public_end_message_restart', databasePath);
      const resumedService = createService(second.repository);
      const resumedRoute = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), resumedService);
      const resumed = await resumedRoute(`/api/public/surveys/${surveyToken}?answer_token=${encodeURIComponent(answerToken)}`, { headers });
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).survey.description_done).toBe('Thank you for completing the Feedback Form.');
      second.database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('replays concurrent public submit safely and rejects a wrong token', async () => {
    const { database, repository } = await openRepository('surveys_public_end_message_boundary');
    try {
      const service = createService(repository);
      const module = new SurveysModule() as any;
      const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://survey.test${path}`, init), new URL(`http://survey.test${path}`), service);
      const headers = { 'Content-Type': 'application/json' };
      const started = await (await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: '{}' })).json();
      const body = JSON.stringify({ answer_token: started.answer.access_token, answers, idempotency_key: 'end-message-concurrent-001' });
      const responses = await Promise.all([
        route(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
        route(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
      expect((await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'end-message-concurrent-001'"))[0].count).toBe(1);
      const wrongToken = await route(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers }) });
      expect(wrongToken.status).toBe(404);
    } finally {
      database.close();
    }
  });
});
