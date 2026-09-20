import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys live-session current-question results', () => {
  test('joins the results page and action to the live-session page by page.id', async () => {
    const page = yaml('pages/live-session.yaml');
    const api = yaml('api/live-session.yaml');
    const resultsPage = yaml('pages/live-session-results.yaml');
    const resultsApi = yaml('api/live-session-results.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const showResults = page.actions.find((action: any) => action.id === 'show_live_session_results');

    expect(resultsPage.page.id).toBe('survey-live-session-results');
    expect(resultsApi.page.id).toBe(resultsPage.page.id);
    expect(api.page.id).toBe('survey-live-session');
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'show_live_session_results', label: 'Show results', permission: 'surveys.manage' }));
    expect(showResults).toMatchObject({
      type: 'navigate', permission: 'surveys.manage', navigate_to: '/surveys/live-session-results',
      params: { survey_id: '{row.survey_id}', session_id: '{row.id}' },
    });
    expect(resultsApi.datasources.map((source: any) => source.id)).toEqual([
      'survey_live_session_results_header', 'survey_live_session_choice_results', 'survey_live_session_text_results',
    ]);
    expect(resultsApi.datasources.every((source: any) => source.permission === 'surveys.read')).toBe(true);
    expect(resultsApi.datasources.every((source: any) => String(source.query).includes(':session_id'))).toBe(true);
  });

  test('persists deterministic attendee answers and returns current-question statistics only while in progress', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_results_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_results_migrations', ['schema', 'data']);

    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_live_attendees WHERE session_id = 'live-session-feedback'"))
      .toEqual([{ count: 2 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_live_session_answers WHERE question_id = 'question-feedback-rating'"))
      .toEqual([{ count: 2 }]);

    const detailApi = yaml('api/survey-detail.yaml');
    const createSession = detailApi.actions.find((action: any) => action.id === 'start_live_session_detail');
    const liveApi = yaml('api/live-session.yaml');
    const start = liveApi.actions.find((action: any) => action.id === 'start_live_session_question');
    await repository.executeMutation(createSession.mutation, { id: 'survey-demo-feedback', expected_session_row_version: 1 });
    await repository.executeMutation(start.mutation, { id: 'live-session-feedback', expected_row_version: 2 });

    const resultsApi = yaml('api/live-session-results.yaml');
    const header = resultsApi.datasources[0];
    const choices = resultsApi.datasources[1];
    const text = resultsApi.datasources[2];
    const params = { survey_id: 'survey-demo-feedback', session_id: 'live-session-feedback', fixture_state: null };
    expect(await repository.querySource(header, params, 0, 1)).toMatchObject({ data: { question_text: 'How satisfied are you?', attendee_count: 2, answer_count: 2 } });
    expect((await repository.querySource(choices, params, 0, 50)).data).toEqual([
      { category: '4', responses: 1, points: 60 },
      { category: '5', responses: 1, points: 100 },
    ]);
    expect((await repository.querySource(text, params, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(choices, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(header, { ...params, fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'SURVEY_LIVE_SESSION_RESULTS_UNAVAILABLE' });

    await repository.run("UPDATE survey_live_sessions SET state = 'Closed' WHERE id = 'live-session-feedback'");
    expect((await repository.querySource(header, params, 0, 1)).data).toEqual({});
    database.close();
  });
});
