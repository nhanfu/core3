import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo scoring settings', () => {
  test('joins the Options scoring contract through matching page/API YAML', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const action = api.actions.find((candidate: any) => candidate.id === 'update_survey_scoring');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const group = form.groups.find((candidate: any) => candidate.title === 'Time & Scoring');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('scoring_type');
    expect(detail.query).toContain('scoring_success_min');
    expect(group.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'scoring_type', label: 'Scoring' }),
      expect.objectContaining({ field: 'scoring_success_min', label: 'Required Score (%)' }),
    ]));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'update_survey_scoring', permission: 'surveys.write' }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.records.scoring.update',
      handler: 'yaml_mutation', operation: 'update',
    });
    expect(action.fields.find((field: any) => field.field === 'scoring_type').options).toHaveLength(4);
    expect(action.mutation.fields).toEqual(['scoring_type', 'scoring_success_min']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_SCORING_NOT_FOUND',
      'SURVEY_SCORING_STALE',
      'SURVEY_SCORING_ACTOR_REQUIRED',
      'SURVEY_SCORING_TYPE_INVALID',
      'SURVEY_SCORING_THRESHOLD_INVALID',
      'SURVEY_SCORING_CERTIFICATION_REQUIRED',
      'SURVEY_SCORING_ROAMING_CONFLICT',
    ]);
    expect(yaml('migrations/20261102000000-071-survey-scoring-settings.yaml').version).toBe('0.0.71');
  });

  test('persists scoring mode and threshold while enforcing Odoo guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_scoring_settings_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_scoring');
    const before = (await repository.query("SELECT row_version, scoring_type, scoring_success_min FROM surveys WHERE id = 'survey-demo-certification'"))[0];

    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-survey', expected_row_version: 1, current_user_id: 'user-admin',
      values: { scoring_type: 'scoring_with_answers', scoring_success_min: 80 },
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_SCORING_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: '',
      values: { scoring_type: 'scoring_with_answers', scoring_success_min: 80 },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_SCORING_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { scoring_type: 'unsupported', scoring_success_min: 80 },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_SCORING_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { scoring_type: 'scoring_with_answers', scoring_success_min: 101 },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_SCORING_THRESHOLD_INVALID' });

    const updated = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { scoring_type: 'scoring_without_answers', scoring_success_min: 75 },
    });
    expect(updated).toMatchObject({ id: 'survey-demo-certification', row_version: before.row_version + 1, scoring_type: 'scoring_without_answers', scoring_success_min: 75 });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { scoring_type: 'no_scoring', scoring_success_min: 75 },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_SCORING_STALE' });
    database.close();
  });

  test('retains scoring settings after restart and rejects certification or roaming conflicts', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-scoring-settings-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_scoring_settings_restart', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_scoring');
      await expect(firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-certification', expected_row_version: 1, current_user_id: 'user-admin',
        values: { scoring_type: 'no_scoring', scoring_success_min: 80 },
      })).rejects.toMatchObject({ status: 422, code: 'SURVEY_SCORING_CERTIFICATION_REQUIRED' });
      await firstRepository.run("UPDATE surveys SET users_can_go_back = false WHERE id = 'survey-demo-conditional'");
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-conditional', expected_row_version: 1, current_user_id: 'user-admin',
        values: { scoring_type: 'scoring_with_answers_after_page', scoring_success_min: 55 },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_scoring_settings_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT scoring_type, scoring_success_min, row_version FROM surveys WHERE id = 'survey-demo-conditional'"))
        .toEqual([{ scoring_type: 'scoring_with_answers_after_page', scoring_success_min: 55, row_version: 2 }]);
      await reopenedRepository.run("UPDATE surveys SET users_can_go_back = true WHERE id = 'survey-demo-conditional'");
      await expect(reopenedRepository.executeMutation(action.mutation, {
        id: 'survey-demo-conditional', expected_row_version: 2, current_user_id: 'user-admin',
        values: { scoring_type: 'scoring_with_answers_after_page', scoring_success_min: 55 },
      })).rejects.toMatchObject({ status: 422, code: 'SURVEY_SCORING_ROAMING_CONFLICT' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
