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
const listApi = yaml('api/product-variants.yaml');
const detailApi = yaml('api/product-variant-detail.yaml');
const page = yaml('pages/product-variants.yaml');
const detailPage = yaml('pages/product-variant-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_product_variants_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

function apiHandler(repository: YamlRepository, user: any) {
  const sources = [...listApi.datasources, ...detailApi.datasources];
  return createYamlApi({
    repository,
    authProvider: { async getCurrentUser() { return user; }, hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); } },
    sources: new Map(sources.map((source: any) => [source.id, source])),
    pageSources: new Map([
      ['product-variants', listApi.datasources.map((source: any) => source.id)],
      ['product-variant-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['product-variants', { ...page, actions: listApi.actions }],
      ['product-variant-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map(),
    workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {},
    topics: {},
    storage: yaml('storage.yaml'),
  });
}

describe('Inventory Product Variants Odoo action parity', () => {
  test('maps Product Variants to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'product-variants' });
    expect(detailApi.page).toEqual({ id: 'product-variant-detail' });
    expect(discovered.pageDatasources.get('product-variants')).toEqual([
      'inventory_product_variants',
      'inventory_product_variant_categories',
      'inventory_product_variant_types',
      'inventory_product_variant_tracking',
    ]);
    expect(discovered.pageDatasources.get('product-variant-detail')).toEqual([
      'inventory_product_variant_detail',
      'inventory_product_variant_stock',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/product-variants', page: 'product-variants', module: 'inventory' }),
      expect.objectContaining({ path: '/product-variants/detail', page: 'product-variant-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(detailPage.page.auth.require).toEqual(['inventory.read']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_product_variants', create_action: 'create_inventory_product_variant', row_open_action: 'view_inventory_product_variant' });
    expect(detailPage.components[0].header_actions.map((entry: any) => entry.id)).toEqual([
      'back_to_inventory_product_variants',
      'edit_inventory_product_variant',
      'archive_inventory_product_variant',
      'restore_inventory_product_variant',
      'delete_inventory_product_variant',
    ]);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'products').items)
      .toContainEqual(expect.objectContaining({ path: '/product-variants', label: 'Product Variants', permission: 'inventory.read' }));
  });

  test('seeds deterministic variants and scopes the stock-facing list by company and status', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_variants');
    const params = { q: null, active: 'active', product_type: null, tracking: null, current_company_name: 'Core3 Demo Company', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'inventory-variant-desk-white',
      'inventory-variant-corner-desk',
      'inventory-variant-cabinet',
      'inventory-variant-storage-box',
      'inventory-variant-shared',
    ]);
    expect((await repository.querySource(source, { ...params, q: 'E-COM07' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'inventory-variant-cabinet', on_hand: 500, forecasted: 270 }),
    ]);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'inventory-variant-archived', active: false }),
    ]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'inventory-variant-shared', company_name: 'Shared' }),
    ]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_variant_detail');
    expect(await repository.querySource(detail, { id: 'inventory-variant-desk-white', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ name: 'Customizable Desk (White, Custom)', variant_values: 'White, Custom', available_quantity: 65 }),
    });
    database.close();
  });

  test('enforces manager CRUD, company scope, archive/restore, delete guards, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_product_variant');
    const edit = action('edit_inventory_product_variant');
    const archive = action('archive_inventory_product_variant');
    const restore = action('restore_inventory_product_variant');
    const remove = action('delete_inventory_product_variant');
    expect([...listApi.datasources, ...detailApi.datasources].every((source: any) => source.permission === 'inventory.read')).toBe(true);
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    const values = {
      default_code: 'QA-VARIANT-001', barcode: '999000000001', name: 'QA Blue Mug', template_name: 'QA Mug', variant_values: 'Blue',
      company_name: 'Core3 Demo Company', category_name: 'Office Supplies', unit_name: 'Units', product_type: 'Goods', tracking: 'none',
      is_storable: true, active: true, is_favorite: false, sales_price: 15, standard_price: 7, on_hand: 0, reserved_quantity: 0,
      incoming_qty: 2, outgoing_qty: 0, forecasted: 2, weight: 0.4, volume: 0.01,
    };
    const created = await repository.executeMutation(create.mutation, { id: 'inventory-variant-qa', current_company_name: 'Core3 Demo Company', values });
    expect(created).toMatchObject({ id: 'inventory-variant-qa', default_code: 'QA-VARIANT-001', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-variant-duplicate', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Duplicate' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_VARIANT_CODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-variant-other', current_company_name: 'Core3 Demo Company', values: { ...values, default_code: 'OTHER-001', barcode: '', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_VARIANT_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'QA Blue Mug Updated', sales_price: 18 } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Blue Mug Updated', sales_price: 18, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Stale Update' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: { active: false } });
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'Core3 Demo Company', values: { active: true } });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4, current_company_name: 'Core3 Demo Company' });
    expect(await repository.query('SELECT id FROM inventory_product_variants WHERE id = ?', [created.id])).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: 'inventory-variant-cabinet', expected_row_version: 1, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_VARIANT_IN_USE' });
    database.close();
  });

  test('keeps read access separate from manager mutations and survives restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-variants-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const handler = apiHandler(first.repository, { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] });
    expect((await handler(new Request('http://inventory.test/api/pages/product-variants'), new URL('http://inventory.test/api/pages/product-variants'))).status).toBe(200);
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.product_variants.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: {} }) }), new URL('http://inventory.test/api/actions/inventory.product_variants.create'))).rejects.toMatchObject({ status: 403 });
    await first.repository.executeMutation(action('create_inventory_product_variant').mutation, {
      id: 'inventory-variant-restart', current_company_name: 'Core3 Demo Company', values: {
        default_code: 'RESTART-001', name: 'Restart Variant', template_name: 'Restart Product', company_name: 'Core3 Demo Company',
        product_type: 'Goods', tracking: 'none', is_storable: true, active: true, sales_price: 1, standard_price: 1,
      },
    });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, row_version FROM inventory_product_variants WHERE id = ?', ['inventory-variant-restart'])).toEqual([
      { id: 'inventory-variant-restart', name: 'Restart Variant', row_version: 1 },
    ]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
