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

describe('Surveys Odoo card Start Live Session action', () => {
  test('binds the card action to the page/API workflow and durable session projection', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const card = list.views.find((view: any) => view.id === 'card');
    const pageAction = card.card.actions.find((action: any) => action.id === 'start_live_session_card');
    const apiAction = api.actions.find((action: any) => action.id === 'start_live_session_card');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(api.page).toEqual({ id: 'surveys' });
    expect(discovered.pageDatasources.get('surveys')).toContain('surveys');
    expect(card.card.actions).toContainEqual(expect.objectContaining({
      id: 'start_live_session_card', label: 'Start Live Session', permission: 'surveys.manage',
    }));
    expect(pageAction).toMatchObject({
      id: 'start_live_session_card', label: 'Start Live Session', permission: 'surveys.manage',
    });
    expect(apiAction).toMatchObject({
      id: 'start_live_session_card', type: 'server', permission: 'surveys.manage',
      action: 'surveys.sessions.start', handler: 'yaml_mutation', workflow: 'surveys',
    });
    expect(String(source.query)).toContain('session_row_version');
    expect(String(source.query)).toContain('session_state');
    expect(String(source.query)).toContain('LEFT JOIN survey_live_sessions');
    expect(apiAction.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_CARD_SESSION_ACTOR_REQUIRED',
      'SURVEY_CARD_SESSION_NOT_STARTABLE',
      'SURVEY_CARD_SESSION_CHANGED',
    ]);
  });

  test('starts a ready session with actor, question, state, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_live_session', ['schema', 'data']);
    const api = yaml('api/surveys.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');
    const action = api.actions.find((candidate: any) => candidate.id === 'start_live_session_card');
    const initial = (await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50))
      .data.find((row: any) => row.id === 'survey-demo-feedback');

    expect(initial).toMatchObject({ question_count: 7, session_row_version: 1, session_state: null });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_session_row_version: initial.session_row_version,
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_CARD_SESSION_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-card-survey', expected_session_row_version: 1, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CARD_SESSION_NOT_STARTABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_session_row_version: 99, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CARD_SESSION_CHANGED' });

    const started = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_session_row_version: initial.session_row_version, current_user_id: 'user-admin',
    });
    expect(started).toMatchObject({ message: 'Live session ready', state: 'Ready', session_code: '5822' });
    expect(await repository.query('SELECT state, row_version, session_start_time FROM survey_live_sessions WHERE survey_id = ?', ['survey-demo-feedback']))
      .toMatchObject([{ state: 'Ready', row_version: 2 }]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_session_row_version: initial.session_row_version, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CARD_SESSION_CHANGED' });
    database.close();
  });

  test('keeps the card session state and optimistic version after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-card-live-session-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_card_live_session_restart', ['schema', 'data']);
      const action = yaml('api/surveys.yaml').actions.find((candidate: any) => candidate.id === 'start_live_session_card');
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', expected_session_row_version: 1, current_user_id: 'user-admin',
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_card_live_session_restart', ['schema', 'data']);
      expect(await reopenedRepository.query('SELECT state, row_version FROM survey_live_sessions WHERE survey_id = ?', ['survey-demo-feedback']))
        .toEqual([{ state: 'Ready', row_version: 2 }]);
      const source = yaml('api/surveys.yaml').datasources.find((candidate: any) => candidate.id === 'surveys');
      const rows = await reopenedRepository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50);
      expect(rows.data.find((row: any) => row.id === 'survey-demo-feedback')).toMatchObject({ session_state: 'Ready', session_row_version: 2 });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
