import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet Model Categories configuration parity', () => {
  test('records the installed Odoo action, list contract, and page/API join', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(config.items).toContainEqual({ path: '/fleet/config/model-categories', label: 'Categories', icon: 'car', permission: 'fleet.manage' });

    const page = yaml('pages/model-categories.yaml');
    const api = yaml('api/model-categories.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.route).toBe('/fleet/config/model-categories');
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_model_category_records' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(page.components[0].inline_edit).toMatchObject({ create_action: 'create_fleet_model_category_inline', update_action: 'update_fleet_model_category_inline' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('fleet-model-categories')).toContain('fleet_model_category_records');
    expect(api.datasources[0].permission).toBe('fleet.read');
    for (const entry of api.actions) expect(entry.permission).toBe('fleet.manage');
  });

  test('seeds the ten live Odoo categories deterministically and supports search/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_category_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_category_state_migrations', ['schema', 'data']);
    const source = yaml('api/model-categories.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(all.data).toHaveLength(10);
    expect(all.data.map((row: any) => row.name)).toEqual(['Sedan', 'Estate', 'Compact', 'SUV', 'Coupe', 'Convertible', 'MPU', 'BMX', 'VTT', 'City']);
    expect((await repository.querySource(source, { q: 'cou', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Coupe' }]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_MODEL_CATEGORIES_UNAVAILABLE' });
    database.close();
  });

  test('enforces manager CRUD, ordering, duplicate/blank validation, stale writes, and relation-protected delete', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_category_crud_migrations', ['schema', 'data']);
    const api = yaml('api/model-categories.yaml');
    const create = action(api, 'create_fleet_model_category_inline');
    const update = action(api, 'update_fleet_model_category_inline');
    const remove = action(api, 'delete_fleet_model_category');
    expect(create.permission).toBe('fleet.manage');
    expect(update.permission).toBe('fleet.manage');
    expect(remove.permission).toBe('fleet.manage');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.guards[1]).toMatchObject({ status: 409, code: 'FLEET_MODEL_CATEGORY_IN_USE' });

    const created = await repository.executeMutation(create.mutation, { values: { sequence: 5, name: 'Core3 Utility' } });
    expect(created).toMatchObject({ id: 'fleet-category-custom-core3-utility', sequence: 5, name: 'Core3 Utility', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'sedan' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_CATEGORY_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_MODEL_CATEGORY_NAME_REQUIRED' });

    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 15, name: 'Core3 Utility Updated' } });
    expect(edited).toMatchObject({ sequence: 15, name: 'Core3 Utility Updated', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 20, name: 'Stale category' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 2, values: { sequence: 20, name: 'Sedan' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_CATEGORY_EXISTS' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-category', expected_row_version: 1, values: { sequence: 20, name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_CATEGORY_NOT_FOUND' });

    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-category-003', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_CATEGORY_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_CATEGORY_NOT_FOUND' });
    database.close();
  });
});
