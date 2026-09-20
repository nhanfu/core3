import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = yaml('api/package-types.yaml');
const detailApi = yaml('api/package-type-detail.yaml');
const page = yaml('pages/package-types.yaml');
const detailPage = yaml('pages/package-type-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_package_types_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

function apiFor(repository: YamlRepository, user: any) {
  const sources = [...listApi.datasources, ...detailApi.datasources];
  return createYamlApi({
    repository,
    authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
    sources: new Map(sources.map((source: any) => [source.id, source])),
    pageSources: new Map([
      ['package-types', listApi.datasources.map((source: any) => source.id)],
      ['package-type-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['package-types', { ...page, actions: listApi.actions }],
      ['package-type-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

describe('Inventory Package Types Odoo action parity', () => {
  test('maps Delivery > Package Types to separate page and API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'package-types' });
    expect(detailApi.page).toEqual({ id: 'package-type-detail' });
    expect(discovered.pageDatasources.get('package-types')).toEqual(['inventory_package_types', 'inventory_package_type_uses']);
    expect(discovered.pageDatasources.get('package-type-detail')).toEqual(['inventory_package_type_detail', 'inventory_package_type_capacity_rules']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/package-types', page: 'package-types', module: 'inventory' }),
      expect.objectContaining({ path: '/package-types/detail', page: 'package-type-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(detailPage.page.auth.require).toEqual(['inventory.read']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_package_types', create_action: 'create_inventory_package_type', row_open_action: 'view_inventory_package_type' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/package-types', label: 'Package Types', permission: 'inventory.read' }));
    expect(action('create_inventory_package_type')).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', permission: 'inventory.manage' });
  });

  test('seeds source-shaped package uses, dimensions, contents, and company scope', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_package_types');
    const params = { q: null, current_company_name: 'Core3 Demo Company', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'package-type-pallet', 'package-type-box', 'package-type-disposable', 'package-type-shared', 'package-type-empty',
    ]);
    expect((await repository.querySource(source, { ...params, q: 'ship' }, 0, 50)).data).toMatchObject([{ id: 'package-type-disposable', name: 'Shipping Box' }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(source, { ...params, q: 'PACK-BOX' }, 0, 50)).toMatchObject({ data: [{ id: 'package-type-box', package_use: 'reusable', has_quants: false }] });
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_package_type_detail');
    expect(await repository.querySource(detail, { id: 'package-type-pallet', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Pallet', package_count: 2, capacity_count: 1, has_quants: true } });
    const capacities = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_package_type_capacity_rules');
    expect((await repository.querySource(capacities, { id: 'package-type-pallet', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ storage_category_name: 'Bulk Storage', quantity: 12 })]));
    expect((await repository.querySource(source, { ...params, current_company_name: 'My Company (San Francisco)' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['package-type-disposable', 'package-type-shared']);
    database.close();
  });

  test('enforces manager CRUD, source constraints, company scope, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_package_type');
    const edit = action('edit_inventory_package_type');
    const values = { name: 'QA Euro Crate', package_use: 'reusable', barcode: 'PACK-QA-EURO', packaging_length: 60, width: 40, height: 32, base_weight: 3, max_weight: 80, company_name: 'Core3 Demo Company' };
    const created = await repository.executeMutation(create.mutation, { id: 'package-type-qa-euro', current_company_name: 'Core3 Demo Company', values });
    expect(created).toMatchObject({ id: 'package-type-qa-euro', name: 'QA Euro Crate', package_use: 'reusable', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'package-type-duplicate', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Pallet' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_TYPE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'package-type-barcode-duplicate', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Other Crate', barcode: 'PACK-PALLET' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_TYPE_BARCODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'package-type-other-company', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Other Company Crate', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PACKAGE_TYPE_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(create.mutation, { id: 'package-type-negative', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Negative Crate', height: -1 } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PACKAGE_TYPE_DIMENSIONS_INVALID' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'QA Euro Crate Updated', max_weight: 90 } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Euro Crate Updated', max_weight: 90, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Stale Crate' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action('delete_inventory_package_type').mutation, { id: 'package-type-pallet', expected_row_version: 1, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_TYPE_IN_USE' });
    await repository.executeMutation(action('delete_inventory_package_type').mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company' });
    expect(await repository.query('SELECT id FROM inventory_package_types WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('enforces API permissions and persists changes across restart', async () => {
    const databasePath = `/tmp/core3-inventory-package-types-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const manager = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Manager', roles: ['inventory_manager'], permissions: ['inventory.read', 'inventory.manage'] };
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    const create = action('create_inventory_package_type');
    await first.repository.executeMutation(create.mutation, { id: 'package-type-restart', current_company_name: 'Core3 Demo Company', values: { name: 'Restart Tote', package_use: 'reusable', barcode: 'PACK-RESTART', packaging_length: 50, width: 40, height: 30, base_weight: 2, max_weight: 60, company_name: 'Core3 Demo Company' } });
    const readerApi = apiFor(first.repository, reader);
    expect((await readerApi(new Request('http://inventory.test/api/pages/package-types'), new URL('http://inventory.test/api/pages/package-types'))).status).toBe(200);
    await expect(readerApi(new Request('http://inventory.test/api/actions/inventory.package_types.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { name: 'Reader Crate', package_use: 'disposable', company_name: 'Core3 Demo Company' } }) }), new URL('http://inventory.test/api/actions/inventory.package_types.create'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, row_version FROM inventory_package_types WHERE id = ?', ['package-type-restart'])).toEqual([{ id: 'package-type-restart', name: 'Restart Tote', row_version: 1 }]);
    const managerApi = apiFor(second.repository, manager);
    expect((await managerApi(new Request('http://inventory.test/api/pages/package-type-detail?id=package-type-restart'), new URL('http://inventory.test/api/pages/package-type-detail?id=package-type-restart'))).status).toBe(200);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
