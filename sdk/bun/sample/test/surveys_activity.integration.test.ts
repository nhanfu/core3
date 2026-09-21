import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys activity parity', () => {
  test('joins Odoo activity mixin behavior to the existing page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const activities = api.datasources.find((source: any) => source.id === 'survey_activities');
    const schedule = api.actions.find((candidate: any) => candidate.id === 'schedule_survey_activity');
    const complete = api.actions.find((candidate: any) => candidate.id === 'complete_survey_activity');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(activities.query).toContain('FROM survey_activities');
    expect(page.components[0]).toMatchObject({
      source: 'survey_detail',
      message_source: 'survey_activities',
      activity_action: 'schedule_survey_activity',
      activity_complete_action: 'complete_survey_activity',
    });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'schedule_survey_activity', permission: 'surveys.write' }));
    expect(schedule).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.records.activity.schedule', handler: 'yaml_mutation' });
    expect(complete).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.records.activity.complete', handler: 'yaml_mutation' });
    expect(schedule.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_ACTIVITY_PARENT_CHANGED', 'SURVEY_ACTIVITY_ACTOR_REQUIRED',
      'SURVEY_ACTIVITY_TYPE_INVALID', 'SURVEY_ACTIVITY_SUMMARY_REQUIRED',
      'SURVEY_ACTIVITY_DATE_INVALID',
    ]);
    expect(complete.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_ACTIVITY_STALE', 'SURVEY_ACTIVITY_ACTOR_REQUIRED',
    ]);
  });

  test('schedules and completes activities with actor, permission, parent, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_activity_guards', ['schema', 'data']);
    const activities = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_activities');
    const schedule = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'schedule_survey_activity');
    const complete = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'complete_survey_activity');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;

    await expect(repository.executeMutation(schedule.mutation, {
      survey_id: 'survey-demo-001', expected_row_version: before, current_user_id: '',
      values: { survey_id: 'survey-demo-001', activity_type: 'call', summary: 'Call customer about survey results', due_date: '2026-01-17' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_ACTIVITY_ACTOR_REQUIRED' });
    const created = await repository.executeMutation(schedule.mutation, {
      survey_id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { survey_id: 'survey-demo-001', activity_type: 'call', summary: 'Call customer about survey results', due_date: '2026-01-17', assigned_user_id: 'user-admin', assigned_user_name: 'Admin User' },
    });
    expect(created).toMatchObject({ id: 'survey-demo-001-activity-2', survey_id: 'survey-demo-001', state: 'planned', activity_type: 'call' });
    expect((await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version).toBe(before + 1);
    expect((await repository.querySource(activities, { id: 'survey-demo-001' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.id, summary: 'Call customer about survey results' }),
    ]));
    await expect(repository.executeMutation(schedule.mutation, {
      survey_id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
      values: { survey_id: 'survey-demo-001', activity_type: 'call', summary: 'Replay', due_date: '2026-01-17' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_ACTIVITY_PARENT_CHANGED' });

    await expect(repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: '',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_ACTIVITY_ACTOR_REQUIRED' });
    const completed = await repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    });
    expect(completed).toMatchObject({ id: created.id, state: 'done', row_version: 2 });
    await expect(repository.executeMutation(complete.mutation, {
      id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_ACTIVITY_STALE' });
    database.close();
  });

  test('preserves scheduled and completed activities through file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-activity-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_activity_restart', ['schema', 'data']);
      const schedule = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'schedule_survey_activity');
      const complete = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'complete_survey_activity');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;
      const created = await firstRepository.executeMutation(schedule.mutation, {
        survey_id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { survey_id: 'survey-demo-001', activity_type: 'meeting', summary: 'Restart-safe survey review', due_date: '2026-01-18' },
      });
      await firstRepository.executeMutation(complete.mutation, {
        id: created.id, expected_row_version: 1, current_user_id: 'user-admin',
        values: { state: 'done', completed_at: '2026-01-15 10:00:00' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_activity_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT survey_id, activity_type, summary, state, row_version FROM survey_activities WHERE id = ?", [created.id]))
        .toEqual([{ survey_id: 'survey-demo-001', activity_type: 'meeting', summary: 'Restart-safe survey review', state: 'done', row_version: 2 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
