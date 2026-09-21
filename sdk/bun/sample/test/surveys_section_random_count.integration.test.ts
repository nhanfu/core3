import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import SurveysModule from '../services/surveys/module';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const headers = { 'Content-Type': 'application/json' };

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

describe('Surveys Odoo section random question count', () => {
  test('joins the Odoo section random-count field through the survey-detail page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'LineItemGrid' && component.source === 'survey_questions');
    const action = api.actions.find((candidate: any) => candidate.id === 'configure_survey_section_random_count');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(grid.children).toContainEqual(expect.objectContaining({ id: 'random_questions_count', field: 'random_questions_count' }));
    expect(grid.children).toContainEqual(expect.objectContaining({
      type: 'LineItemActions',
      actions: [expect.objectContaining({ id: 'configure_survey_section_random_count', permission: 'surveys.write' })],
    }));
    expect(grid.columns).toContainEqual(expect.objectContaining({ field: 'random_questions_count', label: 'Random count' }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.sections.random_count.update',
      handler: 'yaml_mutation', operation: 'update',
    });
    expect(action.params).toEqual({
      id: '{row.id}', survey_id: '{row.survey_id}', expected_row_version: '{row.row_version}',
      expected_survey_row_version: '{row.survey_row_version}',
    });
    expect(action.fields.map((field: any) => field.field)).toEqual(['random_questions_count']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SECTION_RANDOM_NOT_FOUND',
      'SURVEY_SECTION_RANDOM_NOT_SECTION',
      'SURVEY_SECTION_RANDOM_PARENT_CHANGED',
      'SURVEY_SECTION_RANDOM_STALE',
      'SURVEY_SECTION_RANDOM_ACTOR_REQUIRED',
      'SURVEY_SECTION_RANDOM_COUNT_INVALID',
    ]);
    expect(yaml('migrations/20261030000000-068-survey-section-random-count.yaml').version).toBe('0.0.68');
  });

  test('updates a section count with actor, section, parent, stale, and range guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_section_random_count_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'configure_survey_section_random_count');
    const survey = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-section-random'"))[0].row_version;
    const section = (await repository.query("SELECT row_version FROM survey_questions WHERE id = 'section-random-products'"))[0].row_version;
    const input = {
      id: 'section-random-products', survey_id: 'survey-demo-section-random',
      expected_row_version: section, expected_survey_row_version: survey,
      random_questions_count: 1, current_user_id: 'user-admin',
    };

    await expect(repository.executeMutation(action.mutation, { ...input, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'SURVEY_SECTION_RANDOM_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'missing-section' }))
      .rejects.toMatchObject({ status: 404, code: 'SURVEY_SECTION_RANDOM_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...input, id: 'section-random-products-1' }))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SECTION_RANDOM_NOT_SECTION' });
    await expect(repository.executeMutation(action.mutation, { ...input, random_questions_count: -1 }))
      .rejects.toMatchObject({ status: 422, code: 'SURVEY_SECTION_RANDOM_COUNT_INVALID' });

    await repository.run("UPDATE surveys SET row_version = row_version + 1 WHERE id = 'survey-demo-section-random'");
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SECTION_RANDOM_PARENT_CHANGED' });
    await repository.run("UPDATE surveys SET row_version = ? WHERE id = 'survey-demo-section-random'", [survey]);

    const updated = await repository.executeMutation(action.mutation, input);
    expect(updated).toMatchObject({
      id: input.id, survey_id: input.survey_id, random_questions_count: 1,
      row_version: section + 1, survey_row_version: survey + 1,
    });
    expect(await repository.query("SELECT random_questions_count, row_version FROM survey_questions WHERE id = 'section-random-products'"))
      .toEqual([{ random_questions_count: 1, row_version: section + 1 }]);
    expect(await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-section-random'"))
      .toEqual([{ row_version: survey + 1 }]);
    await expect(repository.executeMutation(action.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_SECTION_RANDOM_PARENT_CHANGED' });
    database.close();
  });

  test('samples each section, persists the selected order, and replays it after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-section-random-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_section_random_public_restart', ['schema', 'data']);
      const firstRoute = routeFor(firstRepository);
      const detail = await firstRoute('/api/public/surveys/section-random-token-2026');
      expect(detail.status).toBe(200);
      const detailPayload = await detail.json();
      expect(detailPayload.questions).toHaveLength(3);
      expect(detailPayload.questions.filter((question: any) => question.page_id === 'section-random-products')).toHaveLength(2);
      expect(detailPayload.questions.filter((question: any) => question.page_id === 'section-random-support')).toHaveLength(1);

      const started = await firstRoute('/api/public/surveys/section-random-token-2026/start', {
        method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'section-random-start-001' }),
      });
      expect(started.status).toBe(200);
      const startedPayload = await started.json();
      const answerToken = startedPayload.answer.access_token as string;
      const order = String(startedPayload.answer.question_order).split('||');
      expect(order).toHaveLength(3);
      expect(order.every((id: string) => [
        'section-random-products-1', 'section-random-products-2', 'section-random-products-3',
        'section-random-support-1', 'section-random-support-2',
      ].includes(id))).toBe(true);
      expect(order.filter((id) => id.startsWith('section-random-products-'))).toHaveLength(2);
      expect(order.filter((id) => id.startsWith('section-random-support-'))).toHaveLength(1);
      const startedDetail = await firstRoute(`/api/public/surveys/section-random-token-2026?answer_token=${answerToken}`);
      expect(startedDetail.status).toBe(200);
      expect((await startedDetail.json()).questions.map((question: any) => question.id)).toEqual(order);
      const replay = await firstRoute('/api/public/surveys/section-random-token-2026/start', {
        method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'section-random-start-001' }),
      });
      expect((await replay.json()).answer.access_token).toBe(answerToken);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_section_random_public_restart', ['schema', 'data']);
      const reopenedRoute = routeFor(reopenedRepository);
      const resumed = await reopenedRoute(`/api/public/surveys/section-random-token-2026?answer_token=${answerToken}`);
      expect(resumed.status).toBe(200);
      expect((await resumed.json()).answer).toMatchObject({ question_order: order.join('||'), current_question_id: order[0] });
      expect(await reopenedRepository.query('SELECT question_order FROM survey_responses WHERE access_token = ?', [answerToken]))
        .toEqual([{ question_order: order.join('||') }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
