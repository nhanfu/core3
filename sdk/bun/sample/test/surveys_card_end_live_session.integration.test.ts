import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo card End Live Session action', () => {
  test('binds the card action to the page/API workflow and session projection', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const card = list.views.find((view: any) => view.id === 'card');
    const pageAction = card.card.actions.find((action: any) => action.id === 'end_live_session_card');
    const apiAction = api.actions.find((action: any) => action.id === 'end_live_session_card');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');
    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(api.page).toEqual({ id: 'surveys' });
    expect(card.card.actions).toContainEqual(expect.objectContaining({
      id: 'end_live_session_card', label: 'End Live Session', permission: 'surveys.manage',
      show_if: "row.session_state === 'Ready' || row.session_state === 'In Progress'",
    }));
    expect(pageAction).toMatchObject({
      id: 'end_live_session_card', label: 'End Live Session', permission: 'surveys.manage',
    });
    expect(apiAction).toMatchObject({
      id: 'end_live_session_card', type: 'server', permission: 'surveys.manage',
      action: 'surveys.sessions.end_from_card', handler: 'yaml_mutation', workflow: 'surveys',
    });
    expect(String(source.query)).toContain('session_id');
    expect(String(source.query)).toContain('session_row_version');
    expect(apiAction.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_CARD_SESSION_ACTOR_REQUIRED',
      'SURVEY_CARD_SESSION_NOT_ACTIVE',
    ]);
  });

  test('closes a ready session with actor and optimistic-version guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_end_live_session', ['schema', 'data']);
    const api = yaml('api/surveys.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');
    const start = api.actions.find((candidate: any) => candidate.id === 'start_live_session_card');
    const end = api.actions.find((candidate: any) => candidate.id === 'end_live_session_card');
    const initial = (await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50))
      .data.find((row: any) => row.id === 'survey-demo-feedback');

    await repository.executeMutation(start.mutation, {
      id: initial.id, expected_session_row_version: initial.session_row_version, current_user_id: 'user-admin',
    });
    const ready = (await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50))
      .data.find((row: any) => row.id === 'survey-demo-feedback');
    expect(ready).toMatchObject({ session_id: 'live-session-feedback', session_row_version: 2, session_state: 'Ready' });

    await expect(repository.executeMutation(end.mutation, {
      id: ready.session_id, expected_row_version: ready.session_row_version,
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_CARD_SESSION_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(end.mutation, {
      id: ready.session_id, expected_row_version: 99, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CARD_SESSION_NOT_ACTIVE' });

    const closed = await repository.executeMutation(end.mutation, {
      id: ready.session_id, expected_row_version: ready.session_row_version, current_user_id: 'user-admin',
    });
    expect(closed).toMatchObject({ message: 'Live session closed', state: 'Closed', session_code: '5822' });
    expect(await repository.query('SELECT state, current_question_id, current_question_text, row_version FROM survey_live_sessions WHERE id = ?', [ready.session_id]))
      .toEqual([{ state: 'Closed', current_question_id: null, current_question_text: null, row_version: 3 }]);
    expect(await repository.query('SELECT state FROM survey_live_attendees WHERE session_id = ? ORDER BY id', [ready.session_id]))
      .toEqual([{ state: 'Completed' }, { state: 'Completed' }]);
    await expect(repository.executeMutation(end.mutation, {
      id: ready.session_id, expected_row_version: ready.session_row_version, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CARD_SESSION_NOT_ACTIVE' });
    database.close();
  });

  test('keeps the closed session and version after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-card-end-live-session-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_card_end_live_session_restart', ['schema', 'data']);
      const api = yaml('api/surveys.yaml');
      const start = api.actions.find((candidate: any) => candidate.id === 'start_live_session_card');
      const end = api.actions.find((candidate: any) => candidate.id === 'end_live_session_card');
      await firstRepository.executeMutation(start.mutation, {
        id: 'survey-demo-feedback', expected_session_row_version: 1, current_user_id: 'user-admin',
      });
      await firstRepository.executeMutation(end.mutation, {
        id: 'live-session-feedback', expected_row_version: 2, current_user_id: 'user-admin',
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_card_end_live_session_restart', ['schema', 'data']);
      expect(await reopenedRepository.query('SELECT state, row_version FROM survey_live_sessions WHERE id = ?', ['live-session-feedback']))
        .toEqual([{ state: 'Closed', row_version: 3 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
