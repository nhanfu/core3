import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => readFileSync(join(serviceRoot, file), 'utf8');
const parsed = (file: string) => Bun.YAML.parse(yaml(file)) as any;
const action = (id: string) => parsed('api/locations.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Inventory Locations Odoo action parity', () => {
  test('keeps list and form layout YAML-only and joins API sources by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = parsed('pages/locations.yaml');
    const detailPage = parsed('pages/location-detail.yaml');
    const api = parsed('api/locations.yaml');
    const detailApi = parsed('api/location-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'locations', route: '/locations' });
    expect(detailPage.page).toMatchObject({ id: 'location-detail', route: '/locations/detail' });
    expect(api.page.id).toBe('locations');
    expect(detailApi.page.id).toBe('location-detail');
    expect(discovered.pageDatasources.get('locations')).toEqual(expect.arrayContaining(['inventory_locations']));
    expect(discovered.pageDatasources.get('location-detail')).toEqual(expect.arrayContaining(['inventory_location_detail']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/locations', page: 'locations', module: 'inventory' }),
      expect.objectContaining({ path: '/locations/detail', page: 'location-detail', module: 'inventory' }),
    ]));

    const list = listPage.components[0];
    expect(list).toMatchObject({ source: 'inventory_locations', create_action: 'create_inventory_location', row_open_action: 'view_inventory_location', row_double_click_action: 'view_inventory_location' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form']);
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ card: { title: 'complete_name', subtitle: 'usage' } });
    expect(list.form_view).toEqual({ page: 'apps/services/inventory/pages/location-detail.yaml', side_panel: false });
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ mobile: false });
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: false });
    expect(action('view_inventory_location')).toMatchObject({ type: 'navigate', permission: 'inventory.read', navigate_to: '/locations/detail', params: { id: '{row.id}' } });
    expect(list.columns.map((column: any) => column.field)).toEqual(['complete_name', 'usage', 'company_name', 'warehouse_name', 'is_empty', 'active', 'id']);
    expect(parsed('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/locations', label: 'Locations', permission: 'inventory.read' }),
    ]));
  });

  test('seeds deterministic hierarchy and covers search, filters, empty, detail, CRUD, and guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_locations_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_locations_test_migrations', ['schema', 'data']);

    const source = parsed('api/locations.yaml').datasources.find((item: any) => item.id === 'inventory_locations');
    const internal = await repository.querySource(source, { q: null, usage: null, active: null, warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50);
    expect(internal.data.length).toBe(8);
    expect(internal.data.every((row: any) => row.usage === 'Internal' && row.active === true)).toBe(true);
    expect(internal.data.map((row: any) => row.complete_name)).toEqual([
      'WH/Input/Order Processing',
      'WH/Input/Order Processing/Dispatch Zone',
      'WH/Input/Order Processing/Dispatch Zone/Gate A',
      'WH/Input/Order Processing/Dispatch Zone/Gate B',
      'WH/Stock',
      'WH/Stock/Shelf 1',
      'WH/Stock/Shelf 2',
      'WH/Stock/Shelf 2/Small Refrigerator',
    ]);
    expect((await repository.querySource(source, { q: 'SHELF-1', usage: 'all', active: 'all', warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['location-stock-shelf-1']);
    expect((await repository.querySource(source, { q: 'missing', usage: 'all', active: 'all', warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, usage: null, active: null, warehouse_id: null, is_empty: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, usage: 'Supplier', active: 'active', warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Vendors']);
    expect((await repository.querySource(source, { q: null, usage: 'all', active: 'archived', warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['location-archived', 'location-overflow-stock']);

    const detail = parsed('api/location-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'location-stock-shelf-1', fixture_state: null }, 0, 1)).data).toMatchObject({ id: 'location-stock-shelf-1', name: 'Shelf 1', complete_name: 'WH/Stock/Shelf 1', parent_location_name: 'WH/Stock', removal_strategy: 'FIFO' });
    expect((await repository.querySource(detail, { id: 'location-missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const created = await repository.executeMutation(action('create_inventory_location').mutation, { values: { warehouse_id: 'warehouse-main', parent_location_id: 'location-stock', name: 'Quality Review', code: 'QUALITY', usage: 'Internal', company_name: 'My Company (San Francisco)', replenish_location: false, cyclic_inventory_frequency: 0, removal_strategy: '' } });
    expect(created).toMatchObject({ name: 'Quality Review', code: 'QUALITY', usage: 'Internal', active: true, state: 'Active', row_version: 1 });
    await expect(repository.executeMutation(action('create_inventory_location').mutation, { values: { warehouse_id: 'warehouse-main', name: 'Duplicate', code: 'QUALITY', usage: 'Internal' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOCATION_CODE_EXISTS' });
    await expect(repository.executeMutation(action('create_inventory_location').mutation, { values: { warehouse_id: 'warehouse-main', name: 'Bad Usage', code: 'BAD-USAGE', usage: 'Bogus' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_LOCATION_USAGE_INVALID' });
    await expect(repository.executeMutation(action('create_inventory_location').mutation, { values: { warehouse_id: 'warehouse-main', name: 'Bad Parent', code: 'BAD-PARENT', usage: 'Internal', parent_location_id: 'location-archived' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_LOCATION_PARENT_INVALID' });

    const edited = await repository.executeMutation(action('edit_inventory_location').mutation, { id: created.id, expected_row_version: 1, values: { warehouse_id: 'warehouse-main', parent_location_id: 'location-stock', name: 'Quality Review Updated', code: 'QUALITY-2', usage: 'Internal', company_name: 'My Company (San Francisco)', replenish_location: true, cyclic_inventory_frequency: 14, removal_strategy: 'FIFO' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Quality Review Updated', code: 'QUALITY-2', row_version: 2 });
    await expect(repository.executeMutation(action('edit_inventory_location').mutation, { id: created.id, expected_row_version: 1, values: { warehouse_id: 'warehouse-main', name: 'Stale', code: 'STALE', usage: 'Internal' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action('edit_inventory_location').mutation, { id: 'location-missing', expected_row_version: 1, values: { warehouse_id: 'warehouse-main', name: 'Missing', code: 'MISSING', usage: 'Internal' } })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOCATION_NOT_FOUND' });

    await repository.executeMutation(action('delete_inventory_location').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Quality Review Updated', usage: 'all', active: 'all', warehouse_id: null, is_empty: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(action('delete_inventory_location').mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOCATION_NOT_FOUND' });
    await expect(repository.executeMutation(action('delete_inventory_location').mutation, { id: 'location-stock', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOCATION_IN_USE' });
    await expect(repository.executeMutation(action('archive_inventory_location').mutation, { id: 'location-stock', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOCATION_HAS_STOCK' });

    database.close();
  });

  test('keeps read/manage permissions, transport errors, and concurrency contracts explicit', () => {
    const listApi = parsed('api/locations.yaml');
    const detailApi = parsed('api/location-detail.yaml');
    expect(parsed('pages/locations.yaml').page.auth.require).toEqual(['inventory.read']);
    expect(parsed('pages/location-detail.yaml').page.auth.require).toEqual(['inventory.read']);
    for (const source of [...listApi.datasources, ...detailApi.datasources]) {
      expect(source.permission, source.id).toBe('inventory.read');
      expect(source.error_states?.transport_error?.status ?? source.id).toBe(source.id === 'inventory_location_usage_options' || source.id === 'inventory_location_warehouses' ? source.id : 503);
    }
    for (const id of ['create_inventory_location', 'edit_inventory_location', 'archive_inventory_location', 'delete_inventory_location']) {
      expect(action(id).permission, id).toBe('inventory.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_inventory_location').mutation.concurrency.required).toBe(true);
    expect(action('delete_inventory_location').mutation.concurrency.required).toBe(true);
    expect(action('create_inventory_location').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_LOCATION_CODE_EXISTS' }),
      expect.objectContaining({ status: 422, code: 'INVENTORY_LOCATION_PARENT_INVALID' }),
    ]));
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'INVENTORY_LOCATION_DETAIL_UNAVAILABLE' });
  });
});
