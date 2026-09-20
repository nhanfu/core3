import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const operation = (id: string) => [parsed('api/operation-types.yaml'), parsed('api/operation-type-detail.yaml')].flatMap((api: any) => api.actions ?? []).find((item: any) => item.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, `inventory_operation_types_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Operations Types Odoo action parity', () => {
  test('keeps the Configuration menu, page/API ownership, and Odoo views aligned', () => {
    const page = parsed('pages/operation-types.yaml');
    const detail = parsed('pages/operation-type-detail.yaml');
    const api = parsed('api/operation-types.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'operation-types', route: '/operation-types' });
    expect(detail.page).toMatchObject({ id: 'operation-type-detail', route: '/operation-types/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('operation-types')).toContain('inventory_operation_types');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operation-types', page: 'operation-types', module: 'inventory' }),
      expect.objectContaining({ path: '/operation-types/detail', page: 'operation-type-detail', module: 'inventory' }),
    ]));
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].create_action).toBe('create_inventory_operation_type');
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Sequence', 'Operation Type', 'Warehouse', 'Company', 'Active']);
    expect(parsed('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operation-types', label: 'Operations Types', permission: 'inventory.manage' }),
    ]));
    expect(detail.components[0].groups.map((group: any) => group.title)).toEqual(['General', 'Hardware']);
    expect(operation('create_inventory_operation_type').fields.map((field: any) => field.field)).toEqual(expect.arrayContaining(['operation_kind', 'source_location_id', 'destination_location_id']));
    expect(operation('edit_inventory_operation_type').mutation.fields).toEqual(expect.arrayContaining(['source_location_id', 'destination_location_id']));
  });

  test('seeds deterministic active and archived records and supports filters, empty, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_operation_types_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_operation_types_test_migrations', ['schema', 'data']);
    const source = parsed('api/operation-types.yaml').datasources[0];
    const params = { q: null, active: null, is_favorite: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.name)).toEqual(['Receipts', 'Deliveries', 'Internal Transfers', 'Quality Control']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy Dispatch']);
    expect((await repository.querySource(source, { ...params, q: 'WH-QC' }, 0, 50)).data[0]).toMatchObject({ name: 'Quality Control', code: 'WH-QC', default_location_src_name: 'Stock' });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_OPERATION_TYPES_UNAVAILABLE' });
    database.close();
  });

  test('supports permissioned CRUD, lifecycle guards, stale writes, and restart durability', async () => {
    const api = parsed('api/operation-types.yaml');
    const detailApi = parsed('api/operation-type-detail.yaml');
    expect(parsed('pages/operation-types.yaml').page.auth.require).toEqual(['inventory.manage']);
    expect(parsed('pages/operation-type-detail.yaml').page.auth.require).toEqual(['inventory.manage']);
    expect(api.datasources.every((source: any) => source.permission === 'inventory.manage')).toBe(true);
    expect([...api.actions, ...detailApi.actions].filter((item: any) => item.type !== 'navigate').every((item: any) => item.permission === 'inventory.manage')).toBe(true);
    expect(operation('edit_inventory_operation_type').mutation.concurrency.required).toBe(true);
    expect(operation('archive_inventory_operation_type').mutation.concurrency.required).toBe(true);
    expect(operation('create_inventory_operation_type').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_OPERATION_TYPE_CODE_EXISTS' }),
      expect.objectContaining({ status: 422, code: 'INVENTORY_OPERATION_TYPE_KIND_INVALID' }),
    ]));
    expect(operation('archive_inventory_operation_type').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'INVENTORY_OPERATION_TYPE_HAS_OPEN_TRANSFERS' }),
    ]));
    expect(operation('view_inventory_operation_type')).toMatchObject({ type: 'navigate', navigate_to: '/operation-types/detail' });

    const { database, repository } = await repositoryForTest();
    const create = operation('create_inventory_operation_type');
    const edit = operation('edit_inventory_operation_type');
    const archive = operation('archive_inventory_operation_type');
    const restore = operation('restore_inventory_operation_type');
    const values = {
      name: 'QA Cross Dock', code: 'WH-XDOCK', operation_kind: 'internal', source_location_id: 'location-stock',
      destination_location_id: 'location-transit', sequence_number: 55, warehouse_id: 'warehouse-main',
      company_name: 'My Company (San Francisco)', sequence_code: 'XDOCK', reservation_method: 'at_confirmation',
      create_backorder: 'ask', move_type: 'direct', use_create_lots: false, use_existing_lots: false,
      set_package_type: true, default_location_src_id: 'location-stock', default_location_dest_id: 'location-transit', active: true,
    };
    const lowPrivilegeUser = { sub: 'inventory-operator', email: 'operator@core3.local', name: 'Inventory Operator', roles: ['user'], permissions: ['inventory.read'] };
    const page = parsed('pages/operation-types.yaml');
    const apiForPermission = createYamlApi({
      repository, authProvider: { async getCurrentUser() { return lowPrivilegeUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((source: any) => [source.id, source])), pageSources: new Map([[page.page.id, api.datasources.map((source: any) => source.id)]]),
      pages: new Map([[page.page.id, { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-operation-types-test', eventStore: {}, topics: {},
    });
    await expect(apiForPermission(new Request('http://inventory.test/api/pages/operation-types', { headers: { Authorization: 'Bearer test-token' } }), new URL('http://inventory.test/api/pages/operation-types'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    await expect(apiForPermission(new Request('http://inventory.test/api/actions/inventory.operation_types.create', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/inventory.operation_types.create'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    const created = await repository.executeMutation(create.mutation, { id: 'operation-qa-cross-dock', values });
    expect(created).toMatchObject({ id: 'operation-qa-cross-dock', name: 'QA Cross Dock', code: 'WH-XDOCK', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Duplicate code' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_OPERATION_TYPE_CODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Invalid kind', code: 'WH-BAD', operation_kind: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_OPERATION_TYPE_KIND_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Missing locations', code: 'WH-MISSING', source_location_id: '' } })).rejects.toMatchObject({ status: 400, message: 'source_location_id is required' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'QA Cross Dock Updated', source_location_id: 'location-transit' } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Cross Dock Updated', source_location_id: 'location-transit', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale edit' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(archive.mutation, { id: 'operation-receipts', expected_row_version: 1, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_OPERATION_TYPE_HAS_OPEN_TRANSFERS' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await expect(repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 4, values: { active: true } })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_OPERATION_TYPE_NOT_FOUND' });
    database.close();

    const restartPath = `/tmp/core3-inventory-operation-types-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(restartPath);
    const restartValues = { ...values, name: 'QA Restart Type', code: 'WH-RESTART', sequence_code: 'RST' };
    const restartCreated = await first.repository.executeMutation(create.mutation, { id: 'operation-qa-restart', values: restartValues });
    await first.repository.executeMutation(edit.mutation, { id: restartCreated.id, expected_row_version: 1, values: { ...restartValues, name: 'QA Restart Type Updated' } });
    first.database.close();
    const second = await repositoryForTest(restartPath);
    expect((await second.repository.query('SELECT id, name, row_version, active FROM inventory_operation_types WHERE id = ?', ['operation-qa-restart']))[0]).toEqual({ id: 'operation-qa-restart', name: 'QA Restart Type Updated', row_version: 2, active: true });
    second.database.close();
    rmSync(restartPath, { force: true });
  });
});
