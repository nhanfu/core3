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

describe('Fleet Models configuration parity', () => {
  test('records the Odoo action, grouping, labels, and page/API joins', () => {
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual({ path: '/fleet/config/models', label: 'Models', icon: 'car', permission: 'fleet.manage' });

    const page = yaml('pages/models.yaml');
    const api = yaml('api/models.yaml');
    const detailPage = yaml('pages/model-detail.yaml');
    const detailApi = yaml('api/model-detail.yaml');
    const newPage = yaml('pages/model-new.yaml');
    const newApi = yaml('api/model-new.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.page.route).toBe('/fleet/config/models');
    expect(page.components[0]).toMatchObject({ source: 'fleet_models', default_group_by: 'brand_name', create_action: 'new_fleet_model' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Manufacturer', 'Model name', 'Vehicles', 'Category', 'Vehicle Type', 'Active', '']);
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'card', 'form']);
    expect(page.components[0].group_by).toEqual([
      { field: 'brand_name', label: 'Manufacturers' },
      { field: 'category_name', label: 'Category' },
      { field: 'vehicle_type_label', label: 'Vehicle Type' },
    ]);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_model_detail', title_field: 'name', subtitle_field: 'brand_name' });
    expect(detailPage.components[0].stat_buttons).toEqual([{ id: 'view_fleet_model_vehicles', label: 'Vehicles', value_field: 'vehicle_count', permission: 'fleet.read' }]);
    expect(detailPage.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['Information', 'Vendors']);
    expect(newPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_model_new', initial_editing: true });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('fleet-models')).toEqual(expect.arrayContaining(['fleet_model_manufacturers', 'fleet_model_categories', 'fleet_models']));
    expect(discovered.pageDatasources.get('model-detail')).toContain('fleet_model_detail');
    expect(discovered.pageDatasources.get('model-new')).toContain('fleet_model_new');
    expect(action(api, 'view_fleet_model')).toMatchObject({ permission: 'fleet.read', navigate_to: '/fleet/config/models/detail' });
    expect(action(newApi, 'create_fleet_model')).toMatchObject({ type: 'server_form', permission: 'fleet.manage', operation: 'insert', handler: 'yaml_mutation' });
    for (const definition of [api, detailApi, newApi]) {
      for (const entry of definition.actions.filter((candidate: any) => !['view_fleet_model', 'back_to_fleet_models', 'view_fleet_model_vehicles', 'new_fleet_model'].includes(candidate.id))) expect(entry.permission).toBe('fleet.manage');
    }
  });

  test('seeds Odoo model volume, relations, search/filter states, and errors deterministically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_state_migrations', ['schema', 'data']);
    const api = yaml('api/models.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'fleet_models');
    const active = await repository.querySource(source, { q: null, active: null, contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: null }, 0, 50);
    expect(active.data).toHaveLength(5);
    expect(active.data.map((row: any) => `${row.brand_name}/${row.name}`)).toEqual(['Ford/Focus', 'Nissan/Micra', 'Renault/Clio', 'Toyota/Corolla TS', 'Volkswagen/Golf 8']);
    expect((await repository.querySource(source, { q: 'ford', active: null, contains_vehicle: 'true', vehicle_type: 'car', category_id: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ brand_name: 'Ford', name: 'Focus', vehicle_count: 1, vehicle_type_label: 'Car' }]);
    expect((await repository.querySource(source, { q: null, active: 'archived', contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Legacy 4x4', active: false }]);
    expect((await repository.querySource(source, { q: null, active: null, contains_vehicle: null, vehicle_type: null, category_id: 'fleet-category-003', fixture_state: null }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { q: null, active: null, contains_vehicle: 'true', vehicle_type: null, category_id: null, fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(source, { q: null, active: null, contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_MODELS_UNAVAILABLE' });

    const detail = yaml('api/model-detail.yaml').datasources.find((entry: any) => entry.id === 'fleet_model_detail');
    expect(await repository.querySource(detail, { id: 'fleet-model-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Focus', brand_name: 'Ford', category_name: 'Sedan', default_fuel_type: 'diesel' } });
    expect((await repository.querySource(detail, { id: 'missing-model', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'fleet-model-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'FLEET_MODEL_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports manager CRUD, relation guards, archive/restore, stale, and in-use delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_crud_migrations', ['schema', 'data']);
    const listApi = yaml('api/models.yaml');
    const detailApi = yaml('api/model-detail.yaml');
    const newApi = yaml('api/model-new.yaml');
    const create = action(newApi, 'create_fleet_model');
    const edit = action(detailApi, 'edit_fleet_model');
    const archive = action(detailApi, 'archive_fleet_model');
    const restore = action(detailApi, 'unarchive_fleet_model');
    const remove = action(detailApi, 'delete_fleet_model');

    const created = await repository.executeMutation(create.mutation, { values: { brand_id: 'fleet-brand-001', category_id: 'fleet-category-003', name: 'Core3 Scout', vehicle_type: 'car', seats: 5, doors: 5, default_fuel_type: 'gasoline' } });
    expect(created).toMatchObject({ name: 'Core3 Scout', brand_id: 'fleet-brand-001', row_version: 1, active: true });
    expect((await repository.query('SELECT model_count FROM fleet_vehicle_model_brands WHERE id = ?', ['fleet-brand-001']))[0].model_count).toBe(1);
    await expect(repository.executeMutation(create.mutation, { values: { brand_id: 'fleet-brand-001', name: 'core3 scout', vehicle_type: 'car' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { brand_id: 'missing-brand', name: 'Missing Brand', vehicle_type: 'car' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_MANUFACTURER_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: { brand_id: 'fleet-brand-001', name: 'Negative', vehicle_type: 'car', seats: -1 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_MODEL_METRICS_INVALID' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { brand_id: 'fleet-brand-002', category_id: 'fleet-category-003', name: 'Core3 Scout Updated', vehicle_type: 'car' } });
    expect(edited).toMatchObject({ name: 'Core3 Scout Updated', brand_id: 'fleet-brand-002', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { brand_id: 'fleet-brand-002', name: 'Stale model', vehicle_type: 'car' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-model', expected_row_version: 1, values: { brand_id: 'fleet-brand-002', name: 'Missing', vehicle_type: 'car' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_NOT_FOUND' });

    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(listApi.datasources.find((entry: any) => entry.id === 'fleet_models'), { q: 'Core3 Scout Updated', active: 'archived', contains_vehicle: null, vehicle_type: null, category_id: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false }]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-model-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_NOT_FOUND' });
    database.close();
  });
});
