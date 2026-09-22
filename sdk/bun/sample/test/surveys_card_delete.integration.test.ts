import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo card Delete action', () => {
  test('binds the card Delete menu to the existing permissioned delete API contract', async () => {
    const page = yaml('pages/surveys.yaml');
    const listApi = yaml('api/surveys.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const deleteAction = page.actions.find((action: any) => action.id === 'delete_survey_card');
    const deleteMutation = detailApi.actions.find((action: any) => action.id === 'delete_survey');
    const surveySource = listApi.datasources.find((source: any) => source.id === 'surveys');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'surveys', route: '/surveys' });
    expect(listApi.page).toEqual({ id: 'surveys' });
    expect(discovered.pageDatasources.get('surveys')).toContain('surveys');
    expect(list).toMatchObject({ row_actions: 'menu' });
    expect(list.actions).toContainEqual(expect.objectContaining({
      id: 'delete_survey_card', label: 'Delete', icon: 'trash', variant: 'danger', permission: 'surveys.write',
    }));
    expect(deleteAction).toMatchObject({ id: 'delete_survey_card', type: 'client', permission: 'surveys.write' });
    expect(deleteAction.script).toContain('window.confirm');
    expect(deleteAction.script).toContain('/api/actions/surveys.records.delete');
    expect(deleteAction.script).toContain('expected_row_version: row.row_version');
    expect(deleteAction.script).toContain("app.navigate('/surveys')");
    expect(deleteMutation).toMatchObject({
      type: 'server', permission: 'surveys.write', action: 'surveys.records.delete',
      handler: 'yaml_mutation', operation: 'delete',
    });
    expect(deleteMutation.mutation).toMatchObject({
      operation: 'delete', table: 'surveys', concurrency: { required: true },
    });
    expect(surveySource).toBeDefined();
  });

  test('reuses the durable delete graph and leaves the Cards source empty after deletion', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_delete', ['schema', 'data']);

    const deleteMutation = yaml('api/survey-detail.yaml').actions.find((action: any) => action.id === 'delete_survey').mutation;
    expect(await repository.query('SELECT id FROM surveys WHERE id = ?', ['survey-delete-candidate'])).toEqual([
      { id: 'survey-delete-candidate' },
    ]);

    await repository.executeMutation(deleteMutation, {
      id: 'survey-delete-candidate',
      expected_row_version: 1,
    });

    const listApi = yaml('api/surveys.yaml');
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'surveys');
    expect((await repository.querySource(source, { q: 'Delete Candidate Survey', state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(deleteMutation, {
      id: 'survey-delete-candidate',
      expected_row_version: 1,
    })).rejects.toMatchObject({ status: 404, code: 'SURVEY_DELETE_NOT_FOUND' });

    database.close();
  });
});
