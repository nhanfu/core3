import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo card Color action', () => {
  test('binds the Color menu to the page/API contract and durable color field', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const pageAction = list.actions.find((action: any) => action.id === 'set_survey_card_color');
    const apiAction = api.actions.find((action: any) => action.id === 'set_survey_card_color');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(api.page).toEqual({ id: 'surveys' });
    expect(discovered.pageDatasources.get('surveys')).toContain('surveys');
    expect(list.row_actions).toBe('menu');
    expect(pageAction).toMatchObject({ id: 'set_survey_card_color', label: 'Color', icon: 'palette', permission: 'surveys.write' });
    expect(apiAction).toMatchObject({
      id: 'set_survey_card_color', type: 'server_form', permission: 'surveys.write',
      action: 'surveys.records.color.update', handler: 'yaml_mutation', operation: 'update',
    });
    expect(apiAction.fields).toContainEqual(expect.objectContaining({ field: 'color', type: 'color', palette: 'odoo' }));
    expect(String(source.query)).toContain('COALESCE(s.color, 0) AS color');
  });

  test('persists an Odoo palette index with actor, range, archive, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_color', ['schema', 'data']);
    const action = yaml('api/surveys.yaml').actions.find((candidate: any) => candidate.id === 'set_survey_card_color');
    const surveyId = 'survey-demo-certification';
    const initial = (await repository.query('SELECT color, row_version FROM surveys WHERE id = ?', [surveyId]))[0];

    const result = await repository.executeMutation(action.mutation, {
      id: surveyId, expected_row_version: initial.row_version, current_user_id: 'user-admin', values: { color: 7 },
    });
    expect(result).toMatchObject({ id: surveyId, color: 7, row_version: initial.row_version + 1 });
    expect(await repository.query('SELECT color, row_version FROM surveys WHERE id = ?', [surveyId]))
      .toEqual([{ color: 7, row_version: initial.row_version + 1 }]);

    await expect(repository.executeMutation(action.mutation, {
      id: surveyId, expected_row_version: initial.row_version + 1, current_user_id: 'user-admin', values: { color: 12 },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_COLOR_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: surveyId, expected_row_version: initial.row_version, current_user_id: 'user-admin', values: { color: 3 },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_COLOR_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      id: surveyId, expected_row_version: initial.row_version + 1, values: { color: 3 },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_COLOR_ACTOR_REQUIRED' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = ?", [surveyId]);
    await expect(repository.executeMutation(action.mutation, {
      id: surveyId, expected_row_version: initial.row_version + 1, current_user_id: 'user-admin', values: { color: 3 },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_COLOR_ARCHIVED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-color-missing', expected_row_version: 1, current_user_id: 'user-admin', values: { color: 3 },
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_COLOR_NOT_FOUND' });
    database.close();
  });

  test('keeps the selected color and row version after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-card-color-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_card_color_restart', ['schema', 'data']);
      const action = yaml('api/surveys.yaml').actions.find((candidate: any) => candidate.id === 'set_survey_card_color');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0];
      const input = { id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin', values: { color: 4 } };
      await firstRepository.executeMutation(action.mutation, input);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_card_color_restart', ['schema', 'data']);
      expect(await reopenedRepository.query('SELECT color, row_version FROM surveys WHERE id = ?', [input.id]))
        .toEqual([{ color: 4, row_version: before.row_version + 1 }]);
      const source = yaml('api/surveys.yaml').datasources.find((candidate: any) => candidate.id === 'surveys');
      const rows = await reopenedRepository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50);
      expect(rows.data.find((row: any) => row.id === input.id)).toMatchObject({ color: 4, row_version: before.row_version + 1 });
      await expect(reopenedRepository.executeMutation(action.mutation, { ...input, expected_row_version: before.row_version }))
        .rejects.toMatchObject({ status: 409, code: 'SURVEY_COLOR_STALE' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
