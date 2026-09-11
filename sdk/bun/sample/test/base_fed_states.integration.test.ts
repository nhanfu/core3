import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/fed-states.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Base Fed. States parity', () => {
  test('binds the Localization menu and page/API fragments by page.id', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'people').items.find((item: any) => item.label === 'Configuration');
    const localization = config.children.find((item: any) => item.label === 'Localization');
    expect(localization.children).toContainEqual(expect.objectContaining({ path: '/base-fed-states', label: 'Fed. States', permission: 'base.reference.read' }));
    const page = yaml('pages/fed-states.yaml');
    const api = yaml('api/fed-states.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page).toMatchObject({ page: { id: 'fed-states', route: '/base-fed-states' } });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].source).toBe('fed_states');
    expect(discovered.pageDatasources.get('fed-states')).toEqual(expect.arrayContaining(['fed_states', 'state_countries']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-fed-states', page: 'fed-states', module: 'base' }),
    ]));
  });

  test('adds the row-version schema and serves deterministic states with search and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_fed_states_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_fed_states_test_migrations', ['schema', 'data']);
    const source = yaml('api/fed-states.yaml').datasources.find((item: any) => item.id === 'fed_states');
    const rows = await repository.querySource(source, { q: null, country_code: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(3);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DE-BE', country_code: 'DE', country_name: 'Germany', row_version: 1 }),
      expect.objectContaining({ code: 'US-CA', country_code: 'US', country_name: 'United States', row_version: 1 }),
      expect.objectContaining({ code: 'VN-HCM', country_code: 'VN', country_name: 'Vietnam', row_version: 1 }),
    ]));
    expect((await repository.querySource(source, { q: 'California', country_code: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ code: 'US-CA', name: 'California' }]);
    expect((await repository.querySource(source, { q: null, country_code: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, country_code: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_FED_STATES_UNAVAILABLE' });
    database.close();
  });

  test('declares permissioned CRUD and stable validation/concurrency guards', () => {
    const api = yaml('api/fed-states.yaml');
    expect(api.datasources.find((item: any) => item.id === 'fed_states')).toMatchObject({ permission: 'base.reference.read' });
    for (const id of ['create_fed_state', 'edit_fed_state', 'delete_fed_state']) {
      expect(action(id).permission, id).toBe('base.reference.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    expect(action('create_fed_state').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 422, code: 'BASE_STATE_FIELDS_REQUIRED' }),
      expect.objectContaining({ status: 409, code: 'BASE_STATE_CODE_EXISTS' }),
    ]));
    expect(action('edit_fed_state').mutation.concurrency).toMatchObject({ required: true });
    expect(action('delete_fed_state').mutation.concurrency).toMatchObject({ required: true });
  });
});
