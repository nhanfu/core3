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

const token = 'random-selection-token-2026';
const headers = { 'Content-Type': 'application/json' };

describe('Surveys public random question selection', () => {
  test('keeps the Odoo setting in separate page/API contracts and persists the response order', async () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const surveys = api.datasources.find((source: any) => source.id === 'surveys');
    const detail = detailApi.datasources.find((source: any) => source.id === 'survey_detail');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(surveys.query).toContain('questions_selection');
    expect(detail.query).toContain('questions_selection');
    expect(operations['survey.public.detail'].query).toContain('questions_selection');
    expect(operations['survey.public.response'].query).toContain('question_order');
    expect(renderer).toContain('questions_selection');
    expect(renderer).toContain('question_order');
    expect(yaml('migrations/20261014000000-047-survey-public-random-selection.yaml').version).toBe('0.0.47');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_random_contract', ['schema', 'data']);
    const route = routeFor(repository);
    const detailResponse = await route(`/api/public/surveys/${token}`);
    expect(detailResponse.status).toBe(200);
    const detailPayload = await detailResponse.json();
    expect(detailPayload).toMatchObject({ survey: { questions_selection: 'random' } });
    expect(new Set(detailPayload.questions.map((question: any) => question.id))).toEqual(new Set([
      'question-random-first', 'question-random-second', 'question-random-third',
    ]));

    const started = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'random-start-contract' }),
    });
    expect(started.status).toBe(200);
    const startedPayload = await started.json();
    const answerToken = startedPayload.answer.access_token as string;
    const order = String(startedPayload.answer.question_order).split('||');
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(new Set(['question-random-first', 'question-random-second', 'question-random-third']));
    expect(startedPayload.answer.current_question_id).toBe(order[0]);

    const foreign = await route(`/api/public/surveys/${token}/next_question`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: 'foreign-random-answer-2026', expected_question_id: order[0], navigation_key: 'foreign-random-nav' }),
    });
    expect(foreign.status).toBe(404);

    const next = await route(`/api/public/surveys/${token}/next_question`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, expected_question_id: order[0], navigation_key: 'random-nav-1' }),
    });
    expect(next.status).toBe(200);
    expect((await next.json()).question.id).toBe(order[1]);

    const previous = await route(`/api/public/surveys/${token}/previous_question`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, expected_question_id: order[1], navigation_key: 'random-nav-back-1' }),
    });
    expect(previous.status).toBe(200);
    expect((await previous.json()).question.id).toBe(order[0]);
    database.close();
  });

  test('preserves the randomized cursor across restart and replays concurrent navigation idempotently', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-random-selection-'));
    const databasePath = join(directory, 'surveys.duckdb');
    let answerToken = '';
    let order: string[] = [];
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_random_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const started = await firstRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'random-restart-start' }),
      });
      const startedPayload = await started.json();
      answerToken = startedPayload.answer.access_token;
      order = String(startedPayload.answer.question_order).split('||');
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_random_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const resumed = await reopenedRoute(`/api/public/surveys/${token}?answer_token=${answerToken}`);
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).answer).toMatchObject({ state: 'In Progress', question_order: order.join('||'), current_question_id: order[0] });

      const navigate = () => reopenedRoute(`/api/public/surveys/${token}/next_question`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, expected_question_id: order[0], navigation_key: 'random-concurrent-nav' }),
      });
      const navigations = await Promise.all([navigate(), navigate()]);
      expect(navigations.map((response) => response.status).sort()).toEqual([200, 200]);
      const payloads = await Promise.all(navigations.map((response) => response.json()));
      expect(payloads.every((payload) => payload.answer.current_question_id === order[1])).toBe(true);
      expect(await reopenedRepository.query(`SELECT current_question_id, question_order FROM survey_responses WHERE access_token = '${answerToken}'`)).toEqual([
        { current_question_id: order[1], question_order: order.join('||') },
      ]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
