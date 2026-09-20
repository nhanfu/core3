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
const listApi = yaml('api/storage-categories.yaml');
const detailApi = yaml('api/storage-category-detail.yaml');
const page = yaml('pages/storage-categories.yaml');
const detailPage = yaml('pages/storage-category-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_storage_categories_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Storage Categories Odoo action parity', () => {
  test('maps the Warehouse Management action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'storage-categories' });
    expect(detailApi.page).toEqual({ id: 'storage-category-detail' });
    expect(discovered.pageDatasources.get('storage-categories')).toEqual(['inventory_storage_categories']);
    expect(discovered.pageDatasources.get('storage-category-detail')).toEqual([
      'inventory_storage_category_detail',
      'inventory_storage_category_capacities',
      'inventory_storage_category_locations',
      'inventory_storage_category_products',
      'inventory_storage_category_package_types',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/storage-categories', page: 'storage-categories', module: 'inventory' }),
      expect.objectContaining({ path: '/storage-categories/detail', page: 'storage-category-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.multi_location']);
    expect(detailPage.page.auth.require).toEqual(['inventory.multi_location']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_storage_categories', create_action: 'create_inventory_storage_category', row_open_action: 'view_inventory_storage_category' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'LineItemGrid', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/storage-categories', label: 'Storage Categories', permission: 'inventory.multi_location' }));
    expect(action('add_inventory_storage_capacity')).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'inventory.manage' });
  });

  test('seeds deterministic categories, capacities, locations, and company scope', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_storage_categories');
    const params = { q: null, current_company_name: 'My Company (San Francisco)', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['storage-archived', 'storage-bulk', 'storage-bin']);
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_storage_category_detail');
    expect(await repository.querySource(detail, { id: 'storage-bin', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Small Bin', capacity_count: 1, location_count: 1 } });
    const capacities = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_storage_category_capacities');
    expect((await repository.querySource(capacities, { id: 'storage-bulk', current_company_name: 'Other Company' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'product', product_name: '[E-COM07] Large Cabinet', quantity: 500 }),
      expect.objectContaining({ kind: 'package', package_type_name: 'Pallet', quantity: 12 }),
    ]));
    const locations = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_storage_category_locations');
    expect((await repository.querySource(locations, { id: 'storage-bin', current_company_name: 'My Company (San Francisco)' }, 0, 50)).data).toMatchObject([{ id: 'location-stock-shelf-1', name: 'Shelf 1' }]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'storage-bulk', company_name: 'Visible to all companies' })]);
    database.close();
  });

  test('enforces manager CRUD, capacity rules, company scope, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_storage_category');
    const edit = action('edit_inventory_storage_category');
    const addCapacity = action('add_inventory_storage_capacity');
    const editCapacity = action('edit_inventory_storage_capacity');
    const removeCapacity = action('delete_inventory_storage_capacity');
    expect([...listApi.datasources, ...detailApi.datasources].filter((source: any) => !source.id.endsWith('_products') && !source.id.endsWith('_package_types')).every((source: any) => source.permission === 'inventory.multi_location')).toBe(true);
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.multi_location'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map([...listApi.datasources, ...detailApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map([['storage-categories', listApi.datasources.map((source: any) => source.id)], ['storage-category-detail', detailApi.datasources.map((source: any) => source.id)]]),
      pages: new Map([['storage-categories', { ...page, actions: listApi.actions }], ['storage-category-detail', { ...detailPage, actions: detailApi.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage', 'inventory.multi_location'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    expect((await handler(new Request('http://inventory.test/api/pages/storage-categories'), new URL('http://inventory.test/api/pages/storage-categories'))).status).toBe(200);
    const values = { name: 'QA Cold Storage', max_weight: 250, allow_new_product: 'same', company_name: 'My Company (San Francisco)' };
    const created = await repository.executeMutation(create.mutation, { id: 'storage-qa-cold', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'storage-qa-cold', name: 'QA Cold Storage', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'storage-duplicate', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Small Bin' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_STORAGE_CATEGORY_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'storage-other', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Other', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_STORAGE_CATEGORY_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'QA Cold Storage Updated', max_weight: 300 } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Cold Storage Updated', max_weight: 300, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const capacity = await repository.executeMutation(addCapacity.mutation, { id: created.id, parent_expected_row_version: 2, current_company_name: 'My Company (San Francisco)', values: { kind: 'product', product_id: 'stock-report-storage-box', package_type_name: '', quantity: 10, unit_name: 'Units' } });
    expect(capacity).toMatchObject({ id: `storage-capacity-${created.id}-1`, kind: 'product', quantity: 10, product_name: '[E-COM08] Storage Box' });
    const changed = await repository.executeMutation(editCapacity.mutation, { id: created.id, line_id: capacity.id, parent_expected_row_version: 3, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { kind: 'product', product_id: 'stock-report-storage-box', package_type_name: '', quantity: 15, unit_name: 'Units' } });
    expect(changed).toMatchObject({ quantity: 15, row_version: 2 });
    await expect(repository.executeMutation(editCapacity.mutation, { id: created.id, line_id: capacity.id, parent_expected_row_version: 4, expected_row_version: 1, values: { kind: 'product', product_id: 'stock-report-storage-box', package_type_name: '', quantity: 20, unit_name: 'Units' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_STORAGE_CAPACITY_STALE' });
    await expect(repository.executeMutation(action('delete_inventory_storage_category').mutation, { id: created.id, expected_row_version: 4, current_company_name: 'My Company (San Francisco)' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_STORAGE_CATEGORY_IN_USE' });
    await repository.executeMutation(removeCapacity.mutation, { id: created.id, line_id: capacity.id, parent_expected_row_version: 4, expected_row_version: 2 });
    await repository.executeMutation(action('delete_inventory_storage_category').mutation, { id: created.id, expected_row_version: 5, current_company_name: 'My Company (San Francisco)' });
    expect(await repository.query('SELECT id FROM inventory_storage_categories WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('persists storage category changes through restart and preserves shared scope', async () => {
    const databasePath = `/tmp/core3-inventory-storage-categories-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const create = action('create_inventory_storage_category');
    await first.repository.executeMutation(create.mutation, { id: 'storage-qa-restart', current_company_name: 'My Company (San Francisco)', values: { name: 'QA Restart Storage', max_weight: 80, allow_new_product: 'empty', company_name: 'My Company (San Francisco)' } });
    await first.repository.executeMutation(action('edit_inventory_storage_category').mutation, { id: 'storage-qa-restart', expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { name: 'QA Restart Storage Updated', max_weight: 90, allow_new_product: 'mixed', company_name: 'My Company (San Francisco)' } });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, row_version FROM inventory_storage_categories WHERE id = ?', ['storage-qa-restart'])).toEqual([{ id: 'storage-qa-restart', name: 'QA Restart Storage Updated', row_version: 2 }]);
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_storage_categories');
    expect((await second.repository.querySource(source, { q: null, current_company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'storage-bulk', company_name: 'Visible to all companies' })]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
