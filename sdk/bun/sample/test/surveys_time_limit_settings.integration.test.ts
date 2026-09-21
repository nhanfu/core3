import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo time-limit settings', () => {
  test('joins the Time & Scoring time-limit contract through matching page/API YAML', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const action = api.actions.find((candidate: any) => candidate.id === 'update_survey_time_limit');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const group = form.groups.find((candidate: any) => candidate.title === 'Time & Scoring');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('is_time_limited');
    expect(detail.query).toContain('time_limit');
    expect(group.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'is_time_limited', label: 'Survey Time Limit' }),
      expect.objectContaining({ field: 'time_limit', label: 'Time limit (minutes)' }),
    ]));
    expect(form.header_actions).toContainEqual(expect.objectContaining({
      id: 'update_survey_time_limit', label: 'Survey Time Limit', permission: 'surveys.write',
    }));
    expect(action).toMatchObject({
      type: 'server_form', permission: 'surveys.write', action: 'surveys.records.time_limit.update',
      handler: 'yaml_mutation', operation: 'update',
    });
    expect(action.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'is_time_limited', type: 'checkbox' }),
      expect.objectContaining({ field: 'time_limit', type: 'number', default: 10 }),
    ]));
    expect(action.mutation.fields).toEqual(['is_time_limited', 'time_limit']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_TIME_LIMIT_NOT_FOUND',
      'SURVEY_TIME_LIMIT_STALE',
      'SURVEY_TIME_LIMIT_ACTOR_REQUIRED',
      'SURVEY_TIME_LIMIT_INVALID',
    ]);
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('is_time_limited');
    expect(yaml('operations.yaml').operations['survey.public.detail'].query).toContain('time_limit');
  });

  test('persists enabled and disabled values while enforcing Odoo guards', { timeout: 15000 }, async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_time_limit_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_time_limit');
    const before = (await repository.query("SELECT row_version, state, is_time_limited, time_limit FROM surveys WHERE id = 'survey-demo-feedback'"))[0];

    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-survey', expected_row_version: 1, current_user_id: 'user-admin',
      values: { is_time_limited: true, time_limit: 5 },
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_TIME_LIMIT_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: '',
      values: { is_time_limited: true, time_limit: 5 },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_TIME_LIMIT_ACTOR_REQUIRED' });
    for (const timeLimit of [0, -1, 'not-a-number']) {
      await expect(repository.executeMutation(action.mutation, {
        id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
        values: { is_time_limited: true, time_limit: timeLimit },
      })).rejects.toMatchObject({ status: 422, code: 'SURVEY_TIME_LIMIT_INVALID' });
    }

    const disabled = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { is_time_limited: false, time_limit: 0 },
    });
    expect(disabled).toMatchObject({ id: 'survey-demo-feedback', row_version: before.row_version + 1, is_time_limited: false, time_limit: 0 });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version, current_user_id: 'user-admin',
      values: { is_time_limited: true, time_limit: 5 },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_TIME_LIMIT_STALE' });
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-feedback', expected_row_version: before.row_version + 1, current_user_id: 'user-admin',
      values: { is_time_limited: false, time_limit: 0 },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_TIME_LIMIT_STALE' });
    database.close();
  });

  test('survives reopen and remains visible to the public timer datasource', { timeout: 15000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-time-limit-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_time_limit_restart', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_time_limit');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-public-timer'"))[0];
      const updated = await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-public-timer', expected_row_version: before.row_version, current_user_id: 'user-admin',
        values: { is_time_limited: true, time_limit: 7.5 },
      });
      expect(updated).toMatchObject({ is_time_limited: true, time_limit: 7.5 });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_time_limit_restart', ['schema', 'data']);
      const detailQuery = yaml('operations.yaml').operations['survey.public.detail'].query;
      const bound = bindNamedParams(detailQuery, { access_token: 'public-timer-token-2026' });
      expect(await reopenedRepository.query(bound.statement, bound.values)).toEqual([
        expect.objectContaining({ id: 'survey-demo-public-timer', is_time_limited: true, time_limit: 7.5 }),
      ]);
      expect(await reopenedRepository.query("SELECT is_time_limited, time_limit, row_version FROM surveys WHERE id = 'survey-demo-public-timer'"))
        .toEqual([{ is_time_limited: true, time_limit: 7.5, row_version: before.row_version + 1 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
