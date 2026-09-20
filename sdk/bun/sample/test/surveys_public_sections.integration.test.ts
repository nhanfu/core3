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

describe('Surveys public section navigation', () => {
  test('keeps the conditional section out of the paired public page/API question flow', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const publicActions = api.actions.filter((action: any) => action.id.startsWith('public_survey_'));
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(publicActions.every((action: any) => action.permission === 'surveys.public')).toBe(true);
    expect(yaml('operations.yaml').operations['survey.public.questions'].query).toContain('COALESCE(is_page, false) = false');
    expect(yaml('operations.yaml').operations['survey.public.first_question'].query).toContain('COALESCE(is_page, false) = false');
    expect(yaml('operations.yaml').operations['survey.public.next_question'].query).toContain('next_question.is_page');
    expect(yaml('operations.yaml').operations['survey.public.previous_question'].query).toContain('previous_question.is_page');
    expect(renderer).toContain('current_question_id');
    expect(renderer).toContain('/next_question');
    expect(renderer).toContain('/previous_question');
  });

  test('skips the durable section cursor, replays concurrent navigation, and survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-sections-'));
    const databasePath = join(directory, 'sections.duckdb');
    const migrationTable = 'surveys_public_sections_restart';
    const surveyToken = 'conditional-public-token-2026';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await repository.run("UPDATE surveys SET state = 'Published', access_token = ? WHERE id = 'survey-demo-conditional'", [surveyToken]);
    const route = routeFor(repository);

    const catalog = await route(`/api/public/surveys/${surveyToken}`);
    expect(catalog.status).toBe(200);
    expect((await catalog.json()).questions.map((question: any) => question.id)).toEqual([
      'question-conditional-role', 'question-conditional-region', 'question-conditional-tools', 'question-conditional-comment',
    ]);

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'sections-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    expect(await repository.query('SELECT current_question_id FROM survey_responses WHERE access_token = ?', [answerToken]))
      .toEqual([{ current_question_id: 'question-conditional-role' }]);

    const toRegion = await route(`/api/public/surveys/${surveyToken}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-conditional-role', navigation_key: 'sections-next-role' }) });
    expect(toRegion.status).toBe(200);
    expect(await toRegion.json()).toMatchObject({ question: { id: 'question-conditional-region' }, answer: { current_question_id: 'question-conditional-region' } });

    const concurrent = await Promise.all([
      route(`/api/public/surveys/${surveyToken}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-conditional-region', navigation_key: 'sections-next-region' }) }),
      route(`/api/public/surveys/${surveyToken}/next_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-conditional-region', navigation_key: 'sections-next-region' }) }),
    ]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 200]);
    const concurrentBodies = await Promise.all(concurrent.map((response) => response.json()));
    expect(concurrentBodies.every((body) => body.question?.id === 'question-conditional-tools')).toBe(true);
    expect(concurrentBodies.some((body) => body.replayed === true)).toBe(true);
    expect(await repository.query('SELECT current_question_id, navigation_key FROM survey_responses WHERE access_token = ?', [answerToken]))
      .toEqual([{ current_question_id: 'question-conditional-tools', navigation_key: 'sections-next-region' }]);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const back = await reopenedRoute(`/api/public/surveys/${surveyToken}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-conditional-tools', navigation_key: 'sections-previous-tools' }) });
    expect(back.status).toBe(200);
    expect(await back.json()).toMatchObject({ question: { id: 'question-conditional-region' }, answer: { current_question_id: 'question-conditional-region' } });
    const replay = await reopenedRoute(`/api/public/surveys/${surveyToken}/previous_question`, { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-conditional-tools', navigation_key: 'sections-previous-tools' }) });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, question: { id: 'question-conditional-region' } });
    expect(await reopenedRepository.query('SELECT COUNT(*) AS count FROM survey_responses WHERE access_token = ?', [answerToken])).toEqual([{ count: 1 }]);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects a section cursor and leaves the response durable state unchanged', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_sections_guards', ['schema', 'data']);
    await repository.run("UPDATE surveys SET state = 'Published', access_token = 'conditional-guard-token-2026' WHERE id = 'survey-demo-conditional'");
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };
    const started = await route('/api/public/surveys/conditional-guard-token-2026/start', { method: 'POST', headers, body: '{}' });
    const answerToken = (await started.json()).answer.access_token;
    const section = await route('/api/public/surveys/conditional-guard-token-2026/next_question', { method: 'POST', headers, body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'section-conditional-profile', navigation_key: 'section-invalid' }) });
    expect(section.status).toBe(409);
    expect(await section.json()).toMatchObject({ code: 'SURVEY_PUBLIC_NEXT_EXHAUSTED' });
    expect(await repository.query('SELECT current_question_id FROM survey_responses WHERE access_token = ?', [answerToken]))
      .toEqual([{ current_question_id: 'question-conditional-role' }]);
    database.close();
  });
});
