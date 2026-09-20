import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Base reference data parity', () => {
  test('keeps the configuration landing page and API fragments joined by page.id', () => {
    const page = yaml('pages/reference-data.yaml');
    const api = yaml('api/reference-data.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'base-reference-data', route: '/base-reference-data', auth: { require: ['base.reference.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('base-reference-data')).toEqual(['reference_countries', 'currencies', 'languages', 'categories']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/base-reference-data', page: 'base-reference-data', module: 'base' });
    expect(api.actions.map((action: any) => action.id)).toEqual(['view_country', 'view_currency', 'view_language', 'view_category']);
  });

  test('serves reference lists and explicit empty/error boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'base_reference_data_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'base_reference_data_test_migrations', ['schema', 'data']);
    const api = yaml('api/reference-data.yaml');
    expect((await repository.querySource(api.datasources[0], { fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect((await repository.querySource(api.datasources[1], { fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    expect((await repository.querySource(api.datasources[0], { fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(api.datasources[2], { fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'BASE_REFERENCE_DATA_FORBIDDEN' });
    await expect(repository.querySource(api.datasources[3], { fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_REFERENCE_DATA_UNAVAILABLE' });
    database.close();
  });
});
