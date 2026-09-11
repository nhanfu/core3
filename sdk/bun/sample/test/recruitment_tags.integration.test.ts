import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/tags.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Tags parity action', () => {
  test('joins the Odoo Tags list/form page and API by page.id', () => {
    const page = yaml('pages/tags.yaml');
    const api = yaml('api/tags.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-tags', route: '/recruitment/tags', auth: { require: ['recruitment.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('recruitment-tags')?.config.page.id).toBe('recruitment-tags');
    expect(discovered.pageDatasources.get('recruitment-tags')).toEqual(['recruitment_tags']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_tags', create_action: 'create_recruitment_tag', row_open_action: 'edit_recruitment_tag' });
    expect(page.components[0].inline_edit).toMatchObject({ create_action: 'create_recruitment_tag', update_action: 'edit_recruitment_tag', save_label: 'Save', discard_label: 'Discard' });
    expect(page.components[0].inline_edit.fields.map((field: any) => ({ field: field.field, type: field.type })))
      .toEqual([{ field: 'name', type: 'text' }, { field: 'color', type: 'color' }]);
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['name', 'color', 'id']);
    expect(page.components[0].columns.find((column: any) => column.field === 'id')?.mobile).toBe(false);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/tags', permission: 'recruitment.manage' })]));
  });

  test('seeds Odoo tags and supports search, empty, CRUD, validation, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_tag_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_tag_test_migrations', ['schema', 'data']);

    const source = yaml('api/tags.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Reserve', 'Manager', 'IT', 'Sales']);
    expect((await repository.querySource(source, { q: 'man', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Manager', color: 10 }]);
    expect((await repository.querySource(source, { q: 'No such tag', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_recruitment_tag');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Engineering', color: 7 } });
    expect(created).toMatchObject({ name: 'Engineering', color: 7, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'engineering', color: 8 } }))
      .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_TAG_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Color', color: 12 } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_TAG_COLOR_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', color: 1 } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_TAG_NAME_REQUIRED' });

    const edit = action('edit_recruitment_tag');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Engineering Updated', color: 8 } });
    expect(edited).toMatchObject({ name: 'Engineering Updated', color: 8, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', color: 9 } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const remove = action('delete_recruitment_tag');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Engineering Updated', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: 'missing-tag', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_TAG_NOT_FOUND' });
  });

  test('requires manager permission and declares the transport-error contract', () => {
    const api = yaml('api/tags.yaml');
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states).toMatchObject({
      forbidden: { status: 403, code: 'RECRUITMENT_TAGS_FORBIDDEN' },
      transport_error: { status: 503, code: 'RECRUITMENT_TAGS_UNAVAILABLE' },
    });
    for (const id of ['create_recruitment_tag', 'edit_recruitment_tag', 'delete_recruitment_tag']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_tag').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_tag').mutation.concurrency.required).toBe(true);
  });
});
