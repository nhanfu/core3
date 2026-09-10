import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/degrees.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Degrees parity action', () => {
  test('joins the Odoo Degrees list/form page and API by page.id', () => {
    const page = yaml('pages/degrees.yaml');
    const api = yaml('api/degrees.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-degrees', route: '/recruitment/degrees', auth: { require: ['recruitment.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-degrees')?.config.page.id).toBe('recruitment-degrees');
    expect(discovered.pageDatasources.get('recruitment-degrees')).toEqual(['recruitment_degrees']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_degrees', create_action: 'create_recruitment_degree', row_open_action: 'edit_recruitment_degree' });
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'score', 'id']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/degrees', permission: 'recruitment.manage' })]));
  });

  test('seeds deterministic Odoo degrees and supports search, empty, CRUD, validation, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_degree_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_degree_test_migrations', ['schema', 'data']);

    const source = yaml('api/degrees.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Graduate', 'Bachelor Degree', 'Master Degree', 'Doctoral Degree']);
    expect((await repository.querySource(source, { q: 'Master', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Master Degree', score: 0.9 }]);
    expect((await repository.querySource(source, { q: 'No such degree', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_recruitment_degree');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Professional Certificate', score: 0.4, sequence: 5 } });
    expect(created).toMatchObject({ name: 'Professional Certificate', score: 0.4, sequence: 5 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'professional certificate', score: 0.4, sequence: 6 } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_DEGREE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Score', score: 1.1, sequence: 6 } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_DEGREE_SCORE_INVALID' });

    const edit = action('edit_recruitment_degree');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Professional Certificate Updated', score: 0.45, sequence: 6 } });
    expect(edited).toMatchObject({ name: 'Professional Certificate Updated', score: 0.45, sequence: 6 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', score: 0.5, sequence: 7 } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const remove = action('delete_recruitment_degree');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Professional Certificate Updated', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: 'missing-degree', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_DEGREE_NOT_FOUND' });
  });

  test('requires manager permission and declares the transport-error contract', () => {
    const api = yaml('api/degrees.yaml');
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'RECRUITMENT_DEGREES_UNAVAILABLE' });
    for (const id of ['create_recruitment_degree', 'edit_recruitment_degree', 'delete_recruitment_degree']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_degree').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_degree').mutation.concurrency.required).toBe(true);
  });
});
