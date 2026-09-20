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
const surveyToken = 'background-public-token-2026';

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

describe('Surveys public background image parity', () => {
  test('keeps Odoo background behavior in the paired YAML/API contract and renderer', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(root, '../../public/components/PublicSurvey.ts'), 'utf8');
    const background = api.actions.find((action: any) => action.id === 'public_survey_background');
    expect(page.page.id).toBe('surveys');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(background).toMatchObject({ type: 'server_form', permission: 'surveys.public', action: 'surveys.public.background', handler: 'public_asset' });
    expect(operations['survey.public.detail'].query).toContain('background_image_url');
    expect(operations['survey.public.background'].query).toContain("state = 'Published'");
    expect(operations['survey.public.background'].query).toContain('background_image_content');
    expect(renderer).toContain('background_image_url');
    expect(renderer).toContain('background-image:url');
    expect(yaml('migrations/20260930000000-033-survey-public-background.yaml').version).toBe('0.0.33');
    expect(yaml('migrations/20261001000000-034-survey-public-background-content.yaml').version).toBe('0.0.34');
  });

  test('serves a durable token-scoped asset across restart and rejects foreign methods/tokens', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-public-background-'));
    const databasePath = join(directory, 'background.duckdb');
    const migrationTable = 'surveys_public_background_restart';
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const route = routeFor(repository);

    const landing = await route(`/api/public/surveys/${surveyToken}`);
    expect(landing.status).toBe(200);
    expect(await landing.json()).toMatchObject({
      survey: {
        id: 'survey-demo-background',
        title: 'Brand Survey',
        background_image_url: `/api/public/surveys/${surveyToken}/background`,
      },
    });

    const asset = await route(`/api/public/surveys/${surveyToken}/background`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('image/svg+xml');
    const assetBody = await asset.text();
    expect(assetBody).toContain('survey-background');

    const replay = await route(`/api/public/surveys/${surveyToken}/background`);
    expect(await replay.text()).toBe(assetBody);
    expect((await route(`/api/public/surveys/${surveyToken}/background`, { method: 'POST' })).status).toBe(405);
    expect((await route('/api/public/surveys/short/background')).status).toBe(400);
    expect((await route('/api/public/surveys/identity-public-token-2026/background')).status).toBe(404);

    database.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    const reopenedRoute = routeFor(reopenedRepository);
    const restored = await reopenedRoute(`/api/public/surveys/${surveyToken}`);
    expect(restored.status).toBe(200);
    expect((await restored.json()).survey.background_image_url).toBe(`/api/public/surveys/${surveyToken}/background`);
    const restoredAsset = await reopenedRoute(`/api/public/surveys/${surveyToken}/background`);
    expect(restoredAsset.status).toBe(200);
    expect(await restoredAsset.text()).toBe(assetBody);
    reopenedDatabase.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
