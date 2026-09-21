import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys follower parity', () => {
  test('joins Odoo mail.thread followers to the existing page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const followers = api.datasources.find((source: any) => source.id === 'survey_followers');
    const candidates = api.datasources.find((source: any) => source.id === 'survey_follower_candidates');
    const add = api.actions.find((candidate: any) => candidate.id === 'add_survey_follower');
    const remove = api.actions.find((candidate: any) => candidate.id === 'remove_survey_follower');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({
      follower_source: 'survey_followers',
      follower_candidates_source: 'survey_follower_candidates',
      follower_add_action: 'add_survey_follower',
      follower_remove_action: 'remove_survey_follower',
    });
    expect(followers.query).toContain('FROM survey_followers');
    expect(candidates.query).toContain('NOT EXISTS');
    expect(add).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.followers.add', handler: 'line_item' });
    expect(remove).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.followers.remove', handler: 'line_item' });
    expect(add.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_FOLLOWER_PARENT_CHANGED', 'SURVEY_FOLLOWER_ACTOR_REQUIRED',
      'SURVEY_FOLLOWER_REQUIRED', 'SURVEY_FOLLOWER_ALREADY_EXISTS',
    ]);
    expect(remove.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_FOLLOWER_PARENT_CHANGED', 'SURVEY_FOLLOWER_STALE', 'SURVEY_FOLLOWER_ACTOR_REQUIRED',
    ]);
  });

  test('adds and removes followers with actor, missing, duplicate, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_follower_guards', ['schema', 'data']);
    const followers = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_followers');
    const add = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_follower');
    const remove = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'remove_survey_follower');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;

    await expect(repository.executeMutation(add.mutation, {
      id: 'survey-demo-001', parent_expected_row_version: before, current_user_id: '',
      values: { user_id: 'user-demo' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_FOLLOWER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, {
      id: 'survey-demo-001', parent_expected_row_version: before, current_user_id: 'user-admin',
      values: { user_id: '' },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_FOLLOWER_REQUIRED' });
    const added = await repository.executeMutation(add.mutation, {
      id: 'survey-demo-001', parent_expected_row_version: before, current_user_id: 'user-admin',
      values: { user_id: 'user-demo' },
    });
    expect(added).toMatchObject({ id: 'survey-demo-001-follower-user-demo', survey_id: 'survey-demo-001', user_id: 'user-demo', user_name: 'Demo Survey Officer' });
    expect((await repository.querySource(followers, { id: 'survey-demo-001' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: added.id, user_email: 'demo@core3.local' }),
    ]));
    const afterAdd = before + 1;
    await expect(repository.executeMutation(add.mutation, {
      id: 'survey-demo-001', parent_expected_row_version: afterAdd, current_user_id: 'user-admin',
      values: { user_id: 'user-demo' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_FOLLOWER_ALREADY_EXISTS' });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'survey-demo-001', line_id: added.id, parent_expected_row_version: afterAdd, expected_row_version: 99, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_FOLLOWER_STALE' });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'survey-demo-001', line_id: added.id, parent_expected_row_version: before, expected_row_version: 1, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_FOLLOWER_PARENT_CHANGED' });
    const removed = await repository.executeMutation(remove.mutation, {
      id: 'survey-demo-001', line_id: added.id, parent_expected_row_version: afterAdd, expected_row_version: 1, current_user_id: 'user-admin',
    });
    expect(removed).toEqual({ deleted: true, id: added.id });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_followers WHERE id = ?", [added.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves followers and candidate filtering through file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-follower-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_follower_restart', ['schema', 'data']);
      const add = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_follower');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;
      await firstRepository.executeMutation(add.mutation, {
        id: 'survey-demo-001', parent_expected_row_version: before, current_user_id: 'user-admin',
        values: { user_id: 'user-manager' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_follower_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT survey_id, user_id, user_name FROM survey_followers WHERE user_id = 'user-manager'"))
        .toEqual([{ survey_id: 'survey-demo-001', user_id: 'user-manager', user_name: 'Survey Manager' }]);
      const candidates = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_follower_candidates');
      expect((await reopenedRepository.querySource(candidates, { id: 'survey-demo-001' }, 0, 50)).data).not.toEqual(expect.arrayContaining([{ value: 'user-manager', label: expect.any(String) }]));
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
