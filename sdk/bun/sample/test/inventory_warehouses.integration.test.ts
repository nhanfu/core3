import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/warehouses.yaml').actions.find((candidate: any) => candidate.id === id)
  ?? yaml('api/warehouse-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Inventory Warehouses Odoo action parity', () => {
  test('keeps list and detail layouts separate from page-id-matched API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/warehouses.yaml');
    const detailPage = yaml('pages/warehouse-detail.yaml');
    const listApi = yaml('api/warehouses.yaml');
    const detailApi = yaml('api/warehouse-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('warehouses')).toContain('inventory_warehouses');
    expect(discovered.pageDatasources.get('warehouse-detail')).toContain('inventory_warehouse_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/warehouses', page: 'warehouses', module: 'inventory' }),
      expect.objectContaining({ path: '/warehouses/detail', page: 'warehouse-detail', module: 'inventory' }),
    ]));

    expect(listPage.components[0]).toMatchObject({
      source: 'inventory_warehouses',
      create_action: 'create_inventory_warehouse',
      row_open_action: 'view_inventory_warehouse',
      row_double_click_action: 'view_inventory_warehouse',
    });
    expect(listPage.components[0].columns.map((column: any) => column.field)).toEqual([
      'name', 'code', 'address', 'company_name', 'location_count', 'state',
    ]);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_warehouse_detail', title_field: 'name', status_field: 'state' });
    expect(detailPage.components[0].groups.map((group: any) => group.title)).toEqual(['Warehouse', 'Warehouse Configuration']);
    expect(yaml('manifest.yaml')).toBeDefined();
  });

  test('seeds active and archived warehouses and covers search, filters, empty, detail, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_warehouses_read', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_warehouses_read', ['schema', 'data']);

    const source = yaml('api/warehouses.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, state: 'active', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['warehouse-main']);
    expect((await repository.querySource(source, { q: null, state: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['warehouse-overflow']);
    expect((await repository.querySource(source, { q: 'WH', state: 'all', fixture_state: null }, 0, 50)).data.map((row: any) => row.code)).toEqual(['WH', 'WH-OVERFLOW']);
    expect((await repository.querySource(source, { q: 'missing', state: 'all', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, state: 'all', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, state: 'active', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_WAREHOUSES_UNAVAILABLE' });

    const detail = yaml('api/warehouse-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'warehouse-main', fixture_state: null }, 0, 1)).data).toMatchObject({
      id: 'warehouse-main', name: 'Main Warehouse', code: 'WH', company_name: 'My Company (San Francisco)',
      reception_steps: 'one_step', delivery_steps: 'ship_only',
    });
    expect((await repository.querySource(detail, { id: 'warehouse-missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'warehouse-main', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_WAREHOUSE_DETAIL_UNAVAILABLE' });

    database.close();
  });

  test('enforces manager CRUD, Odoo field validation, lifecycle guards, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_warehouses_crud', ['schema', 'data']);
    const allActions = [...yaml('api/warehouses.yaml').actions, ...yaml('api/warehouse-detail.yaml').actions];
    for (const candidate of allActions.filter((item: any) => ['server', 'server_form'].includes(item.type))) {
      expect(candidate.permission, candidate.id).toBe('inventory.manage');
      expect(candidate.handler, candidate.id).toBe('yaml_mutation');
    }
    expect(action('back_to_inventory_warehouses')).toMatchObject({ type: 'navigate', permission: 'inventory.read', navigate_to: '/warehouses' });

    const create = action('create_inventory_warehouse');
    const values = { name: 'QA Warehouse', code: 'QA', address: 'Da Nang', company_name: 'My Company (San Francisco)', reception_steps: 'two_steps', delivery_steps: 'pick_ship', state: 'Active' };
    const created = await repository.executeMutation(create.mutation, { id: 'warehouse-qa', values });
    expect(created).toMatchObject({ id: 'warehouse-qa', name: 'QA Warehouse', code: 'QA', state: 'Active', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'warehouse-duplicate', values: { ...values, name: 'Duplicate', code: 'wh' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_CODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'warehouse-invalid-code', values: { ...values, code: 'TOO-LONG' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_WAREHOUSE_CODE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'warehouse-invalid-flow', values: { ...values, code: 'BAD', reception_steps: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_WAREHOUSE_RECEPTION_INVALID' });

    const edit = action('edit_inventory_warehouse');
    expect(edit.mutation.concurrency).toEqual({ required: true });
    const edited = await repository.executeMutation(edit.mutation, { id: 'warehouse-qa', expected_row_version: 1, values: { name: 'QA Warehouse Updated', code: 'QA2', address: 'Hue', reception_steps: 'three_steps', delivery_steps: 'pick_pack_ship' } });
    expect(edited).toMatchObject({ id: 'warehouse-qa', name: 'QA Warehouse Updated', code: 'QA2', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'warehouse-qa', expected_row_version: 1, values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'warehouse-missing', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_WAREHOUSE_NOT_FOUND' });

    const archive = action('archive_inventory_warehouse');
    await repository.executeMutation(archive.mutation, { id: 'warehouse-qa', expected_row_version: 2, values: { state: 'Archived' } });
    expect((await repository.querySource(yaml('api/warehouses.yaml').datasources[0], { q: 'QA Warehouse Updated', state: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ state: 'Archived' }]);
    const restore = action('restore_inventory_warehouse');
    await repository.executeMutation(restore.mutation, { id: 'warehouse-qa', expected_row_version: 3, values: { state: 'Active' } });
    expect((await repository.querySource(yaml('api/warehouses.yaml').datasources[0], { q: 'QA Warehouse Updated', state: 'active', fixture_state: null }, 0, 50)).data).toMatchObject([{ state: 'Active' }]);
    await expect(repository.executeMutation(archive.mutation, { id: 'warehouse-main', expected_row_version: 1, values: { state: 'Archived' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_HAS_OPEN_MOVES' });
    await expect(repository.executeMutation(action('delete_inventory_warehouse').mutation, { id: 'warehouse-main', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_IN_USE' });
    await repository.executeMutation(action('delete_inventory_warehouse').mutation, { id: 'warehouse-qa', expected_row_version: 4 });
    expect((await repository.querySource(yaml('api/warehouses.yaml').datasources[0], { q: 'QA Warehouse Updated', state: 'all', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(action('delete_inventory_warehouse').mutation, { id: 'warehouse-qa', expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_WAREHOUSE_NOT_FOUND' });

    database.close();
  });
});
