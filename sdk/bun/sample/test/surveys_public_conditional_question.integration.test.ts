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
const surveyToken = 'branching-public-token-2026';

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

describe('Surveys public conditional question', () => {
  test('keeps Odoo trigger visibility in the paired page/API contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const publicActions = api.actions.filter((action: any) => action.id.startsWith('public_survey_'));
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(operations['survey.public.questions'].query).toContain('trigger_question_id');
    expect(operations['survey.public.next_question'].query).toContain('survey_question_triggers');
    expect(renderer).toContain('/next_question');
    expect(renderer).toContain('questions.push(nextPayload.question)');
    expect(renderer).toContain('questions.push(previousPayload.question)');
    expect(yaml('migrations/20260927000000-030-survey-public-conditional-question.yaml').version).toBe('0.0.30');
  });

  test('skips hidden follow-ups, shows matching triggers, persists the branch across restart, and replays submit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-conditional-'));
    const databasePath = join(directory, 'conditional.duckdb');
    const migrationTable = 'surveys_public_conditional_question_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect((await landing.json()).questions.map((question: any) => question.id)).toEqual([
      'question-branching-vegetarian', 'question-branching-meal',
    ]);
    expect(await repository.query('SELECT question_id, source_question_id, source_answer FROM survey_question_triggers')).toEqual([
      { question_id: 'question-branching-followup', source_question_id: 'question-branching-vegetarian', source_answer: 'Yes' },
    ]);

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'conditional-start-no-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;

    const savedNo = await route(`/api/public/surveys/${surveyToken}/progress`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-branching-vegetarian': 'No' } }),
    });
    expect(savedNo.status).toBe(200);
    const skipped = await route(`/api/public/surveys/${surveyToken}/next_question`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-branching-vegetarian', navigation_key: 'conditional-next-no-001' }),
    });
    expect(skipped.status).toBe(200);
    expect(await skipped.json()).toMatchObject({ question: { id: 'question-branching-meal' }, answer: { current_question_id: 'question-branching-meal' } });

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    expect(await reopenedRepository.query('SELECT state, answer_data, current_question_id FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([
      { state: 'In Progress', answer_data: '{"question-branching-vegetarian":"No"}', current_question_id: 'question-branching-meal' },
    ]);

    const previous = await reopenedRoute(`/api/public/surveys/${surveyToken}/previous_question`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-branching-meal', navigation_key: 'conditional-previous-no-001' }),
    });
    expect(previous.status).toBe(200);
    expect(await previous.json()).toMatchObject({ question: { id: 'question-branching-vegetarian' }, answer: { current_question_id: 'question-branching-vegetarian' } });

    const submittedBody = JSON.stringify({
      answer_token: answerToken,
      answers: { 'question-branching-vegetarian': 'No', 'question-branching-meal': 'Vegetarian pizza' },
      idempotency_key: 'conditional-submit-no-001',
    });
    const submissions = await Promise.all([
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submittedBody }),
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submittedBody }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 200]);
    expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'conditional-submit-no-001'")).toEqual([{ count: 1 }]);
    expect((await reopenedRepository.query("SELECT response_count FROM surveys WHERE id = 'survey-demo-branching'"))[0].response_count).toBe(1);

    const startedYes = await reopenedRoute(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'conditional-start-yes-001' }) });
    const yesToken = (await startedYes.json()).answer.access_token;
    await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: yesToken, answers: { 'question-branching-vegetarian': 'Yes' } }) });
    const shown = await reopenedRoute(`/api/public/surveys/${surveyToken}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: yesToken, expected_question_id: 'question-branching-vegetarian', navigation_key: 'conditional-next-yes-001' }) });
    expect(shown.status).toBe(200);
    expect(await shown.json()).toMatchObject({ question: { id: 'question-branching-followup' }, answer: { current_question_id: 'question-branching-followup' } });

    const wrongToken = await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers: { 'question-branching-vegetarian': 'No' } }) });
    expect(wrongToken.status).toBe(404);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
