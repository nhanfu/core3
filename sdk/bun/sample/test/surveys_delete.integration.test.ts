import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Delete action parity slice', () => {
  test('keeps the Delete menu action in the existing survey-detail page/API join', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const menuDelete = form.action_menu.actions.find((action: any) => action.id === 'delete_survey_detail');
    const pageDelete = page.actions.find((action: any) => action.id === 'delete_survey_detail');
    const apiDelete = api.actions.find((action: any) => action.id === 'delete_survey');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('survey-detail')).toContain('survey_detail');
    expect(menuDelete).toMatchObject({ id: 'delete_survey_detail', label: 'Delete', icon: 'trash', variant: 'danger', permission: 'surveys.write' });
    expect(pageDelete).toMatchObject({ type: 'client', permission: 'surveys.write' });
    expect(pageDelete.script).toContain('window.confirm');
    expect(pageDelete.script).toContain('/api/actions/surveys.records.delete');
    expect(pageDelete.script).toContain("app.navigate('/surveys')");
    expect(apiDelete).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.records.delete', handler: 'yaml_mutation', operation: 'delete' });
    expect(apiDelete.mutation).toMatchObject({ operation: 'delete', table: 'surveys', concurrency: { required: true } });
    expect(detail.error_states).toMatchObject({
      unauthorized: { status: 401 },
      forbidden: { status: 403 },
      missing_record: { status: 404 },
      transport_error: { status: 503 },
    });
  });

  test('deletes the deterministic survey graph and exposes an empty list state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_delete_graph', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_delete_graph', ['schema', 'data']);

    const migration = yaml('migrations/20260911110000-012-survey-delete-candidate.yaml');
    expect(migration.version).toBe('0.0.13');
    expect(await repository.query('SELECT id, title, state, row_version FROM surveys WHERE id = ?', ['survey-delete-candidate'])).toEqual([
      { id: 'survey-delete-candidate', title: 'Delete Candidate Survey', state: 'Draft', row_version: 1 },
    ]);
    await repository.run("INSERT INTO survey_participants(id, survey_id, survey_name, contact, email, state) VALUES ('participant-delete-candidate', 'survey-delete-candidate', 'Delete Candidate Survey', 'Delete QA', 'delete@example.com', 'Completed')");
    await repository.run("INSERT INTO survey_detailed_answers(id, participant_id, survey_name, question_text, answer_type, answer_value) VALUES ('detail-delete-candidate', 'participant-delete-candidate', 'Delete Candidate Survey', 'Would you delete this survey?', 'choice', 'Yes')");
    await repository.run("INSERT INTO survey_responses(id, survey_id, survey_name, answer_data, state) VALUES ('response-delete-candidate', 'survey-delete-candidate', 'Delete Candidate Survey', '{\"q\":\"Yes\"}', 'Submitted')");
    await repository.run("INSERT INTO survey_invites(id, survey_id, survey_name, survey_link) VALUES ('invite-delete-candidate', 'survey-delete-candidate', 'Delete Candidate Survey', '/survey/start/delete-candidate-token-2026')");
    await repository.run("INSERT INTO survey_live_sessions(id, survey_id, survey_name, state, session_code, session_link) VALUES ('live-delete-candidate', 'survey-delete-candidate', 'Delete Candidate Survey', 'Closed', '9090', '/s/9090')");

    const remove = yaml('api/survey-detail.yaml').actions.find((action: any) => action.id === 'delete_survey').mutation;
    await repository.executeMutation(remove, { id: 'survey-delete-candidate', expected_row_version: 1 });
    for (const [table, column, value] of [
      ['surveys', 'id', 'survey-delete-candidate'],
      ['survey_questions', 'survey_id', 'survey-delete-candidate'],
      ['survey_suggested_values', 'question_id', 'question-delete-candidate-1'],
      ['survey_participants', 'survey_id', 'survey-delete-candidate'],
      ['survey_detailed_answers', 'participant_id', 'participant-delete-candidate'],
      ['survey_responses', 'survey_id', 'survey-delete-candidate'],
      ['survey_invites', 'survey_id', 'survey-delete-candidate'],
      ['survey_live_sessions', 'survey_id', 'survey-delete-candidate'],
    ]) {
      const rows = await repository.query(`SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`, [value]);
      expect(Number(rows[0].count)).toBe(0);
    }
    const list = yaml('api/surveys.yaml').datasources.find((source: any) => source.id === 'surveys');
    expect((await repository.querySource(list, { q: 'Delete Candidate Survey', state: null }, 0, 50)).data).toEqual([]);

    await expect(repository.executeMutation(remove, { id: 'missing-survey', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'SURVEY_DELETE_NOT_FOUND' });
    await repository.run("INSERT INTO surveys(id, name, title, owner, state, row_version) VALUES ('survey-delete-stale', 'SURVEY/DELETE-STALE', 'Delete Stale Survey', 'Mitchell Admin', 'Draft', 1)");
    await repository.run("UPDATE surveys SET row_version = 2 WHERE id = 'survey-delete-stale'");
    await expect(repository.executeMutation(remove, { id: 'survey-delete-stale', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_DELETE_STALE' });
    expect(await repository.query('SELECT id, row_version FROM surveys WHERE id = ?', ['survey-delete-stale'])).toEqual([{ id: 'survey-delete-stale', row_version: 2 }]);
    database.close();
  });
});
