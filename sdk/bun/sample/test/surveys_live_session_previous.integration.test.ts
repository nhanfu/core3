import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys live-session previous-question workflow', () => {
  test('binds Odoo go_back behavior to the authenticated manager page/API contract', () => {
    const api = yaml('api/live-session.yaml');
    const page = yaml('pages/live-session.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'previous_live_session_question');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(api.page).toEqual({ id: 'survey-live-session' });
    expect(page.page.id).toBe('survey-live-session');
    expect(action).toMatchObject({
      type: 'server', permission: 'surveys.manage', action: 'surveys.sessions.previous_question', handler: 'yaml_mutation',
      params: { expected_row_version: '{row.row_version}' },
    });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_LIVE_SESSION_NOT_IN_PROGRESS', 'SURVEY_LIVE_SESSION_STALE', 'SURVEY_LIVE_SESSION_NO_PREVIOUS_QUESTION',
    ]);
    expect(action.mutation.steps[0].query).toContain('ORDER BY previous_question.sequence DESC, previous_question.id DESC');
    expect(form.header_actions).toContainEqual(expect.objectContaining({
      id: 'previous_live_session_question', label: 'Previous', permission: 'surveys.manage',
    }));
  });

  test('moves the durable cursor backward, protects permissions/state, and rejects a stale replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_live_session_previous_guards', ['schema', 'data']);
    const api = yaml('api/live-session.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'previous_live_session_question');

    await repository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-comment', current_question_text = 'Tell us more', row_version = 4 WHERE id = 'live-session-feedback'");
    const moved = await repository.executeMutation(action.mutation, { id: 'live-session-feedback', expected_row_version: 4 });
    expect(moved).toMatchObject({ message: 'Previous question started', state: 'In Progress', current_question_id: 'question-feedback-rating', current_question_sequence: 1 });
    expect(await repository.query("SELECT current_question_id, current_question_text, question_started_at, row_version FROM survey_live_sessions WHERE id = 'live-session-feedback'"))
      .toEqual([{ current_question_id: 'question-feedback-rating', current_question_text: 'How satisfied are you?', question_started_at: '2026-01-15T10:15:00.000Z', row_version: 5 }]);

    await expect(repository.executeMutation(action.mutation, { id: 'live-session-feedback', expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_STALE' });
    expect(await repository.query("SELECT current_question_id, row_version FROM survey_live_sessions WHERE id = 'live-session-feedback'"))
      .toEqual([{ current_question_id: 'question-feedback-rating', row_version: 5 }]);

    await repository.run("UPDATE survey_live_sessions SET state = 'Closed' WHERE id = 'live-session-feedback'");
    await expect(repository.executeMutation(action.mutation, { id: 'live-session-feedback', expected_row_version: 5 }))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NOT_IN_PROGRESS' });
    database.close();
  });

  test('retains the host cursor across a file-backed restart and rejects the first-question boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-live-session-previous-'));
    const databasePath = join(directory, 'surveys.duckdb');
    const migrationTable = 'surveys_live_session_previous_restart';
    const action = yaml('api/live-session.yaml').actions.find((candidate: any) => candidate.id === 'previous_live_session_question');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    await firstRepository.run("UPDATE survey_live_sessions SET state = 'In Progress', current_question_id = 'question-feedback-comment', current_question_text = 'Tell us more', row_version = 6 WHERE id = 'live-session-feedback'");
    await firstRepository.executeMutation(action.mutation, { id: 'live-session-feedback', expected_row_version: 6 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
    expect(await secondRepository.query("SELECT current_question_id, row_version FROM survey_live_sessions WHERE id = 'live-session-feedback'"))
      .toEqual([{ current_question_id: 'question-feedback-rating', row_version: 7 }]);
    await expect(secondRepository.executeMutation(action.mutation, { id: 'live-session-feedback', expected_row_version: 7 }))
      .rejects.toMatchObject({ status: 409, code: 'SURVEY_LIVE_SESSION_NO_PREVIOUS_QUESTION' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
