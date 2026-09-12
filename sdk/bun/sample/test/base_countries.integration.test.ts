import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Base Countries parity', () => {
  test('binds the Localization menu and page/API fragments by page.id', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'people').items.find((item: any) => item.label === 'Configuration');
    const localization = configuration.children.find((item: any) => item.label === 'Localization');
    expect(localization.children).toContainEqual(expect.objectContaining({ path: '/base-countries', label: 'Countries', permission: 'base.reference.read' }));
    const page = yaml('pages/countries.yaml');
    const api = yaml('api/countries.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'countries', route: '/base-countries' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'countries' });
    expect(discovered.pageDatasources.get('countries')).toEqual(['countries']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-countries', page: 'countries', module: 'base' }),
    ]));
  });

  test('seeds deterministic countries and supports search, empty, and transport error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_countries_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_countries_test_migrations', ['schema', 'data']);
    const source = yaml('api/countries.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 80);
    expect(rows.data).toHaveLength(12);
    expect(rows.data.slice(0, 3)).toEqual([
      { code: 'AU', name: 'Australia', currency_code: 'AUD' },
      { code: 'BR', name: 'Brazil', currency_code: 'BRL' },
      { code: 'CA', name: 'Canada', currency_code: 'CAD' },
    ]);
    expect((await repository.querySource(source, { q: 'Vietnam', fixture_state: null }, 0, 80)).data).toEqual([{ code: 'VN', name: 'Vietnam', currency_code: 'VND' }]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 80)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 80)).rejects.toMatchObject({ status: 503, code: 'BASE_COUNTRIES_UNAVAILABLE' });
    database.close();
  });

  test('keeps the Odoo country action read-only and permission guarded', () => {
    const page = yaml('pages/countries.yaml');
    const api = yaml('api/countries.yaml');
    expect(page.components[0].create_action).toBeUndefined();
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Country', 'Code']);
    expect(api.datasources[0].permission).toBe('base.reference.read');
    expect(api.actions).toEqual([expect.objectContaining({ id: 'view_country_from_localization', permission: 'base.reference.read' })]);
  });
});
