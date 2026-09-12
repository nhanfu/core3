import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const readYaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Categories parity', () => {
  test('joins the Odoo category page and API contracts', async () => {
    const page = await readYaml('pages/categories.yaml');
    const api = await readYaml('api/categories.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-categories', route: '/ecommerce/categories' });
    expect(api.page).toEqual({ id: 'ecommerce-categories' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_categories', create_action: 'create_ecommerce_category' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_categories', 'ecommerce_category_active']);
  });

  test('seeds deterministic categories and supports guarded CRUD contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_categories_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_categories_test', ['schema', 'data']);
    const api = await readYaml('api/categories.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null, active: true, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['All', 'Accessories', 'Office']);
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_ecommerce_category', permission: 'ecommerce.write' }),
      expect.objectContaining({ id: 'archive_ecommerce_category', permission: 'ecommerce.write' }),
      expect.objectContaining({ id: 'restore_ecommerce_category', permission: 'ecommerce.write' }),
    ]));
    expect(source.error_states.forbidden.status).toBe(403);
    database.close();
  });
});
