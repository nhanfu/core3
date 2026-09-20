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
const listApi = yaml('api/product-templates.yaml');
const detailApi = yaml('api/product-template-detail.yaml');
const page = yaml('pages/product-templates.yaml');
const detailPage = yaml('pages/product-template-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_product_templates_${crypto.randomUUID().replaceAll('-', '_')}`;
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
      ['product-templates', listApi.datasources.map((source: any) => source.id)],
      ['product-template-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['product-templates', { ...page, actions: listApi.actions }],
      ['product-template-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

describe('Inventory Product Templates Odoo action parity', () => {
  test('maps Products to separate page/API contracts without duplicating variants', () => {
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'product-templates' });
    expect(detailApi.page).toEqual({ id: 'product-template-detail' });
    expect(() => validatePageDefinition(listApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(detailApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: listApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detailPage, actions: detailApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/products');
    expect(detailPage.page.route).toBe('/products/detail');
    expect(listApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_templates', 'inventory_product_template_categories', 'inventory_product_template_types']);
    expect(detailApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_template_detail', 'inventory_product_template_variants']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_product_templates', create_action: 'create_inventory_product_template', row_open_action: 'view_inventory_product_template' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'products').items)
      .toContainEqual(expect.objectContaining({ path: '/products', label: 'Products', permission: 'inventory.read' }));
    expect(action('create_inventory_product_template')).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', permission: 'inventory.manage' });
    expect(action('view_inventory_product_template_variants')).toMatchObject({ type: 'navigate', navigate_to: '/product-variants', permission: 'inventory.read' });
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
  });

  test('seeds deterministic templates and aggregates existing variant stock', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_templates');
    const params = { q: null, active: 'active', category_name: null, product_type: null, current_company_name: 'Core3 Demo Company', fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Customizable Desk', 'Storage Box', 'Large Cabinet', 'Corner Desk', 'Shared Consumable']);
    expect(rows.find((row: any) => row.id === 'inventory-template-large-cabinet')).toMatchObject({ variant_count: 1, on_hand: 500, forecasted: 270, tracking: 'lot' });
    expect(rows.find((row: any) => row.id === 'inventory-template-shared-consumable')).toMatchObject({ company_name: 'Shared', variant_count: 1, product_type: 'Consumable', is_storable: false });
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy Demo Product']);
    expect((await repository.querySource(source, { ...params, q: 'cab' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['inventory-template-large-cabinet']);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_template_detail');
    expect(await repository.querySource(detail, { id: 'inventory-template-large-cabinet' }, 0, 1)).toMatchObject({ data: { name: 'Large Cabinet', variant_count: 1, on_hand: 500 } });
    expect((await repository.querySource(detail, { id: 'inventory-template-large-cabinet', current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    const variants = await repository.querySource(detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_product_template_variants'), { id: 'inventory-template-large-cabinet' }, 0, 50);
    expect(variants.data).toEqual([expect.objectContaining({ name: 'Large Cabinet', default_code: 'E-COM07', on_hand: 500 })]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces manager CRUD, company/type guards, variant delete guard, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_product_template');
    const edit = action('edit_inventory_product_template');
    const values = { name: 'QA Product', default_code: 'QA-PRODUCT-001', barcode: '', description: 'QA', product_type: 'Goods', category_name: 'Furniture', unit_name: 'Units', company_name: 'Core3 Demo Company', active: true, is_favorite: false, sale_ok: true, purchase_ok: true, is_storable: true, tracking: 'none', sales_price: 50, standard_price: 20, weight: 1, volume: 0.1 };
    const created = await repository.executeMutation(create.mutation, { id: 'inventory-template-qa', current_company_name: 'Core3 Demo Company', values });
    expect(created).toMatchObject({ id: 'inventory-template-qa', name: 'QA Product', default_code: 'QA-PRODUCT-001', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-template-duplicate', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Duplicate Product' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_TEMPLATE_CODE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-template-service-lot', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Service Lot', default_code: 'SERVICE-LOT', product_type: 'Service', tracking: 'lot' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_TEMPLATE_TRACKING_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-template-other-company', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Other Company Product', default_code: 'OTHER-COMPANY', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_TEMPLATE_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'QA Product Updated', sales_price: 55 } });
    expect(edited).toMatchObject({ name: 'QA Product Updated', sales_price: 55, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Other Company', values: { ...values, name: 'Outside Company' } })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_PRODUCT_TEMPLATE_NOT_FOUND' });
    await expect(repository.executeMutation(action('delete_inventory_product_template').mutation, { id: 'inventory-template-large-cabinet', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_TEMPLATE_HAS_VARIANTS' });
    const archived = await repository.executeMutation(action('archive_inventory_product_template').mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(action('restore_inventory_product_template').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await repository.executeMutation(action('delete_inventory_product_template').mutation, { id: created.id, expected_row_version: 4 });
    expect(await repository.query('SELECT id FROM inventory_product_templates WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('enforces read/manage permissions and survives a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-templates-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const manager = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Manager', roles: ['inventory_manager'], permissions: ['inventory.read', 'inventory.manage'] };
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    await first.repository.executeMutation(action('create_inventory_product_template').mutation, { id: 'inventory-template-restart', current_company_name: 'Core3 Demo Company', values: { name: 'Restart Product', default_code: 'RESTART-PRODUCT', product_type: 'Goods', company_name: 'Core3 Demo Company' } });
    const readerApi = apiFor(first.repository, reader);
    expect((await readerApi(new Request('http://inventory.test/api/pages/product-templates'), new URL('http://inventory.test/api/pages/product-templates'))).status).toBe(200);
    await expect(readerApi(new Request('http://inventory.test/api/actions/inventory.product_templates.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { name: 'Reader Product' } }) }), new URL('http://inventory.test/api/actions/inventory.product_templates.create'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, default_code, row_version FROM inventory_product_templates WHERE id = ?', ['inventory-template-restart'])).toEqual([{ id: 'inventory-template-restart', name: 'Restart Product', default_code: 'RESTART-PRODUCT', row_version: 1 }]);
    const managerApi = apiFor(second.repository, manager);
    expect((await managerApi(new Request('http://inventory.test/api/pages/product-template-detail?id=inventory-template-restart'), new URL('http://inventory.test/api/pages/product-template-detail?id=inventory-template-restart'))).status).toBe(200);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
