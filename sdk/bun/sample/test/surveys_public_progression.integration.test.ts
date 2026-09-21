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

describe('Surveys public progression mode', () => {
  test('keeps Odoo progression choices in the paired page/API contract', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const surveys = api.datasources.find((source: any) => source.id === 'surveys');
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(surveys.query).toContain('progression_mode');
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('progression_mode');
    expect(renderer).toContain('progression_mode');
    expect(renderer).toContain('% completed');
    expect(yaml('migrations/20261013000000-046-survey-public-progression-mode.yaml').version).toBe('0.0.46');
  });

  test('returns the durable number mode, preserves it during public progress, and guards foreign tokens', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_progression_guards', ['schema', 'data']);
    const route = routeFor(repository);
    const headers = { 'Content-Type': 'application/json' };

    const detail = await route('/api/public/surveys/progression-number-token-2026');
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      survey: { id: 'survey-demo-progression-number', progression_mode: 'number', questions_layout: 'page_per_question' },
      questions: [{ id: 'question-progression-first' }, { id: 'question-progression-second' }],
    });

    const foreign = await route('/api/public/surveys/progression-number-token-2026/progress', {
      method: 'POST', headers, body: JSON.stringify({ answer_token: 'foreign-progression-answer-2026', answers: {} }),
    });
    expect(foreign.status).toBe(404);

    const started = await route('/api/public/surveys/progression-number-token-2026/start', {
      method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'progression-start-1' }),
    });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    const progress = await route('/api/public/surveys/progression-number-token-2026/progress', {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, answers: { 'question-progression-first': 'Clear' } }),
    });
    expect(progress.status).toBe(200);
    expect((await progress.json()).answer.state).toBe('In Progress');
    expect((await route(`/api/public/surveys/progression-number-token-2026?answer_token=${answerToken}`)).status).toBe(200);
    database.close();
  });

  test('preserves progression mode and draft state across restart, then converges submit idempotently', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-progression-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const token = 'progression-number-token-2026';
    const headers = { 'Content-Type': 'application/json' };
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_progression_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const started = await firstRoute(`/api/public/surveys/${token}/start`, { method: 'POST', headers, body: '{}' });
      const answerToken = (await started.json()).answer.access_token;
      await firstRoute(`/api/public/surveys/${token}/progress`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, answers: { 'question-progression-first': 'Unclear', 'question-progression-second': 'Easy' } }),
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_progression_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const resumed = await reopenedRoute(`/api/public/surveys/${token}?answer_token=${answerToken}`);
      expect(await resumed.json()).toMatchObject({
        survey: { progression_mode: 'number' },
        answer: { state: 'In Progress', answer_data: JSON.stringify({ 'question-progression-first': 'Unclear', 'question-progression-second': 'Easy' }) },
      });

      const submit = () => reopenedRoute(`/api/public/surveys/${token}/submit`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, answers: { 'question-progression-first': 'Unclear', 'question-progression-second': 'Easy' }, idempotency_key: 'progression-submit-1' }),
      });
      const submitted = await Promise.all([submit(), submit()]);
      expect(submitted.map((response) => response.status).sort()).toEqual([200, 200]);
      expect((await submitted[0].json()).answer.state).toBe('Submitted');
      expect(await reopenedRepository.query("SELECT r.state, s.response_count FROM survey_responses r JOIN surveys s ON s.id = r.survey_id WHERE r.access_token = '" + answerToken + "'"))
        .toEqual([{ state: 'Submitted', response_count: 1 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
