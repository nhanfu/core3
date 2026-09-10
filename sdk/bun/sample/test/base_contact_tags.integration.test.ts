import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/contact-tags.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Base Contact Tags parity', () => {
  test('keeps the list presentation-only and joins its API through page.id', () => {
    const page = yaml('pages/contact-tags.yaml');
    const api = yaml('api/contact-tags.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'contact-tags', route: '/base-contact-tags' });
    expect(api.page.id).toBe('contact-tags');
    expect(discovered.pages.get('contact-tags')?.config.page.id).toBe('contact-tags');
    expect(discovered.pageDatasources.get('contact-tags')).toEqual(expect.arrayContaining(['contact_tags', 'contact_tag_states', 'contact_tag_parents']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-contact-tags', page: 'contact-tags', module: 'base' }),
    ]));
  });

  test('seeds the Odoo tag hierarchy and supports search, empty, archive, and CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'base_contact_tags_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'base_contact_tags_test_migrations', ['schema', 'data']);

    const source = yaml('api/contact-tags.yaml').datasources.find((item: any) => item.id === 'contact_tags');
    const rows = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Consulting Services', 'Desk Manufacturers', 'Employees', 'Office Supplies', 'Prospects', 'Services', 'Vendor']);
    expect(rows.data.find((row: any) => row.name === 'Desk Manufacturers')).toMatchObject({ category: 'Vendor', color: 10, active: true });
    expect((await repository.querySource(source, { q: 'Vendor', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Desk Manufacturers', 'Office Supplies', 'Vendor']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Archived Contact Tag']);

    const create = action('create_contact_tag');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Roadshow', color: 6 } });
    expect(created).toMatchObject({ name: 'Roadshow', color: 6, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'roadshow', color: 7 } })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_TAG_NAME_EXISTS' });

    const edit = action('edit_contact_tag');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Roadshow 2026', color: 8 } });
    expect(edited).toMatchObject({ name: 'Roadshow 2026', color: 8, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Roadshow', color: 9 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.executeMutation(action('archive_contact_tag').mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(source, { q: 'Roadshow', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await repository.executeMutation(action('unarchive_contact_tag').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    await repository.executeMutation(action('delete_contact_tag').mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(source, { q: 'Roadshow', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });

  test('keeps permission, transport error, inline editor, and mutation guards explicit', () => {
    const api = yaml('api/contact-tags.yaml');
    const list = yaml('pages/contact-tags.yaml').components[0];
    expect(list.inline_edit).toMatchObject({ create_action: 'create_contact_tag', update_action: 'edit_contact_tag' });
    expect(list.inline_edit.fields.map((field: any) => field.field)).toEqual(['name', 'color']);
    expect(list.columns.find((column: any) => column.field === 'color')).toMatchObject({ type: 'ColorCell' });
    expect(api.datasources.find((item: any) => item.id === 'contact_tags')).toMatchObject({ permission: 'base.reference.read', error_states: { transport_error: { status: 503, code: 'BASE_CONTACT_TAGS_UNAVAILABLE' } } });
    for (const id of ['create_contact_tag', 'edit_contact_tag', 'archive_contact_tag', 'unarchive_contact_tag', 'delete_contact_tag']) {
      expect(action(id).permission, id).toBe('base.reference.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
      expect(action(id).mutation.concurrency?.required !== false, id).toBe(true);
    }
    expect(action('create_contact_tag').mutation.guards[0]).toMatchObject({ status: 409, code: 'BASE_CONTACT_TAG_NAME_EXISTS' });
    expect(action('edit_contact_tag').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 409 })]));
  });
});
