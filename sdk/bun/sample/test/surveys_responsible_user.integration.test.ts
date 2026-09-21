import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys responsible-user parity', () => {
  test('joins Odoo responsible assignment to the existing page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const update = api.actions.find((candidate: any) => candidate.id === 'update_survey_responsible_user');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('s.responsible_user_id');
    expect(detail.query).toContain('s.responsible_user_name');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_survey_responsible_user', permission: 'surveys.write' }));
    expect(update).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.records.responsible.update', handler: 'yaml_mutation' });
    expect(update.mutation.fields).toEqual(['responsible_user_id', 'responsible_user_name']);
    expect(update.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_RESPONSIBLE_STALE', 'SURVEY_RESPONSIBLE_ACTOR_REQUIRED',
      'SURVEY_RESPONSIBLE_REQUIRED', 'SURVEY_RESPONSIBLE_RESTRICTED',
    ]);
  });

  test('persists assignments and enforces actor, restriction, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_responsible_user_guards', ['schema', 'data']);
    const list = yaml('api/surveys.yaml').datasources.find((source: any) => source.id === 'surveys');
    const detail = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_detail');
    const update = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_responsible_user');

    expect((await repository.querySource(list, { q: 'Burger Quiz', state: null, current_user_id: 'user-admin' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'survey-demo-001', responsible_user_id: 'user-admin', responsible_user_name: 'Marc Demo' }),
    ]);
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;
    await expect(repository.executeMutation(update.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: '',
      values: { responsible_user_id: 'user-demo', responsible_user_name: 'Demo Survey Officer' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_RESPONSIBLE_ACTOR_REQUIRED' });
    const changed = await repository.executeMutation(update.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
      values: { responsible_user_id: 'user-demo', responsible_user_name: 'Demo Survey Officer' },
    });
    expect(changed).toMatchObject({ id: 'survey-demo-001', row_version: before + 1, responsible_user_id: 'user-demo' });
    expect((await repository.querySource(detail, { id: 'survey-demo-001', current_user_id: 'user-admin' }, 0, 1)).data).toEqual(expect.objectContaining({ responsible_user_name: 'Demo Survey Officer' }));
    await expect(repository.executeMutation(update.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
      values: { responsible_user_id: 'user-admin', responsible_user_name: 'Admin User' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_RESPONSIBLE_STALE' });

    const restrictedBefore = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-restricted'"))[0].row_version;
    await expect(repository.executeMutation(update.mutation, {
      id: 'survey-demo-restricted', expected_row_version: restrictedBefore, current_user_id: 'user-admin',
      values: { responsible_user_id: 'user-outsider', responsible_user_name: 'Outside User' },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_RESPONSIBLE_RESTRICTED' });
    expect((await repository.query("SELECT responsible_user_id, row_version FROM surveys WHERE id = 'survey-demo-restricted'"))[0]).toEqual({ responsible_user_id: 'user-admin', row_version: restrictedBefore });
    database.close();
  });

  test('survives a file-backed restart and does not replay a stale mutation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-responsible-user-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_responsible_user_restart', ['schema', 'data']);
      const update = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_responsible_user');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;
      await firstRepository.executeMutation(update.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { responsible_user_id: 'user-restart', responsible_user_name: 'Restart Survey Owner' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_responsible_user_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT responsible_user_id, responsible_user_name FROM surveys WHERE id = 'survey-demo-001'"))
        .toEqual([{ responsible_user_id: 'user-restart', responsible_user_name: 'Restart Survey Owner' }]);
      await expect(reopenedRepository.executeMutation(update.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { responsible_user_id: 'user-restart', responsible_user_name: 'Restart Survey Owner' },
      })).rejects.toMatchObject({ status: 409, code: 'SURVEY_RESPONSIBLE_STALE' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
