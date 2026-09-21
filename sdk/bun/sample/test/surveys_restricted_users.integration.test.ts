import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys restricted-user access parity', () => {
  test('joins the Odoo restricted-user form surface to the existing page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const grid = page.components.find((component: any) => component.source === 'survey_restricted_users');
    const add = api.actions.find((candidate: any) => candidate.id === 'add_survey_restricted_user');
    const remove = api.actions.find((candidate: any) => candidate.id === 'remove_survey_restricted_user');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(grid).toMatchObject({ source: 'survey_restricted_users', parent_source: 'survey_detail', variant: 'odoo_x2many' });
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'add_survey_restricted_user', permission: 'surveys.write' }));
    expect(grid.children).toContainEqual(expect.objectContaining({ id: 'user_name', field: 'user_name' }));
    expect(add).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.restrictions.add', handler: 'line_item', operation: 'create' });
    expect(remove).toMatchObject({ type: 'server', permission: 'surveys.write', action: 'surveys.restrictions.remove', handler: 'line_item', operation: 'delete' });
    expect(add.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_RESTRICTION_PARENT_CHANGED', 'SURVEY_RESTRICTION_ACTOR_REQUIRED',
      'SURVEY_RESTRICTION_USER_REQUIRED', 'SURVEY_RESTRICTION_ALREADY_ALLOWED',
    ]);
    expect(remove.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_RESTRICTION_PARENT_CHANGED', 'SURVEY_RESTRICTION_STALE', 'SURVEY_RESTRICTION_ACTOR_REQUIRED',
    ]);
    expect(discovered.pageDatasources.get('survey-detail')).toContain('survey_restricted_users');
  });

  test('filters restricted surveys server-side and guards add/remove mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_restricted_users_guards', ['schema', 'data']);
    const list = yaml('api/surveys.yaml').datasources.find((source: any) => source.id === 'surveys');
    const detail = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_detail');
    const restricted = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_restricted_users');
    const add = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_restricted_user');
    const remove = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'remove_survey_restricted_user');

    const adminRows = (await repository.querySource(list, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50)).data;
    const outsiderRows = (await repository.querySource(list, { q: null, state: null, current_user_id: 'user-outsider' }, 0, 50)).data;
    expect(adminRows).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'survey-demo-restricted', restricted_user_names: 'Admin User||Demo Survey Officer' })]));
    expect(outsiderRows).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'survey-demo-restricted' })]));
    expect((await repository.querySource(detail, { id: 'survey-demo-restricted', current_user_id: 'user-admin' }, 0, 1)).data).toEqual(expect.objectContaining({ id: 'survey-demo-restricted' }));
    expect((await repository.querySource(detail, { id: 'survey-demo-restricted', current_user_id: 'user-outsider' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(restricted, { id: 'survey-demo-restricted' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(restricted, { id: 'survey-demo-restricted', current_user_id: 'user-outsider' }, 0, 50)).data).toEqual([]);

    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-restricted'"))[0].row_version;
    await expect(repository.executeMutation(add.mutation, {
      id: 'survey-demo-restricted', parent_expected_row_version: before, current_user_id: '',
      values: { user_id: 'user-new', user_name: 'New Survey Officer' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_RESTRICTION_ACTOR_REQUIRED' });
    const added = await repository.executeMutation(add.mutation, {
      id: 'survey-demo-restricted', parent_expected_row_version: before, current_user_id: 'user-admin',
      values: { user_id: 'user-new', user_name: 'New Survey Officer' },
    });
    expect(added).toMatchObject({ id: 'survey-demo-restricted-restricted-user-new', survey_id: 'survey-demo-restricted', user_id: 'user-new', user_name: 'New Survey Officer' });
    expect((await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-restricted'"))[0].row_version).toBe(before + 1);
    await expect(repository.executeMutation(add.mutation, {
      id: 'survey-demo-restricted', parent_expected_row_version: before + 1, current_user_id: 'user-admin',
      values: { user_id: 'user-new', user_name: 'New Survey Officer' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_RESTRICTION_ALREADY_ALLOWED' });
    await expect(repository.executeMutation(remove.mutation, {
      id: 'survey-demo-restricted', line_id: added.id, parent_expected_row_version: before, expected_row_version: 1, current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_RESTRICTION_PARENT_CHANGED' });
    const removed = await repository.executeMutation(remove.mutation, {
      id: 'survey-demo-restricted', line_id: added.id, parent_expected_row_version: before + 1, expected_row_version: 1, current_user_id: 'user-admin',
    });
    expect(removed).toEqual({ deleted: true, id: added.id });
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_restricted_users WHERE id = 'survey-demo-restricted-restricted-user-new'" )).toEqual([{ count: 0 }]);
    database.close();
  });

  test('keeps restricted access rows and filtering after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-restricted-users-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_restricted_users_restart', ['schema', 'data']);
      const add = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'add_survey_restricted_user');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-restricted'"))[0].row_version;
      await firstRepository.executeMutation(add.mutation, {
        id: 'survey-demo-restricted', parent_expected_row_version: before, current_user_id: 'user-admin',
        values: { user_id: 'user-restart', user_name: 'Restart Survey Officer' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_restricted_users_restart', ['schema', 'data']);
      const relation = await reopenedRepository.query("SELECT survey_id, user_id, user_name FROM survey_restricted_users WHERE user_id = 'user-restart'");
      expect(relation).toEqual([{ survey_id: 'survey-demo-restricted', user_id: 'user-restart', user_name: 'Restart Survey Officer' }]);
      const list = yaml('api/surveys.yaml').datasources.find((source: any) => source.id === 'surveys');
      expect((await reopenedRepository.querySource(list, { q: 'Restricted Vendor Review', state: null, current_user_id: 'user-outsider' }, 0, 50)).data).toEqual([]);
      expect((await reopenedRepository.querySource(list, { q: 'Restricted Vendor Review', state: null, current_user_id: 'user-restart' }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'survey-demo-restricted' })]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
