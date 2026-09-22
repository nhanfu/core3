import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo card See results action', () => {
  test('binds the card action to the authenticated results route', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const card = list.views.find((view: any) => view.id === 'card');
    const pageAction = page.actions.find((action: any) => action.id === 'open_survey_results_card');
    const resultsPage = yaml('pages/survey-results.yaml');
    const resultsApi = yaml('api/survey-results.yaml');

    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(api.page).toEqual({ id: 'surveys' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('surveys')).toContain('surveys');
    expect(card.card.actions).toContainEqual(expect.objectContaining({
      id: 'open_survey_results_card', label: 'See results', permission: 'surveys.read',
      show_if: "row.state !== 'Archived'",
    }));
    expect(pageAction).toMatchObject({
      id: 'open_survey_results_card',
      type: 'navigate',
      permission: 'surveys.read',
      navigate_to: '/surveys/results',
      params: { survey_id: '{row.id}' },
    });
    expect(resultsPage.page).toMatchObject({ id: 'survey-results', route: '/surveys/results' });
    expect(resultsPage.page.auth.require).toEqual(['surveys.read']);
    expect(resultsApi.page).toEqual({ id: 'survey-results' });
    expect(resultsApi.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining([
      'survey_results_header', 'survey_results_questions', 'survey_results_choices', 'survey_results_text',
    ]));
  });

  test('opens the seeded result cohort by stable survey ID and preserves filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_results', ['schema', 'data']);
    const resultsApi = yaml('api/survey-results.yaml');
    const header = resultsApi.datasources.find((source: any) => source.id === 'survey_results_header');
    const questions = resultsApi.datasources.find((source: any) => source.id === 'survey_results_questions');

    const all = await repository.querySource(header, {
      survey_id: 'survey-demo-feedback', completion_status: 'all', result_status: 'all',
    }, 0, 1);
    expect(all.data).toMatchObject({ id: 'survey-demo-feedback', response_count: 6, participant_count: 6 });

    const passed = await repository.querySource(header, {
      survey_id: 'survey-demo-feedback', completion_status: 'Completed', result_status: 'Passed',
    }, 0, 1);
    expect(passed.data).toMatchObject({ id: 'survey-demo-feedback', response_count: 1, participant_count: 1 });

    const questionRows = await repository.querySource(questions, {
      survey_id: 'survey-demo-feedback', completion_status: 'Completed', result_status: 'Passed', q: null,
    }, 0, 50);
    expect(questionRows.data.length).toBeGreaterThan(0);
    expect(questionRows.data.every((row: any) => Number(row.participants) === 1)).toBe(true);
    database.close();
  });
});
