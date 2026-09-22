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
const api = yaml('api/storage-category-capacity.yaml');
const page = yaml('pages/storage-category-capacity.yaml');
const templateApi = yaml('api/product-template-detail.yaml');
const variantApi = yaml('api/product-variant-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_product_storage_capacity_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory product Storage Capacities action parity', () => {
  test('maps the Odoo product form action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'storage-category-capacity' });
    expect(discovered.pageDatasources.get('storage-category-capacity')).toEqual([
      'inventory_product_storage_capacities',
      'inventory_product_storage_categories',
      'inventory_product_storage_products',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/storage-categories/capacity', page: 'storage-category-capacity', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.multi_location']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_product_storage_capacities', create_action: 'create_inventory_product_storage_capacity' });
    expect(yaml('pages/product-template-detail.yaml').components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_inventory_product_template_storage_capacities', label: 'Storage Capacities', permission: 'inventory.multi_location' }));
    expect(yaml('pages/product-variant-detail.yaml').components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_product_variant_storage_capacities', label: 'Storage Capacities', permission: 'inventory.multi_location' }));
    expect(templateApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_product_template_storage_capacities', navigate_to: '/storage-categories/capacity', params: { product_template_id: '{state.inventory_product_template_detail.id}', current_company_name: '{state.inventory_product_template_detail.company_name}' } }));
    expect(variantApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_product_variant_storage_capacities', navigate_to: '/storage-categories/capacity', params: { product_id: '{state.inventory_product_variant_detail.id}', current_company_name: '{state.inventory_product_variant_detail.company_name}' } }));
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/product.py', 'utf8')).toContain("action = self.env[\"ir.actions.actions\"]._for_xml_id(\"stock.action_storage_category_capacity\")");
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml', 'utf8')).toContain('name="action_view_storage_category_capacity"');
  });

  test('filters durable capacity rules by variant/template and company', async () => {
    const { database, repository } = await repositoryForTest();
    const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_product_storage_capacities');
    expect((await repository.querySource(source, { product_id: 'inventory-variant-storage-box', product_template_id: null, current_company_name: 'My Company (San Francisco)', fixture_state: null, q: null }, 0, 50)).data).toMatchObject([
      { id: 'storage-bin-product-box', storage_category_name: 'Small Bin', product_name: '[E-COM08] Storage Box', quantity: 24 },
    ]);
    expect((await repository.querySource(source, { product_id: null, product_template_id: 'inventory-template-large-cabinet', current_company_name: 'Core3 Demo Company', fixture_state: null, q: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'storage-bulk-product-cabinet', product_name: '[E-COM07] Large Cabinet', quantity: 500 }),
    ]));
    expect((await repository.querySource(source, { product_id: null, product_template_id: 'inventory-template-large-cabinet', current_company_name: 'Other Company', fixture_state: null, q: null }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { product_id: 'inventory-variant-storage-box', product_template_id: null, current_company_name: 'My Company (San Francisco)', fixture_state: 'transport_error', q: null }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PRODUCT_STORAGE_CAPACITY_UNAVAILABLE' });
    database.close();
  });

  test('enforces manager CRUD, duplicate/category/product guards, stale writes, and restart persistence', async () => {
    const databasePath = `/tmp/core3-inventory-product-storage-capacity-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const create = action('create_inventory_product_storage_capacity');
    const update = action('edit_inventory_product_storage_capacity');
    const remove = action('delete_inventory_product_storage_capacity');
    expect(create.permission).toBe('inventory.manage');
    expect(update.permission).toBe('inventory.manage');
    expect(remove.permission).toBe('inventory.manage');
    const values = { storage_category_id: 'storage-bin', product_id: 'stock-report-cabinet', quantity: 8, unit_name: 'Units' };
    const created = await first.repository.executeMutation(create.mutation, { id: 'ignored', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'storage-capacity-product-stock-report-cabinet-storage-bin', product_name: '[E-COM07] Large Cabinet', quantity: 8, row_version: 1 });
    await expect(first.repository.executeMutation(create.mutation, { current_company_name: 'My Company (San Francisco)', values })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_STORAGE_CAPACITY_EXISTS' });
    const otherCategory = await first.repository.executeMutation(create.mutation, { current_company_name: 'My Company (San Francisco)', values: { ...values, storage_category_id: 'storage-archived' } });
    expect(otherCategory).toMatchObject({ storage_category_id: 'storage-archived', quantity: 8 });
    await expect(first.repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values: { ...values, product_id: 'inventory-variant-shared' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_STORAGE_CATEGORY_INVALID' });
    await expect(first.repository.executeMutation(create.mutation, { current_company_name: 'My Company (San Francisco)', values: { ...values, quantity: 0, storage_category_id: 'storage-archived' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_STORAGE_CAPACITY_INVALID' });
    const changed = await first.repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, quantity: 12 } });
    expect(changed).toMatchObject({ quantity: 12, row_version: 2 });
    await expect(first.repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, quantity: 14 } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_STORAGE_CAPACITY_STALE' });
    await first.repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company (San Francisco)' });
    expect(await first.repository.query('SELECT id FROM inventory_storage_category_capacities WHERE id = ?', [created.id])).toEqual([]);
    const persisted = await first.repository.executeMutation(update.mutation, { id: otherCategory.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, storage_category_id: 'storage-archived', quantity: 6 } });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, quantity FROM inventory_storage_category_capacities WHERE id = ?', [persisted.id])).toEqual([{ id: persisted.id, quantity: 6 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('keeps the route readable for multi-location users but denies manager mutations', async () => {
    const { database, repository } = await repositoryForTest();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.multi_location'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([['storage-category-capacity', api.datasources.map((source: any) => source.id)]]),
      pages: new Map([['storage-category-capacity', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage', 'inventory.multi_location'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    expect((await handler(new Request('http://inventory.test/api/pages/storage-category-capacity?product_id=stock-report-storage-box'), new URL('http://inventory.test/api/pages/storage-category-capacity?product_id=stock-report-storage-box'))).status).toBe(200);
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.product_storage_capacity.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { storage_category_id: 'storage-bin', product_id: 'stock-report-cabinet', quantity: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.product_storage_capacity.create'))).rejects.toMatchObject({ status: 403 });
    database.close();
  });
});
