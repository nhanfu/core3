import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = yaml('api/rules.yaml');
const detailApi = yaml('api/rule-detail.yaml');
const page = yaml('pages/rules.yaml');
const detailPage = yaml('pages/rule-detail.yaml');
const manifest = yaml('manifest.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_rules_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Rules Odoo action parity', () => {
  test('maps stock.action_rules_form to separate page/API contracts', () => {
    const discoveryRoot = mkdtempSync('/tmp/core3-inventory-rules-discovery-');
    mkdirSync(join(discoveryRoot, 'services'));
    cpSync(serviceRoot, join(discoveryRoot, 'services/inventory'), { recursive: true });
    const discovered = discoverPages(discoveryRoot);
    rmSync(discoveryRoot, { recursive: true, force: true });
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'rules' });
    expect(detailApi.page).toEqual({ id: 'rule-detail' });
    expect(discovered.pageDatasources.get('rules')).toEqual(['inventory_rules', 'inventory_rule_routes', 'inventory_rule_locations', 'inventory_rule_operation_types']);
    expect(discovered.pageDatasources.get('rule-detail')).toEqual(['inventory_rule_detail', 'inventory_rule_detail_routes', 'inventory_rule_detail_locations']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/rules', page: 'rules', module: 'inventory' }),
      expect.objectContaining({ path: '/rules/detail', page: 'rule-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.multi_location']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_rules', create_action: 'create_inventory_rule', row_open_action: 'view_inventory_rule' });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_rule_detail' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/rules', label: 'Rules', permission: 'inventory.multi_location' }));
    expect(action('edit_inventory_rule')).toMatchObject({ type: 'server_form', permission: 'inventory.manage', handler: 'yaml_mutation' });
  });

  test('seeds ordered active, archived, company-scoped rules and empty boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_rules');
    const params = { q: null, action: null, active: null, current_company_name: 'My Company (San Francisco)', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-buy-rule', 'route-mto-rule']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-two-step-rule']);
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toMatchObject([{ id: 'route-mto-rule', company_name: 'Shared' }]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_rule_detail');
    expect(await repository.querySource(detail, { id: 'route-buy-rule', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Buy from Vendors', action: 'buy', route_name: 'Buy' } });
    database.close();
  });

  test('enforces manager CRUD, action/location/route/company guards, archive, delete, and stale versions', async () => {
    const { database, repository } = await repositoryForTest();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.multi_location'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map([...listApi.datasources, ...detailApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map([['rules', listApi.datasources.map((source: any) => source.id)], ['rule-detail', detailApi.datasources.map((source: any) => source.id)]]),
      pages: new Map([['rules', { ...page, actions: listApi.actions }], ['rule-detail', { ...detailPage, actions: detailApi.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage', 'inventory.multi_location'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    expect((await handler(new Request('http://inventory.test/api/pages/rules'), new URL('http://inventory.test/api/pages/rules'))).status).toBe(200);
    const create = action('create_inventory_rule');
    const values = { name: 'QA Cross Dock Rule', route_id: 'route-buy', sequence_number: 40, action: 'pull', source_location_id: 'location-supplier', destination_location_id: 'location-stock', source_location_name: 'Vendors', destination_location_name: 'WH/Stock', company_name: 'My Company (San Francisco)', picking_type_id: 'operation-receipts', picking_type_name: 'Receipts', procure_method: 'make_to_stock', auto: 'manual', delay_days: 0, active: true };
    expect([...listApi.datasources, ...detailApi.datasources].filter((source: any) => source.id.includes('rules')).every((source: any) => source.permission === 'inventory.multi_location' || source.permission === 'inventory.manage')).toBe(true);
    await expect(repository.executeMutation(create.mutation, { id: 'rule-duplicate', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Buy from Vendors' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RULE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'rule-bad-locations', current_company_name: 'My Company (San Francisco)', values: { ...values, source_location_id: 'location-stock', destination_location_id: 'location-stock' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_RULE_LOCATIONS_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'rule-other-company', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Other company rule', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_RULE_COMPANY_FORBIDDEN' });
    const created = await repository.executeMutation(create.mutation, { id: 'rule-qa', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'rule-qa', name: 'QA Cross Dock Rule', row_version: 1, active: true });
    const edit = action('edit_inventory_rule');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'QA Cross Dock Rule Updated', action: 'pull_push' } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Cross Dock Rule Updated', action: 'pull_push', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(action('archive_inventory_rule').mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company (San Francisco)', values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    await repository.executeMutation(action('delete_inventory_rule').mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company (San Francisco)' });
    expect(await repository.query('SELECT id FROM inventory_route_rules WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('persists rule lifecycle through restart', async () => {
    const databasePath = `/tmp/core3-inventory-rules-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const create = action('create_inventory_rule');
    const values = { name: 'QA Restart Rule', route_id: 'route-buy', sequence_number: 60, action: 'push', source_location_id: 'location-stock', destination_location_id: 'location-customer', source_location_name: 'WH/Stock', destination_location_name: 'Customers', company_name: 'My Company (San Francisco)', picking_type_name: 'Delivery Orders', procure_method: 'make_to_order', auto: 'automatic', delay_days: 2, active: true };
    await first.repository.executeMutation(create.mutation, { id: 'rule-qa-restart', current_company_name: 'My Company (San Francisco)', values });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, action, row_version FROM inventory_route_rules WHERE id = ?', ['rule-qa-restart'])).toEqual([{ id: 'rule-qa-restart', name: 'QA Restart Rule', action: 'push', row_version: 1 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
