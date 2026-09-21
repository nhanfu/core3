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

const token = 'skipped-question-token-2026';
const headers = { 'Content-Type': 'application/json' };

describe('Surveys public skipped optional questions', () => {
  test('keeps skipped state in the page/API pair and rejects required-question bypass', async () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const progress = api.actions.find((action: any) => action.id === 'public_survey_progress');
    const responseOperation = yaml('operations.yaml').operations['survey.public.response'];
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicSurvey.ts'), 'utf8');

    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(progress.permission).toBe('surveys.public');
    expect(progress.mutation.fields).toContain('skipped_questions');
    expect(progress.mutation.result.query).toContain('skipped_questions');
    expect(responseOperation.query).toContain('skipped_questions');
    expect(renderer).toContain('skippedQuestions');
    expect(renderer).toContain('skipped_questions');
    expect(yaml('migrations/20261015000000-048-survey-public-skipped-question.yaml').version).toBe('0.0.48');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_public_skipped_contract', ['schema', 'data']);
    const route = routeFor(repository);
    const started = await route(`/api/public/surveys/${token}/start`, {
      method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'skipped-contract-start' }),
    });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token as string;

    const invalid = await route(`/api/public/surveys/${token}/progress`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: answerToken, answers: {}, skipped_questions: ['question-skipped-required-first'] }),
    });
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).code).toBe('SURVEY_PUBLIC_SKIP_INVALID');
    expect(await repository.query(`SELECT skipped_questions FROM survey_responses WHERE access_token = '${answerToken}'`)).toEqual([{ skipped_questions: null }]);

    const foreign = await route(`/api/public/surveys/${token}/progress`, {
      method: 'POST', headers,
      body: JSON.stringify({ answer_token: 'foreign-skipped-answer-2026', answers: {}, skipped_questions: ['question-skipped-optional'] }),
    });
    expect(foreign.status).toBe(404);
    database.close();
  });

  test('persists an optional skip across restart and converges concurrent idempotent submit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-skipped-question-'));
    const databasePath = join(directory, 'surveys.duckdb');
    let answerToken = '';
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_public_skipped_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const started = await firstRoute(`/api/public/surveys/${token}/start`, {
        method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'skipped-restart-start' }),
      });
      const startedPayload = await started.json();
      answerToken = startedPayload.answer.access_token;
      await firstRoute(`/api/public/surveys/${token}/progress`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, answers: { 'question-skipped-required-first': 'Basic' } }),
      });
      await firstRoute(`/api/public/surveys/${token}/next_question`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, expected_question_id: 'question-skipped-required-first', navigation_key: 'skipped-next-1' }),
      });
      const skipped = await firstRoute(`/api/public/surveys/${token}/progress`, {
        method: 'POST', headers,
        body: JSON.stringify({ answer_token: answerToken, answers: { 'question-skipped-required-first': 'Basic' }, skipped_questions: ['question-skipped-optional'] }),
      });
      expect(skipped.status).toBe(200);
      expect((await skipped.json()).answer.skipped_questions).toBe('question-skipped-optional');
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_public_skipped_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const resumed = await reopenedRoute(`/api/public/surveys/${token}?answer_token=${answerToken}`);
      expect((await resumed.json()).answer).toMatchObject({ state: 'In Progress', skipped_questions: 'question-skipped-optional' });

      const submit = () => reopenedRoute(`/api/public/surveys/${token}/submit`, {
        method: 'POST', headers,
        body: JSON.stringify({
          answer_token: answerToken,
          answers: { 'question-skipped-required-first': 'Basic', 'question-skipped-required-last': 'Yes' },
          skipped_questions: ['question-skipped-optional'],
          idempotency_key: 'skipped-submit-1',
        }),
      });
      const submitted = await Promise.all([submit(), submit()]);
      expect(submitted.map((response) => response.status).sort()).toEqual([200, 200]);
      expect((await submitted[0].json()).answer.state).toBe('Submitted');
      expect(await reopenedRepository.query(`SELECT state, skipped_questions FROM survey_responses WHERE access_token = '${answerToken}'`)).toEqual([
        { state: 'Submitted', skipped_questions: 'question-skipped-optional' },
      ]);
      expect(await reopenedRepository.query(`SELECT response_count FROM surveys WHERE id = 'survey-demo-skipped-question'`)).toEqual([{ response_count: 1 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
