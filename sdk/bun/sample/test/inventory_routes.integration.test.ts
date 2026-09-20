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
const listApi = yaml('api/routes.yaml');
const detailApi = yaml('api/route-detail.yaml');
const page = yaml('pages/routes.yaml');
const detailPage = yaml('pages/route-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_routes_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

describe('Inventory Routes Odoo action parity', () => {
  test('maps the Warehouse Management Routes action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'routes' });
    expect(detailApi.page).toEqual({ id: 'route-detail' });
    expect(discovered.pageDatasources.get('routes')).toEqual(['inventory_routes', 'inventory_route_create_warehouses']);
    expect(discovered.pageDatasources.get('route-detail')).toEqual(['inventory_route_detail', 'inventory_route_rules', 'inventory_route_edit_warehouses']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/routes', page: 'routes', module: 'inventory' }),
      expect.objectContaining({ path: '/routes/detail', page: 'route-detail', module: 'inventory' }),
    ]));
    expect(page.page.auth.require).toEqual(['inventory.manage']);
    expect(detailPage.page.auth.require).toEqual(['inventory.manage']);
    expect(page.components[0]).toMatchObject({ source: 'inventory_routes', create_action: 'create_inventory_route', row_open_action: 'view_inventory_route' });
    expect(detailPage.components.map((component: any) => component.type)).toEqual(['OdooFormView', 'ListView']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/routes', label: 'Routes', permission: 'inventory.manage' }));
    expect(action('edit_inventory_route').mutation.fields).toEqual(expect.arrayContaining(['product_selectable', 'warehouse_selectable', 'package_type_selectable']));
  });

  test('seeds deterministic active, archived, shared, and route-rule data', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_routes');
    const params = { q: null, active: null, current_company_name: 'My Company (San Francisco)', fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-buy', 'route-replenish-mto']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-two-step-receipt']);
    expect((await repository.querySource(source, { ...params, active: 'all' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-buy', 'route-replenish-mto', 'route-two-step-receipt']);
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_route_detail');
    expect(await repository.querySource(detail, { id: 'route-buy', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Buy', rule_count: 1, product_selectable: true } });
    const rules = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_route_rules');
    expect((await repository.querySource(rules, { id: 'route-buy', current_company_name: 'My Company (San Francisco)' }, 0, 50)).data).toMatchObject([{ action: 'buy', source_location_name: 'Vendors', destination_location_name: 'WH/Stock' }]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toMatchObject([{ id: 'route-replenish-mto', company_name: 'Shared' }]);
    database.close();
  });

  test('enforces manager CRUD, company scope, archive/delete rules, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_route');
    const edit = action('edit_inventory_route');
    const values = { name: 'QA Cross Dock', sequence_number: 55, company_name: 'My Company (San Francisco)', product_selectable: true, product_categ_selectable: false, warehouse_selectable: true, package_type_selectable: false, warehouse_id: 'warehouse-main' };
    expect([...listApi.datasources, ...detailApi.datasources].every((source: any) => source.permission === 'inventory.manage')).toBe(true);
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    expect(edit.mutation.concurrency).toEqual({ required: true });
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map([...listApi.datasources, ...detailApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map([['routes', listApi.datasources.map((source: any) => source.id)], ['route-detail', detailApi.datasources.map((source: any) => source.id)]]),
      pages: new Map([['routes', { ...page, actions: listApi.actions }], ['route-detail', { ...detailPage, actions: detailApi.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    await expect(handler(new Request('http://inventory.test/api/pages/routes'), new URL('http://inventory.test/api/pages/routes'))).rejects.toMatchObject({ status: 403 });
    const created = await repository.executeMutation(create.mutation, { id: 'route-qa-cross-dock', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'route-qa-cross-dock', name: 'QA Cross Dock', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'route-duplicate', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Buy' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ROUTE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'route-other-company', current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Other', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_ROUTE_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'QA Cross Dock Updated', package_type_selectable: true } });
    expect(edited).toMatchObject({ id: created.id, name: 'QA Cross Dock Updated', package_type_selectable: true, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archive = action('archive_inventory_route');
    const restore = action('restore_inventory_route');
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company (San Francisco)', values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company (San Francisco)', values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await expect(repository.executeMutation(action('delete_inventory_route').mutation, { id: 'route-buy', expected_row_version: 1, current_company_name: 'My Company (San Francisco)' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_ROUTE_HAS_RULES' });
    await repository.executeMutation(action('delete_inventory_route').mutation, { id: created.id, expected_row_version: 4, current_company_name: 'My Company (San Francisco)' });
    expect((await repository.query('SELECT id FROM inventory_routes WHERE id = ?', [created.id]))).toEqual([]);
    database.close();
  });

  test('persists route lifecycle through restart and denies an outside company', async () => {
    const databasePath = `/tmp/core3-inventory-routes-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const create = action('create_inventory_route');
    const values = { name: 'QA Restart Route', sequence_number: 70, company_name: 'My Company (San Francisco)', product_selectable: false, product_categ_selectable: true, warehouse_selectable: false, package_type_selectable: true, warehouse_id: null };
    const created = await first.repository.executeMutation(create.mutation, { id: 'route-qa-restart', current_company_name: 'My Company (San Francisco)', values });
    await first.repository.executeMutation(action('edit_inventory_route').mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company (San Francisco)', values: { ...values, name: 'QA Restart Route Updated' } });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, row_version, active FROM inventory_routes WHERE id = ?', ['route-qa-restart'])).toEqual([{ id: 'route-qa-restart', name: 'QA Restart Route Updated', row_version: 2, active: true }]);
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_routes');
    expect((await second.repository.querySource(source, { q: null, active: 'all', current_company_name: 'Other Company', fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'route-replenish-mto', company_name: 'Shared' }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
