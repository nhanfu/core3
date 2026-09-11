import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Base Country Group parity', () => {
  test('binds Odoo action 63 menu/list/detail/new contracts through page ids', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'people').items.find((item: any) => item.label === 'Configuration');
    const localization = config.children.find((item: any) => item.label === 'Localization');
    expect(localization.children).toContainEqual(expect.objectContaining({ path: '/base-country-groups', label: 'Country Group', permission: 'base.reference.read' }));
    const list = yaml('pages/country-groups.yaml');
    const detail = yaml('pages/country-group-detail.yaml');
    const create = yaml('pages/country-group-new.yaml');
    expect(list.page).toMatchObject({ id: 'country-groups', route: '/base-country-groups', breadcrumb: ['Contacts', 'Configuration', 'Localization', 'Country Group'] });
    expect(detail.page.id).toBe('country-group-detail');
    expect(create.page).toMatchObject({ id: 'country-group-new', route: '/base-country-groups/new' });
    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('country-groups')).toEqual(expect.arrayContaining(['country_groups', 'country_group_countries']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-country-groups', page: 'country-groups', module: 'base' }),
      expect.objectContaining({ path: '/base-country-groups/new', page: 'country-group-new', module: 'base' }),
    ]));
    expect(list.components[0].columns.map((column: any) => column.label)).toEqual(['Name', 'Code']);
    expect(detail.components[0].fields.map((field: any) => field.label)).toEqual(['Group Name', 'Code', 'Countries', 'Fiscal Exceptions?']);
  });

  test('seeds the ten Odoo groups and supports search, empty, create, update, and delete', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'base_country_groups_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'base_country_groups_test_migrations', ['schema', 'data']);
    const source = yaml('api/country-groups.yaml').datasources.find((item: any) => item.id === 'country_groups');
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 80);
    expect(rows.data).toHaveLength(10);
    expect(rows.data.map((row: any) => row.name)).toEqual([
      'European Union', 'European Union Prefixed Countries', 'South America', 'SEPA Countries',
      'Gulf Cooperation Council (GCC)', 'Eurasian Economic Union', 'Switzerland and Liechtenstein',
      'DOM-TOM', 'European Union VAT', 'Intrastat',
    ]);
    expect(rows.data.find((row: any) => row.code === 'EU')).toMatchObject({ country_names: expect.stringContaining('Austria') });
    expect((await repository.querySource(source, { q: 'prefix', fixture_state: null }, 0, 80)).data.map((row: any) => row.code)).toEqual(['EU_PREFIX']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 80)).data).toEqual([]);
    const create = action('api/country-groups.yaml', 'create_country_group');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'ASEAN', code: 'ASEAN', country_names: 'Singapore, Malaysia' } });
    expect(created).toMatchObject({ name: 'ASEAN', code: 'ASEAN', country_names: 'Singapore, Malaysia' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'asean', code: 'ASEAN-2' } })).rejects.toMatchObject({ status: 409, code: 'BASE_COUNTRY_GROUP_NAME_EXISTS' });
    const edit = action('api/country-group-detail.yaml', 'edit_country_group');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'ASEAN 2026', code: 'ASEAN', country_names: 'Singapore, Malaysia' } });
    expect(edited).toMatchObject({ name: 'ASEAN 2026', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', code: 'STALE', country_names: '' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('api/country-group-detail.yaml', 'delete_country_group').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'ASEAN', fixture_state: null }, 0, 80)).data).toEqual([]);
  });

  test('keeps Base permission, transport error, and validation guards explicit', () => {
    const listApi = yaml('api/country-groups.yaml');
    const detailApi = yaml('api/country-group-detail.yaml');
    expect(listApi.datasources.find((item: any) => item.id === 'country_groups')).toMatchObject({ permission: 'base.reference.read', error_states: { transport_error: { status: 503, code: 'BASE_COUNTRY_GROUPS_UNAVAILABLE' } } });
    for (const [file, id] of [['api/country-groups.yaml', 'create_country_group'], ['api/country-group-detail.yaml', 'edit_country_group'], ['api/country-group-detail.yaml', 'delete_country_group']]) {
      expect(action(file, id).permission, id).toBe('base.reference.write');
      expect(action(file, id).handler, id).toBe('yaml_mutation');
    }
    expect(action('api/country-groups.yaml', 'create_country_group').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'BASE_COUNTRY_GROUP_NAME_EXISTS' }), expect.objectContaining({ code: 'BASE_COUNTRY_GROUP_CODE_EXISTS' })]));
    expect(action('api/country-group-detail.yaml', 'edit_country_group').mutation.concurrency).toMatchObject({ required: true });
    expect(detailApi.datasources.find((item: any) => item.id === 'country_group_detail')).toMatchObject({ single: true, permission: 'base.reference.read' });
  });
});
