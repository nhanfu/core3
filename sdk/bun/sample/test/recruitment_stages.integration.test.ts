import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/stages.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Stages parity action', () => {
  test('joins list and form pages to their API fragments by page.id', () => {
    const listPage = yaml('pages/stages.yaml');
    const detailPage = yaml('pages/stage-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'recruitment-stages', route: '/recruitment/stages', auth: { require: ['recruitment.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'recruitment-stage-detail', route: '/recruitment/stages/detail' });
    expect(yaml('api/stages.yaml').page.id).toBe(listPage.page.id);
    expect(yaml('api/stage-detail.yaml').page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('recruitment-stages')).toEqual(['recruitment_stages']);
    expect(discovered.pageDatasources.get('recruitment-stage-detail')).toEqual(['recruitment_stage_detail']);
    const list = listPage.components[0];
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'recruitment_stages', view_navigation: 'tabs', row_open_action: 'edit_recruitment_stage' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.form_view.page).toBe('apps/services/recruitment/pages/stage-detail.yaml');
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/stages', label: 'Stages', permission: 'recruitment.manage' })]));
  });

  test('seeds Odoo stages idempotently and covers search, empty, CRUD, invalid, missing, and stale states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'recruitment_stage_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'recruitment_stage_test_migrations', ['schema', 'data']);
    const source = yaml('api/stages.yaml').datasources[0];
    const params = { q: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['New', 'Qualification', 'First Interview', 'Second Interview', 'Contract Proposal', 'Contract Signed']);
    expect((await repository.querySource(source, { ...params, q: 'Interview' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['First Interview', 'Second Interview']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_recruitment_stage');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Hiring Manager Review', sequence: 6, fold: false, hired_stage: false, rotting_threshold_days: 10 } });
    expect(created).toMatchObject({ name: 'Hiring Manager Review', sequence: 6, rotting_threshold_days: 10 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'hiring manager review', sequence: 7 } })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_STAGE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Stage', sequence: -1, rotting_threshold_days: 0 } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_STAGE_VALUES_INVALID' });

    const edit = action('edit_recruitment_stage');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Hiring Manager Review', sequence: 7, rotting_threshold_days: 12 } });
    expect(edited).toMatchObject({ sequence: 7, rotting_threshold_days: 12 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Stage', sequence: 8 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-stage', expected_row_version: 1, values: { name: 'Missing', sequence: 1 } })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_STAGE_NOT_FOUND' });

    const remove = action('delete_recruitment_stage');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { ...params, q: 'Hiring Manager' }, 0, 50)).data).toEqual([]);
  });

  test('declares manager permission, transport errors, and concurrency guards', () => {
    const api = yaml('api/stages.yaml');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'RECRUITMENT_STAGES_UNAVAILABLE' });
    for (const id of ['create_recruitment_stage', 'edit_recruitment_stage', 'delete_recruitment_stage']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    expect(action('edit_recruitment_stage').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_stage').mutation.concurrency.required).toBe(true);
  });
});
