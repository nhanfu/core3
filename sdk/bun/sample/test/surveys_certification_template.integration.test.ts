import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys certification template parity', () => {
  test('joins Odoo certification settings to the authenticated survey detail pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_detail');
    const action = api.actions.find((candidate: any) => candidate.id === 'update_survey_certification_template');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('certification_report_layout');
    expect(form.header_actions).toContainEqual(expect.objectContaining({
      id: 'update_survey_certification_template',
      permission: 'surveys.write',
    }));
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'surveys.write',
      action: 'surveys.records.certification_template.update',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(action.mutation.fields).toEqual(['certification', 'certification_report_layout']);
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_CERTIFICATION_TEMPLATE_NOT_FOUND',
      'SURVEY_CERTIFICATION_TEMPLATE_STALE',
      'SURVEY_CERTIFICATION_TEMPLATE_ACTOR_REQUIRED',
      'SURVEY_CERTIFICATION_TEMPLATE_INVALID',
    ]);
    expect(action.fields.find((field: any) => field.field === 'certification_report_layout').options).toHaveLength(6);
    expect(yaml('migrations/20261101000000-070-survey-certification-template.yaml').version).toBe('0.0.70');
  });

  test('persists a valid template and rejects missing, actor, invalid, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_certification_template_guards', ['schema', 'data']);
    const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_certification_template');
    const before = (await repository.query("SELECT row_version, certification, certification_report_layout FROM surveys WHERE id = 'survey-demo-certification'"))[0];

    const updated = await repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification',
      expected_row_version: before.row_version,
      current_user_id: 'user-admin',
      values: { certification: true, certification_report_layout: 'classic_blue' },
    });
    expect(updated).toMatchObject({ id: 'survey-demo-certification', row_version: before.row_version + 1, certification: true, certification_report_layout: 'classic_blue' });

    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-survey', expected_row_version: 1, current_user_id: 'user-admin', values: { certification: true, certification_report_layout: 'modern_purple' },
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_CERTIFICATION_TEMPLATE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version + 1, current_user_id: '', values: { certification: true, certification_report_layout: 'modern_purple' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_CERTIFICATION_TEMPLATE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version + 1, current_user_id: 'user-admin', values: { certification: true, certification_report_layout: 'unsupported' },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_CERTIFICATION_TEMPLATE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version, current_user_id: 'user-admin', values: { certification: false, certification_report_layout: 'modern_purple' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CERTIFICATION_TEMPLATE_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'survey-demo-certification', expected_row_version: before.row_version + 1, current_user_id: 'user-admin', values: { certification: true, certification_report_layout: 'classic_blue' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('retains the selected template across a file-backed restart and rejects replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-certification-template-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_certification_template_restart', ['schema', 'data']);
      const action = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'update_survey_certification_template');
      await firstRepository.executeMutation(action.mutation, {
        id: 'survey-demo-certification', expected_row_version: 1, current_user_id: 'user-admin', values: { certification: true, certification_report_layout: 'modern_gold' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_certification_template_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT certification, certification_report_layout, row_version FROM surveys WHERE id = 'survey-demo-certification'"))
        .toEqual([{ certification: true, certification_report_layout: 'modern_gold', row_version: 2 }]);
      await expect(reopenedRepository.executeMutation(action.mutation, {
        id: 'survey-demo-certification', expected_row_version: 1, current_user_id: 'user-admin', values: { certification: true, certification_report_layout: 'modern_blue' },
      })).rejects.toMatchObject({ status: 409, code: 'SURVEY_CERTIFICATION_TEMPLATE_STALE' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
