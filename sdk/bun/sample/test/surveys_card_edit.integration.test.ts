import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo card Edit Survey action', () => {
  test('joins the kanban/card Edit Survey action to the durable survey detail page', async () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const edit = page.actions.find((action: any) => action.id === 'edit_survey');
    const surveySource = api.datasources.find((source: any) => source.id === 'surveys');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(api.page).toEqual({ id: 'surveys' });
    expect(discovered.pageDatasources.get('surveys')).toContain('surveys');
    expect(list).toMatchObject({ row_actions: 'menu', row_double_click_action: 'view_survey_detail' });
    expect(list.actions).toContainEqual(expect.objectContaining({
      id: 'edit_survey', label: 'Edit Survey', permission: 'surveys.write',
    }));
    expect(edit).toEqual({
      id: 'edit_survey', type: 'navigate', permission: 'surveys.write',
      navigate_to: '/surveys/detail', params: { id: '{row.id}' },
    });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_edit_action', ['schema', 'data']);
    const result = await repository.querySource(surveySource, { q: 'Feedback Form', state: null }, 0, 50);
    expect(result.data).toContainEqual(expect.objectContaining({
      id: 'survey-demo-feedback', title: 'Feedback Form', row_version: expect.anything(),
    }));
    database.close();
  });
});
