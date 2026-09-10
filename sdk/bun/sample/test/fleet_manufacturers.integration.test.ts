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

describe('Fleet Manufacturers configuration parity', () => {
  test('records the Odoo menu, view order, labels, and page/API joins', () => {
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(config.items).toContainEqual({ path: '/fleet/config/manufacturers', label: 'Manufacturers', icon: 'car', permission: 'fleet.manage' });

    const page = yaml('pages/manufacturers.yaml');
    const api = yaml('api/manufacturers.yaml');
    const detailPage = yaml('pages/manufacturer-detail.yaml');
    const detailApi = yaml('api/manufacturer-detail.yaml');
    const newPage = yaml('pages/manufacturer-new.yaml');
    const newApi = yaml('api/manufacturer-new.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card', 'form']);
    expect(page.components[0]).toMatchObject({ source: 'fleet_manufacturers', default_filters: { with_models: true }, create_action: 'new_fleet_manufacturer' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Name', 'Models', 'Active', '']);
    expect(page.components[0].filters).toEqual([
      { field: 'with_models', label: 'Manufacturers', options: [{ id: 'true', label: 'With Models' }] },
      { field: 'active', label: 'Status', options: [{ id: 'archived', label: 'Archived' }] },
    ]);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_manufacturer_detail', title_field: 'name', status_field: 'active' });
    expect(detailPage.components[0].stat_buttons).toEqual([{ id: 'view_fleet_manufacturer_models', label: 'Models', value_field: 'model_count', permission: 'fleet.read' }]);
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Name', 'Logo', 'Models', 'Active']);
    expect(newPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_manufacturer_new', initial_editing: true });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('fleet-manufacturers')).toContain('fleet_manufacturers');
    expect(discovered.pageDatasources.get('fleet-manufacturer-detail')).toContain('fleet_manufacturer_detail');
    expect(discovered.pageDatasources.get('fleet-manufacturer-new')).toContain('fleet_manufacturer_new');

    for (const entry of api.actions.filter((candidate: any) => candidate.id !== 'view_fleet_manufacturer' && candidate.id !== 'new_fleet_manufacturer')) {
      expect(entry.permission).toBe('fleet.manage');
    }
    expect(action(api, 'view_fleet_manufacturer')).toMatchObject({ permission: 'fleet.read', navigate_to: '/fleet/config/manufacturers/detail' });
    expect(action(newApi, 'create_fleet_manufacturer')).toMatchObject({ type: 'server_form', permission: 'fleet.manage', operation: 'insert', handler: 'yaml_mutation' });
  });

  test('seeds the live Odoo manufacturer volume and deterministic filter states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_manufacturer_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_manufacturer_state_migrations', ['schema', 'data']);
    const source = yaml('api/manufacturers.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, active: null, with_models: null, fixture_state: null }, 0, 100);
    expect(all.data).toHaveLength(67);
    expect(all.data.slice(0, 5).map((row: any) => row.name)).toEqual(['Abarth', 'Acura', 'Alfa', 'Audi', 'Austin']);
    expect(all.data.filter((row: any) => row.model_count > 0).map((row: any) => row.name)).toEqual(['Ford', 'Nissan', 'Renault', 'Toyota', 'Volkswagen']);

    const withModels = await repository.querySource(source, { q: null, active: null, with_models: 'true', fixture_state: null }, 0, 50);
    expect(withModels.data.map((row: any) => row.name)).toEqual(['Ford', 'Nissan', 'Renault', 'Toyota', 'Volkswagen']);
    expect((await repository.querySource(source, { q: 'ford', active: null, with_models: 'true', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Ford', model_count: 1, active_label: 'Active' }]);
    expect((await repository.querySource(source, { q: null, active: 'archived', with_models: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Archived Manufacturer', active: false }]);
    expect((await repository.querySource(source, { q: null, active: null, with_models: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, with_models: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_MANUFACTURERS_UNAVAILABLE' });

    const detail = yaml('api/manufacturer-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'fleet-brand-020', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Ford', model_count: 1 } });
    expect((await repository.querySource(detail, { id: 'missing-manufacturer', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'fleet-brand-020', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'FLEET_MANUFACTURER_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports manager CRUD, archive/restore, stale and protected-delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_manufacturer_crud_migrations', ['schema', 'data']);
    const listApi = yaml('api/manufacturers.yaml');
    const detailApi = yaml('api/manufacturer-detail.yaml');
    const newApi = yaml('api/manufacturer-new.yaml');
    const create = action(newApi, 'create_fleet_manufacturer');
    const edit = action(detailApi, 'edit_fleet_manufacturer');
    const archive = action(detailApi, 'archive_fleet_manufacturer');
    const restore = action(detailApi, 'unarchive_fleet_manufacturer');
    const remove = action(detailApi, 'delete_fleet_manufacturer');

    expect([create, edit, archive, restore, remove].every((entry: any) => entry.permission === 'fleet.manage')).toBe(true);
    expect(edit.mutation.concurrency.required).toBe(true);
    expect(archive.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.guards[1]).toMatchObject({ status: 409, code: 'FLEET_MANUFACTURER_IN_USE' });

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Core3 Motors', logo_abbr: 'CM' } });
    expect(created).toMatchObject({ name: 'Core3 Motors', model_count: 0, active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'core3 motors' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_MANUFACTURER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_MANUFACTURER_NAME_REQUIRED' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Core3 Automotive', logo_abbr: 'CA' } });
    expect(edited).toMatchObject({ name: 'Core3 Automotive', logo_abbr: 'CA', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Manufacturer' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-manufacturer', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_MANUFACTURER_NOT_FOUND' });

    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Core3 Automotive', active: 'archived', with_models: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false }]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Core3 Automotive', active: null, with_models: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ active: true }]);

    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-brand-020', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'FLEET_MANUFACTURER_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'FLEET_MANUFACTURER_NOT_FOUND' });
    database.close();
  });
});
