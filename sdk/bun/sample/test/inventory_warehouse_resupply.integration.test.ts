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
const source = (id: string) => parsed('api/warehouse-detail.yaml').datasources.find((item: any) => item.id === id);
const action = (id: string) => parsed('api/warehouse-detail.yaml').actions.find((item: any) => item.id === id);
const company = 'My Company (San Francisco)';

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, `inventory_warehouse_resupply_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Warehouse Resupply From Odoo parity', () => {
  test('keeps the Odoo warehouse setting, page/API split, and discovered detail route aligned', () => {
    const page = parsed('pages/warehouse-detail.yaml');
    const api = parsed('api/warehouse-detail.yaml');
    const viewSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_warehouse_views.xml', 'utf8');
    const modelSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_warehouse.py', 'utf8');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page.id).toBe('warehouse-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[1]).toMatchObject({ type: 'ListView', source: 'inventory_warehouse_resupply_warehouses' });
    expect(page.components[1].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'add_inventory_warehouse_resupply', permission: 'inventory.manage' }),
    ]));
    expect(api.datasources.map((item: any) => item.id)).toEqual(expect.arrayContaining([
      'inventory_warehouse_detail', 'inventory_warehouse_resupply_warehouses', 'inventory_warehouse_resupply_options',
    ]));
    expect(action('add_inventory_warehouse_resupply')).toMatchObject({ handler: 'yaml_mutation', permission: 'inventory.manage' });
    expect(action('remove_inventory_warehouse_resupply')).toMatchObject({ handler: 'yaml_mutation', permission: 'inventory.manage' });
    expect(viewSource).toContain('resupply_wh_ids');
    expect(viewSource).toContain("domain=\"[('id', '!=', id), ('company_id', '=', company_id)]\"");
    expect(modelSource).toContain("'stock_wh_resupply_table'");
    expect(modelSource).toContain("'Resupply From'");
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/warehouses/detail', page: 'warehouse-detail', module: 'inventory' }),
    ]));
  });

  test('seeds same-company links and filters options, empty, and outside-company states', async () => {
    const { database, repository } = await repositoryForTest();
    const links = source('inventory_warehouse_resupply_warehouses');
    const options = source('inventory_warehouse_resupply_options');
    expect((await repository.querySource(links, { id: 'warehouse-main', current_company_name: company, fixture_state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'warehouse-resupply-main-overflow', supplier_name: 'Overflow Warehouse', supplier_code: 'WH-OVERFLOW', company_name: company }),
    ]);
    expect((await repository.querySource(options, { id: 'warehouse-main', current_company_name: company }, 0, 50)).data).toEqual(expect.arrayContaining([
      { value: 'warehouse-overflow', label: 'Overflow Warehouse (WH-OVERFLOW)' },
    ]));
    expect((await repository.querySource(links, { id: 'warehouse-main', current_company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(links, { id: 'warehouse-main', current_company_name: company, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(links, { id: 'warehouse-main', current_company_name: company, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_WAREHOUSE_RESUPPLY_UNAVAILABLE' });
    database.close();
  });

  test('supports manager add/remove with same-company, actor, duplicate, and row-version guards', async () => {
    const { database, repository } = await repositoryForTest();
    const add = action('add_inventory_warehouse_resupply');
    const remove = action('remove_inventory_warehouse_resupply');
    expect(add.mutation.concurrency).toEqual({ required: true });
    expect(remove.mutation.concurrency).toEqual({ required: true });
    const actor = { current_company_name: company, current_user_id: 'user-admin', current_user_name: 'Admin User' };
    const created = await repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 1, ...actor });
    expect(created).toMatchObject({ id: 'warehouse-resupply-warehouse-overflow-warehouse-main', supplied_warehouse_id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', row_version: 1 });
    await expect(repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 2, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_RESUPPLY_EXISTS' });
    await expect(repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_RESUPPLY_STALE' });
    await expect(repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 2, current_company_name: 'Other Company', current_user_id: 'user-admin', current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_RESUPPLY_STALE' });
    await expect(repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 2, current_company_name: company, current_user_id: '', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_WAREHOUSE_RESUPPLY_ACTOR_REQUIRED' });
    await repository.executeMutation(remove.mutation, { id: 'warehouse-overflow', line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1, ...actor });
    expect((await repository.querySource(source('inventory_warehouse_resupply_warehouses'), { id: 'warehouse-overflow', current_company_name: company, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: 'warehouse-overflow', line_id: created.id, parent_expected_row_version: 3, expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_WAREHOUSE_RESUPPLY_LINK_STALE' });
    database.close();
  });

  test('keeps the relation and row versions durable across a file-backed restart and protects actions by permission', async () => {
    const databasePath = `/tmp/core3-inventory-warehouse-resupply-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const add = action('add_inventory_warehouse_resupply');
    await first.repository.executeMutation(add.mutation, { id: 'warehouse-overflow', supplier_warehouse_id: 'warehouse-main', parent_expected_row_version: 1, current_company_name: company, current_user_id: 'user-admin', current_user_name: 'Admin User' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect((await second.repository.querySource(source('inventory_warehouse_resupply_warehouses'), { id: 'warehouse-overflow', current_company_name: company, fixture_state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'warehouse-resupply-warehouse-overflow-warehouse-main', row_version: 1, supplier_name: 'Main Warehouse' }),
    ]);
    const page = parsed('pages/warehouse-detail.yaml');
    const api = parsed('api/warehouse-detail.yaml');
    const readOnly = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const apiForPermission = createYamlApi({
      repository: second.repository,
      authProvider: { async getCurrentUser() { return readOnly; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((item: any) => [item.id, item])), pageSources: new Map([[page.page.id, api.datasources.map((item: any) => item.id)]]),
      pages: new Map([[page.page.id, { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-warehouse-resupply-test', eventStore: {}, topics: {},
    });
    await expect(apiForPermission(new Request('http://inventory.test/api/actions/inventory.warehouses.resupply.add', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ values: { supplier_warehouse_id: 'warehouse-main' } }) }), new URL('http://inventory.test/api/actions/inventory.warehouses.resupply.add'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
