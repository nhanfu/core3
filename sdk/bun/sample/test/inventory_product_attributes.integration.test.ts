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
const listApi = yaml('api/product-attributes.yaml');
const detailApi = yaml('api/product-attribute-detail.yaml');
const page = yaml('pages/product-attributes.yaml');
const detailPage = yaml('pages/product-attribute-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_product_attributes_${crypto.randomUUID().replaceAll('-', '_')}`;
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
      ['product-attributes', listApi.datasources.map((source: any) => source.id)],
      ['product-attribute-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['product-attributes', { ...page, actions: listApi.actions }],
      ['product-attribute-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

describe('Inventory Product Attributes Odoo action parity', () => {
  test('maps Configuration > Products > Attributes to separate page/API contracts', () => {
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'product-attributes' });
    expect(detailApi.page).toEqual({ id: 'product-attribute-detail' });
    expect(() => validatePageDefinition(listApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(detailApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: listApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detailPage, actions: detailApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/attributes');
    expect(detailPage.page.route).toBe('/attributes/detail');
    expect(listApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_attributes']);
    expect(detailApi.datasources.map((source: any) => source.id)).toEqual(['inventory_product_attribute_detail', 'inventory_product_attribute_values']);
    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(detailPage.page.auth.require).toEqual(['inventory.read']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_product_attributes', create_action: 'create_inventory_product_attribute', row_open_action: 'view_inventory_product_attribute' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/attributes', label: 'Attributes', permission: 'inventory.read' }));
    expect(action('create_inventory_product_attribute')).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', permission: 'inventory.manage' });
    expect(action('create_inventory_product_attribute_value')).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', permission: 'inventory.manage' });
  });

  test('seeds deterministic attributes and source-shaped values', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources[0];
    const params = { q: null, active: 'active', current_company_name: 'Core3 Demo Company', fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Color', 'Size', 'Material']);
    expect(rows.find((row: any) => row.id === 'inventory-attribute-color')).toMatchObject({ display_type: 'color', create_variant: 'always', value_count: 2, related_product_count: 3 });
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy Finish']);
    const detail = detailApi.datasources[0];
    expect(await repository.querySource(detail, { id: 'inventory-attribute-color' }, 0, 1)).toMatchObject({ data: { name: 'Color', display_type: 'color', value_count: 2 } });
    const values = await repository.querySource(detailApi.datasources[1], { id: 'inventory-attribute-color', active: 'active' }, 0, 50);
    expect(values.data.map((row: any) => row.name)).toEqual(['Red', 'Blue']);
    expect(values.data[1]).toMatchObject({ html_color: '#2563eb', default_extra_price: 1.5, used_on_products: true });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces manager CRUD, Odoo variant guards, in-use guards, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_product_attribute');
    const edit = action('edit_inventory_product_attribute');
    const valueCreate = action('create_inventory_product_attribute_value');
    const created = await repository.executeMutation(create.mutation, { id: 'inventory-attribute-qa', values: { name: 'Finish', display_type: 'radio', create_variant: 'dynamic', company_name: 'Shared' } });
    expect(created).toMatchObject({ id: 'inventory-attribute-qa', name: 'Finish', create_variant: 'dynamic', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-attribute-dup', values: { name: 'finish', display_type: 'radio', create_variant: 'always', company_name: 'Shared' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ATTRIBUTE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-attribute-bad', values: { name: 'Bad Multi', display_type: 'multi', create_variant: 'always', company_name: 'Shared' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_ATTRIBUTE_MULTI_VARIANT_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-attribute-company', values: { name: 'Company Scoped', display_type: 'radio', create_variant: 'always', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_ATTRIBUTE_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Finish Updated', display_type: 'pills', create_variant: 'dynamic' } });
    expect(edited).toMatchObject({ name: 'Finish Updated', display_type: 'pills', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', display_type: 'radio', create_variant: 'dynamic' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'inventory-attribute-color', expected_row_version: 1, values: { name: 'Color', display_type: 'radio', create_variant: 'dynamic' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ATTRIBUTE_VARIANT_LOCKED' });
    await expect(repository.executeMutation(action('archive_inventory_product_attribute').mutation, { id: 'inventory-attribute-color', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ATTRIBUTE_IN_USE' });
    const value = await repository.executeMutation(valueCreate.mutation, { id: 'inventory-attribute-qa-value', values: { attribute_id: created.id, name: 'Matte', default_extra_price: 3.25 } });
    expect(value).toMatchObject({ id: 'inventory-attribute-qa-value', attribute_id: created.id, name: 'Matte', row_version: 1 });
    await expect(repository.executeMutation(valueCreate.mutation, { id: 'inventory-attribute-dup-value', values: { attribute_id: created.id, name: 'matte' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ATTRIBUTE_VALUE_EXISTS' });
    await expect(repository.executeMutation(action('delete_inventory_product_attribute_value').mutation, { id: 'inventory-attribute-color-red', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ATTRIBUTE_VALUE_IN_USE' });
    await repository.executeMutation(action('delete_inventory_product_attribute_value').mutation, { id: value.id, expected_row_version: 1 });
    await repository.executeMutation(action('archive_inventory_product_attribute').mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(await repository.query('SELECT active FROM inventory_product_attributes WHERE id = ?', [created.id])).toEqual([{ active: false }]);
    await repository.executeMutation(action('restore_inventory_product_attribute').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    await repository.executeMutation(action('delete_inventory_product_attribute').mutation, { id: created.id, expected_row_version: 4 });
    expect(await repository.query('SELECT id FROM inventory_product_attributes WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('enforces read/manage permissions and persists across a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-attributes-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const manager = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Manager', roles: ['inventory_manager'], permissions: ['inventory.read', 'inventory.manage'] };
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    await first.repository.executeMutation(action('create_inventory_product_attribute').mutation, { id: 'inventory-attribute-restart', values: { name: 'Restart Attribute', display_type: 'select', create_variant: 'always', company_name: 'Shared' } });
    const readerApi = apiFor(first.repository, reader);
    expect((await readerApi(new Request('http://inventory.test/api/pages/product-attributes'), new URL('http://inventory.test/api/pages/product-attributes'))).status).toBe(200);
    await expect(readerApi(new Request('http://inventory.test/api/actions/inventory.product_attributes.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { name: 'Reader Attribute' } }) }), new URL('http://inventory.test/api/actions/inventory.product_attributes.create'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, display_type, row_version FROM inventory_product_attributes WHERE id = ?', ['inventory-attribute-restart'])).toEqual([{ id: 'inventory-attribute-restart', name: 'Restart Attribute', display_type: 'select', row_version: 1 }]);
    const managerApi = apiFor(second.repository, manager);
    expect((await managerApi(new Request('http://inventory.test/api/pages/product-attribute-detail?id=inventory-attribute-restart'), new URL('http://inventory.test/api/pages/product-attribute-detail?id=inventory-attribute-restart'))).status).toBe(200);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
