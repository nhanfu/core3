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
const listApi = yaml('api/putaway-rules.yaml');
const detailApi = yaml('api/putaway-rule-detail.yaml');
const page = yaml('pages/putaway-rules.yaml');
const detailPage = yaml('pages/putaway-rule-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_putaway_rules_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Putaway Rules Odoo action parity', () => {
  test('maps the Warehouse Management action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'putaway-rules' });
    expect(detailApi.page).toEqual({ id: 'putaway-rule-detail' });
    expect(discovered.pageDatasources.get('putaway-rules')).toEqual([
      'inventory_putaway_rules', 'inventory_putaway_products', 'inventory_putaway_categories',
      'inventory_putaway_locations', 'inventory_putaway_storage_categories', 'inventory_putaway_package_types',
    ]);
    expect(discovered.pageDatasources.get('putaway-rule-detail')).toEqual(['inventory_putaway_rule_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/putaway-rules', page: 'putaway-rules', module: 'inventory' }),
      expect.objectContaining({ path: '/putaway-rules/detail', page: 'putaway-rule-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.multi_location']);
    expect(detailPage.page.auth.require).toEqual(['inventory.multi_location']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_putaway_rules', create_action: 'create_inventory_putaway_rule', row_open_action: 'view_inventory_putaway_rule' });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/putaway-rules', label: 'Putaway Rules', permission: 'inventory.multi_location' }));
    expect(action('edit_inventory_putaway_rule')).toMatchObject({ type: 'server_form', permission: 'inventory.manage', handler: 'yaml_mutation' });
  });

  test('seeds deterministic rules, strategy context, filters, and company scope', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rules');
    const params = { q: null, active: null, current_company_name: 'My Company (San Francisco)', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['putaway-storage-box', 'putaway-office-supplies']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['putaway-archived-demo']);
    expect((await repository.querySource(source, { ...params, q: 'Office Supplies' }, 0, 50)).data).toMatchObject([{ id: 'putaway-office-supplies', sublocation: 'closest_location' }]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rule_detail');
    expect(await repository.querySource(detail, { id: 'putaway-office-supplies', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 1)).toMatchObject({ data: { category_name: 'Office Supplies', location_in_name: 'Input', location_out_name: 'Stock / Shelf 2', storage_category_name: 'Small Bin' } });
    const locations = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_putaway_locations');
    expect((await repository.querySource(locations, { current_company_name: 'My Company (San Francisco)' }, 0, 50)).data).toEqual(expect.arrayContaining([{ value: 'location-input', label: 'Input' }, { value: 'location-stock-shelf-1', label: 'Shelf 1' }]));
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces manager CRUD, target/strategy/company guards, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_putaway_rule');
    const edit = action('edit_inventory_putaway_rule');
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.multi_location'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map([...listApi.datasources, ...detailApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map([['putaway-rules', listApi.datasources.map((source: any) => source.id)], ['putaway-rule-detail', detailApi.datasources.map((source: any) => source.id)]]),
      pages: new Map([['putaway-rules', { ...page, actions: listApi.actions }], ['putaway-rule-detail', { ...detailPage, actions: detailApi.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage', 'inventory.multi_location'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    expect((await handler(new Request('http://inventory.test/api/pages/putaway-rules'), new URL('http://inventory.test/api/pages/putaway-rules'))).status).toBe(200);
    const values = { sequence_number: 40, product_id: 'stock-report-storage-box', product_name: '[E-COM08] Storage Box', category_name: '', location_in_id: 'location-input', location_in_name: 'Input', location_out_id: 'location-stock-small-refrigerator', location_out_name: 'Small Refrigerator', package_type_name: '', storage_category_id: '', storage_category_name: '', sublocation: 'no', company_name: 'My Company (San Francisco)', active: true };
    const created = await repository.executeMutation(create.mutation, { id: 'putaway-qa-rule', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'putaway-qa-rule', product_name: '[E-COM08] Storage Box', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { id: 'putaway-duplicate', current_company_name: 'My Company (San Francisco)', values })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PUTAWAY_RULE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'putaway-both-targets', current_company_name: 'My Company (San Francisco)', values: { ...values, category_name: 'Office Supplies' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PUTAWAY_TARGET_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'putaway-bad-strategy', current_company_name: 'My Company (San Francisco)', values: { ...values, sublocation: 'closest_location', storage_category_id: '' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PUTAWAY_STRATEGY_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'putaway-other-company', current_company_name: 'My Company (San Francisco)', values: { ...values, company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PUTAWAY_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, sequence_number: 45, sublocation: 'last_used' } });
    expect(edited).toMatchObject({ id: created.id, sequence_number: 45, sublocation: 'last_used', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, sequence_number: 99 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(action('archive_inventory_putaway_rule').mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company (San Francisco)', values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(action('restore_inventory_putaway_rule').mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company (San Francisco)', values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await repository.executeMutation(action('delete_inventory_putaway_rule').mutation, { id: created.id, expected_row_version: 4, current_company_name: 'My Company (San Francisco)' });
    expect(await repository.query('SELECT id FROM inventory_putaway_rules WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('persists putaway lifecycle through restart and denies an outside company', async () => {
    const databasePath = `/tmp/core3-inventory-putaway-rules-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const create = action('create_inventory_putaway_rule');
    await first.repository.executeMutation(create.mutation, { id: 'putaway-qa-restart', current_company_name: 'My Company (San Francisco)', values: { sequence_number: 60, product_id: '', product_name: 'All products', category_name: 'Furniture', location_in_id: 'location-input', location_in_name: 'Input', location_out_id: 'location-stock-shelf-2', location_out_name: 'Shelf 2', package_type_name: '', storage_category_id: '', storage_category_name: '', sublocation: 'no', company_name: 'My Company (San Francisco)', active: true } });
    await first.repository.executeMutation(action('edit_inventory_putaway_rule').mutation, { id: 'putaway-qa-restart', expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { sequence_number: 61, product_id: '', product_name: 'All products', category_name: 'Furniture', location_in_id: 'location-input', location_in_name: 'Input', location_out_id: 'location-stock-shelf-2', location_out_name: 'Shelf 2', package_type_name: '', storage_category_id: 'storage-bin', storage_category_name: 'Small Bin', sublocation: 'closest_location', company_name: 'My Company (San Francisco)' } });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, sequence_number, sublocation, row_version FROM inventory_putaway_rules WHERE id = ?', ['putaway-qa-restart'])).toEqual([{ id: 'putaway-qa-restart', sequence_number: 61, sublocation: 'closest_location', row_version: 2 }]);
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rules');
    expect((await second.repository.querySource(source, { q: null, active: 'all', current_company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toEqual([]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
