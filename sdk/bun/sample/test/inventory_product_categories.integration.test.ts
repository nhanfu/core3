import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = yaml('api/product-categories.yaml');
const detailApi = yaml('api/product-category-detail.yaml');
const page = yaml('pages/product-categories.yaml');
const detailPage = yaml('pages/product-category-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_product_categories_${crypto.randomUUID().replaceAll('-', '_')}`;
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
      ['product-categories', listApi.datasources.map((source: any) => source.id)],
      ['product-category-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['product-categories', { ...page, actions: listApi.actions }],
      ['product-category-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

describe('Inventory Product Categories Odoo action parity', () => {
  test('maps Configuration > Products > Categories to separate page/API contracts', () => {
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'product-categories' });
    expect(detailApi.page).toEqual({ id: 'product-category-detail' });
    expect(() => validatePageDefinition(listApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(detailApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: listApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detailPage, actions: detailApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/product-categories');
    expect(detailPage.page.route).toBe('/product-categories/detail');
    expect(listApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_categories', 'inventory_product_category_parents']);
    expect(detailApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_category_detail', 'inventory_product_category_children']);
    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(detailPage.page.auth.require).toEqual(['inventory.read']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_product_categories', create_action: 'create_inventory_product_category', row_open_action: 'view_inventory_product_category' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/product-categories', label: 'Categories', permission: 'inventory.read' }));
    expect(action('create_inventory_product_category')).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', permission: 'inventory.manage' });
    expect(action('view_inventory_product_category_products')).toMatchObject({ type: 'navigate', navigate_to: '/product-variants', permission: 'inventory.read' });
  });

  test('seeds deterministic hierarchy and descendant product counts', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_categories');
    const params = { q: null, current_company_name: 'Core3 Demo Company', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.complete_name)).toEqual([
      'All', 'All / Furniture', 'All / Furniture / Cabinets', 'All / Furniture / Desks', 'All / Office Supplies', 'All / Office Supplies / QA Empty Category',
    ]);
    expect((await repository.querySource(source, { ...params, q: 'desk' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['inventory-category-desks']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const furniture = (await repository.querySource(source, params, 0, 50)).data.find((row: any) => row.id === 'inventory-category-furniture');
    expect(furniture).toMatchObject({ parent_name: 'All', product_count: 3, child_count: 2 });
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_category_detail');
    expect(await repository.querySource(detail, { id: 'inventory-category-all', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { complete_name: 'All', product_count: 5, child_count: 2 } });
    const children = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_category_children');
    expect((await repository.querySource(children, { id: 'inventory-category-furniture' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Cabinets', 'Desks']);
    const variantSource = yaml('api/product-variants.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_product_variants');
    const variants = await repository.querySource(variantSource, { q: null, active: 'active', category_name: 'Furniture', product_type: null, tracking: null, current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 50);
    expect(variants.data).toHaveLength(3);
    expect(variants.data.map((row: any) => row.category_name).every((category: string) => category === 'Furniture')).toBe(true);
    database.close();
  });

  test('enforces manager CRUD, hierarchy guards, safe delete, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_product_category');
    const edit = action('edit_inventory_product_category');
    const values = { name: 'QA Lamps', parent_id: 'inventory-category-office' };
    const created = await repository.executeMutation(create.mutation, { id: 'inventory-category-qa-lamps', values });
    expect(created).toMatchObject({ id: 'inventory-category-qa-lamps', name: 'QA Lamps', parent_id: 'inventory-category-office', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-category-duplicate', values: { ...values, name: 'QA Lamps' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_CATEGORY_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-category-bad-parent', values: { name: 'Bad Parent', parent_id: 'missing-category' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_CATEGORY_PARENT_INVALID' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'QA Lamps Updated', parent_id: 'inventory-category-furniture' } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Lamps Updated', parent_id: 'inventory-category-furniture', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', parent_id: 'inventory-category-office' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'inventory-category-furniture', expected_row_version: 1, values: { name: 'Furniture', parent_id: 'inventory-category-desks' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_CATEGORY_CYCLE' });
    await expect(repository.executeMutation(action('delete_inventory_product_category').mutation, { id: 'inventory-category-furniture', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_CATEGORY_IN_USE' });
    await repository.executeMutation(action('delete_inventory_product_category').mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT id FROM inventory_product_categories WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('enforces read/manage permissions and survives a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-categories-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const manager = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Manager', roles: ['inventory_manager'], permissions: ['inventory.read', 'inventory.manage'] };
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    await first.repository.executeMutation(action('create_inventory_product_category').mutation, { id: 'inventory-category-restart', values: { name: 'Restart Category', parent_id: 'inventory-category-office' } });
    const readerApi = apiFor(first.repository, reader);
    expect((await readerApi(new Request('http://inventory.test/api/pages/product-categories'), new URL('http://inventory.test/api/pages/product-categories'))).status).toBe(200);
    await expect(readerApi(new Request('http://inventory.test/api/actions/inventory.product_categories.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { name: 'Reader Category' } }) }), new URL('http://inventory.test/api/actions/inventory.product_categories.create'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, parent_id, row_version FROM inventory_product_categories WHERE id = ?', ['inventory-category-restart'])).toEqual([{ id: 'inventory-category-restart', name: 'Restart Category', parent_id: 'inventory-category-office', row_version: 1 }]);
    const managerApi = apiFor(second.repository, manager);
    expect((await managerApi(new Request('http://inventory.test/api/pages/product-category-detail?id=inventory-category-restart'), new URL('http://inventory.test/api/pages/product-category-detail?id=inventory-category-restart'))).status).toBe(200);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
