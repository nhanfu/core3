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
const surveyToken = 'identity-public-token-2026';

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

describe('Surveys public respondent identity capture', () => {
  test('keeps Odoo identity flags in the paired YAML/API contract and renderer', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    const publicActions = api.actions.filter((action: any) => action.id.startsWith('public_survey_'));
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(operations['survey.public.identity_settings'].query).toContain('save_as_email');
    expect(operations['survey.public.identity_settings'].query).toContain('save_as_nickname');
    expect(renderer).toContain('autocomplete="${question.save_as_email ? \'email\' : \'nickname\'}"');
    expect(yaml('migrations/20260929000000-032-survey-public-identity.yaml').version).toBe('0.0.32');
  });

  test('persists email and nickname capture across restart and replays one submit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-identity-'));
    const databasePath = join(directory, 'identity.duckdb');
    const migrationTable = 'surveys_public_identity_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect(await landing.json()).toMatchObject({
      survey: { id: 'survey-demo-identity', title: 'Contact Details' },
      questions: [
        { id: 'question-identity-email', save_as_email: true, save_as_nickname: false },
        { id: 'question-identity-nickname', save_as_email: false, save_as_nickname: true },
      ],
    });

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'identity-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    const email = 'respondent@example.com';
    const name = 'Survey Respondent';
    const answers = { 'question-identity-email': email, 'question-identity-nickname': name };
    const progress = await route(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, answers: { 'question-identity-email': email } }) });
    expect(progress.status).toBe(200);
    expect((await progress.json()).answer).toMatchObject({ respondent_email: email, respondent_name: null });

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/${surveyToken}?answer_token=${encodeURIComponent(answerToken)}`);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ answer: { respondent_email: email, answer_data: JSON.stringify({ 'question-identity-email': email }) } });

    const submitBody = JSON.stringify({ answer_token: answerToken, answers, idempotency_key: 'identity-submit-001', respondent_email: 'spoof@example.com', respondent_name: 'Spoofed Name' });
    const submissions = await Promise.all([
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submitBody }),
      reopenedRoute(`/api/public/surveys/${surveyToken}/submit`, { method: 'POST', headers, body: submitBody }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 200]);
    expect((await reopenedRepository.query("SELECT state, respondent_email, respondent_name, answer_data FROM survey_responses WHERE access_token = ?", [answerToken]))[0]).toEqual({ state: 'Submitted', respondent_email: email, respondent_name: name, answer_data: JSON.stringify(answers) });
    expect((await reopenedRepository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE idempotency_key = 'identity-submit-001'"))[0].count).toBe(1);
    expect((await reopenedRepository.query("SELECT response_count FROM surveys WHERE id = 'survey-demo-identity'"))[0].response_count).toBe(1);

    const wrongToken = await reopenedRoute(`/api/public/surveys/${surveyToken}/progress`, { method: 'POST', headers, body: JSON.stringify({ answer_token: '00000000-0000-0000-0000-000000000000', answers }) });
    expect(wrongToken.status).toBe(404);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
