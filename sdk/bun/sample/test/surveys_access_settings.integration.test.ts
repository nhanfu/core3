import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo access and attempts settings', () => {
  test('joins the Participants Options contract through matching page/API YAML', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const action = api.actions.find((candidate: any) => candidate.id === 'update_survey_access');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const group = form.groups.find((candidate: any) => candidate.title === 'Participants');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('access_mode');
    expect(detail.query).toContain('users_login_required');
    expect(detail.query).toContain('attempts_limit');
    expect(group.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'access_mode', label: 'Access mode' }),
      expect.objectContaining({ field: 'users_login_required', label: 'Require login' }),
      expect.objectContaining({ field: 'is_attempts_limited', label: 'Limit attempts' }),
      expect.objectContaining({ field: 'attempts_limit', label: 'Attempts allowed' }),
      expect.objectContaining({ field: 'users_can_go_back', label: 'Allow going back' }),
    ]));
    expect(form.header_actions).toContainEqual(expect.objectContaining({
      id: 'update_survey_access', label: 'Access settings', permission: 'surveys.write',
    }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.records.access.update',
      handler: 'yaml_mutation', operation: 'update',
    });
    expect(action.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'access_mode', label: 'Access Mode', type: 'select' }),
      expect.objectContaining({ field: 'users_login_required', label: 'Require Login', type: 'checkbox' }),
      expect.objectContaining({ field: 'is_attempts_limited', label: 'Limit Attempts', type: 'checkbox' }),
      expect.objectContaining({ field: 'attempts_limit', label: 'Number of attempts', type: 'number' }),
      expect.objectContaining({ field: 'users_can_go_back', label: 'Allow Roaming', type: 'checkbox' }),
    ]));
    expect(action.mutation.fields).toEqual(['access_mode', 'users_login_required', 'is_attempts_limited', 'attempts_limit', 'users_can_go_back']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_ACCESS_NOT_FOUND',
      'SURVEY_ACCESS_STALE',
      'SURVEY_ACCESS_ACTOR_REQUIRED',
      'SURVEY_ACCESS_MODE_INVALID',
      'SURVEY_ACCESS_ATTEMPTS_INVALID',
      'SURVEY_ACCESS_ATTEMPTS_REQUIRES_IDENTITY',
      'SURVEY_ACCESS_ROAMING_CONFLICT',
    ]);
  });

  test('persists access, login, attempts, and roaming settings with Odoo guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_access_settings_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_access');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0];

    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-survey', expected_row_version: 1, current_user_id: 'user-admin',
      values: { access_mode: 'public', users_login_required: false, is_attempts_limited: false, attempts_limit: 1, users_can_go_back: false },
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_ACCESS_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: '',
      values: { access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 2, users_can_go_back: true },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_ACCESS_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { access_mode: 'unsupported', users_login_required: true, is_attempts_limited: true, attempts_limit: 2, users_can_go_back: true },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_ACCESS_MODE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 0, users_can_go_back: true },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_ACCESS_ATTEMPTS_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { access_mode: 'public', users_login_required: false, is_attempts_limited: true, attempts_limit: 2, users_can_go_back: true },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_ACCESS_ATTEMPTS_REQUIRES_IDENTITY' });

    const updated = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 2, users_can_go_back: true },
    });
    expect(updated).toMatchObject({ id: 'survey-demo-feedback', row_version: before.row_version + 1, access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 2, users_can_go_back: true });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { access_mode: 'public', users_login_required: false, is_attempts_limited: false, attempts_limit: 1, users_can_go_back: false },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_ACCESS_STALE' });
    database.close();
  });

  test('survives reopen and rejects roaming with scoring after each page', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-access-settings-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_access_settings_restart', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_access');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0];
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
        values: { access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 3, users_can_go_back: true },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_access_settings_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT access_mode, users_login_required, is_attempts_limited, attempts_limit, users_can_go_back, row_version FROM surveys WHERE id = 'survey-demo-feedback'"))
        .toEqual([{ access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 3, users_can_go_back: true, row_version: before.row_version + 1 }]);
      await reopenedRepository.run("UPDATE surveys SET scoring_type = 'scoring_with_answers_after_page' WHERE id = 'survey-demo-feedback'");
      const current = (await reopenedRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-feedback'"))[0];
      await expect(reopenedRepository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', expected_row_version: current.row_version, current_user_id: 'user-admin',
        values: { access_mode: 'token', users_login_required: true, is_attempts_limited: true, attempts_limit: 3, users_can_go_back: true },
      })).rejects.toMatchObject({ status: 422, code: 'SURVEY_ACCESS_ROAMING_CONFLICT' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
