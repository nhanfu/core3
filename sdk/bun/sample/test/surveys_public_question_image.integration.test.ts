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
const surveyToken = 'image-public-token-2026';
const questionId = 'question-image-service';
const imageAnswerId = 'answer-question-image-excellent';

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

describe('Surveys public suggested-answer images', () => {
  test('keeps the Odoo image helper in the paired API contract and renderer', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    const imageAction = api.actions.find((action: any) => action.id === 'public_survey_question_image');
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(imageAction).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.question_image', handler: 'public_asset' });
    expect(operations['survey.public.questions'].query).toContain('image_answers');
    expect(operations['survey.public.question_image'].query).toContain('r.access_token = :answer_token');
    expect(renderer).toContain('questionImageUrl');
    expect(renderer).toContain('core3-public-survey__option-image');
    expect(yaml('migrations/20261002000000-035-survey-public-question-images.yaml').version).toBe('0.0.35');
  });

  test('serves only the matching durable image after start and across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-question-image-'));
    const databasePath = join(directory, 'question-image.duckdb');
    const migrationTable = 'surveys_public_question_image_restart';
    const headers = { 'Content-Type': 'application/json' };
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    const landingPayload = await landing.json();
    expect(landingPayload.questions.some((question: any) => question.id === questionId && question.image_answers === `${imageAnswerId}::Excellent`)).toBe(true);

    const started = await route(`/api/public/surveys/${surveyToken}/start`, { method: 'POST', headers, body: JSON.stringify({ idempotency_key: 'question-image-start-001' }) });
    expect(started.status).toBe(200);
    const answerToken = (await started.json()).answer.access_token;
    const imagePath = `/api/public/surveys/${surveyToken}/question-image/${answerToken}/${questionId}/${imageAnswerId}`;
    const image = await route(imagePath);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toContain('image/svg+xml');
    const imageBody = await image.text();
    expect(imageBody).toContain('Excellent service');
    expect((await route(`${imagePath}?cache=replay`)).status).toBe(200);
    expect((await route(`${imagePath}?cache=replay`)).text()).resolves.toBe(imageBody);
    expect((await route(`/api/public/surveys/${surveyToken}/question-image/${answerToken}/${questionId}/answer-feedback-rating`)).status).toBe(404);
    expect((await route(`/api/public/surveys/${surveyToken}/question-image/00000000-0000-0000-0000-000000000000/${questionId}/${imageAnswerId}`)).status).toBe(404);
    expect((await route(`${imagePath}`, { method: 'POST' })).status).toBe(405);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(imagePath);
    expect(restored.status).toBe(200);
    expect(await restored.text()).toBe(imageBody);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
