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
const listApi = yaml('api/units-packagings.yaml');
const detailApi = yaml('api/unit-packaging-detail.yaml');
const page = yaml('pages/units-packagings.yaml');
const detailPage = yaml('pages/unit-packaging-detail.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_units_packagings_${crypto.randomUUID().replaceAll('-', '_')}`;
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
      ['units-packagings', listApi.datasources.map((source: any) => source.id)],
      ['unit-packaging-detail', detailApi.datasources.map((source: any) => source.id)],
    ]),
    pages: new Map([
      ['units-packagings', { ...page, actions: listApi.actions }],
      ['unit-packaging-detail', { ...detailPage, actions: detailApi.actions }],
    ]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} },
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

describe('Inventory Units & Packagings Odoo action parity', () => {
  test('maps the UoM action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'units-packagings' });
    expect(detailApi.page).toEqual({ id: 'unit-packaging-detail' });
    expect(discovered.pageDatasources.get('units-packagings')).toEqual([
      'inventory_units_packagings', 'inventory_units_packaging_reference_units',
    ]);
    expect(discovered.pageDatasources.get('unit-packaging-detail')).toEqual([
      'inventory_unit_packaging_detail', 'inventory_unit_packaging_children',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/units-packagings', page: 'units-packagings', module: 'inventory' }),
      expect.objectContaining({ path: '/units-packagings/detail', page: 'unit-packaging-detail', module: 'inventory' }),
    ]));
    expect(page.components[0]).toMatchObject({ source: 'inventory_units_packagings', create_action: 'create_inventory_unit_packaging', row_open_action: 'view_inventory_unit_packaging' });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_unit_packaging_detail' });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual(expect.objectContaining({ path: '/units-packagings', label: 'Units & Packagings', permission: 'inventory.read' }));
  });

  test('seeds deterministic conversion rows and scopes active/archive/reference data', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_units_packagings');
    const params = { q: null, active: 'active', current_company_name: 'Core3 Demo Company', fixture_state: null };
    const rows = (await repository.querySource(source, params, 0, 50)).data;
    expect(rows).toHaveLength(10);
    expect(rows.map((row: any) => row.name)).toEqual(expect.arrayContaining(['Minutes', 'Units', 'Pack of 6', 'Box of 12', 'Shared Unit']));
    expect(rows.find((row: any) => row.name === 'Minutes')).toMatchObject({ relative_factor: 0.016667, relative_factor_display: '0.017', reference_unit_name: 'Hours' });
    expect(rows.find((row: any) => row.name === 'Pack of 6')).toMatchObject({ relative_factor: 6, relative_factor_display: '6.000', reference_unit_name: 'Units' });
    expect((await repository.querySource(source, { ...params, q: 'Pack' }, 0, 50)).data).toEqual([expect.objectContaining({ name: 'Pack of 6' })]);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data).toEqual([expect.objectContaining({ name: 'Legacy Unit', active: false })]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([expect.objectContaining({ name: 'Shared Unit', company_name: 'Shared' })]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_unit_packaging_detail');
    expect(await repository.querySource(detail, { id: 'inventory-uom-pack-six', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Pack of 6', reference_unit_name: 'Units', relative_factor: 6 }) });
    const children = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_unit_packaging_children');
    expect((await repository.querySource(children, { id: 'inventory-uom-units', current_company_name: 'Core3 Demo Company' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Pack of 6', 'Box of 12']);
    database.close();
  });

  test('enforces manager CRUD, company/reference validation, in-use guards, and row versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_unit_packaging');
    const edit = action('edit_inventory_unit_packaging');
    const archive = action('archive_inventory_unit_packaging');
    const restore = action('restore_inventory_unit_packaging');
    const remove = action('delete_inventory_unit_packaging');
    expect([...listApi.datasources, ...detailApi.datasources].every((source: any) => source.permission === 'inventory.read')).toBe(true);
    expect([...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate').every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    const values = { sequence: 700, name: 'Carton 12', relative_factor: 12, reference_unit_id: 'inventory-uom-units', reference_unit_name: 'Units', company_name: 'Core3 Demo Company', active: true, usage_count: 0 };
    const created = await repository.executeMutation(create.mutation, { id: 'inventory-uom-qa', current_company_name: 'Core3 Demo Company', values });
    expect(created).toMatchObject({ id: 'inventory-uom-qa', name: 'Carton 12', relative_factor: 12, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-uom-duplicate', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'carton 12' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_UNIT_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-uom-invalid', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Invalid', relative_factor: 0 } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_UNIT_FACTOR_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-uom-no-reference', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'No Reference', reference_unit_id: '', reference_unit_name: '' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_UNIT_REFERENCE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'inventory-uom-other', current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Other Company Unit', company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_UNIT_COMPANY_FORBIDDEN' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Carton 24', relative_factor: 24 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Carton 24', relative_factor: 24, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { ...values, name: 'Stale Carton' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: { active: false } });
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'Core3 Demo Company', values: { active: true } });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4, current_company_name: 'Core3 Demo Company' });
    expect(await repository.query('SELECT id FROM inventory_units_packagings WHERE id = ?', [created.id])).toEqual([]);
    await expect(repository.executeMutation(archive.mutation, { id: 'inventory-uom-units', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_UNIT_IN_USE' });
    await expect(repository.executeMutation(remove.mutation, { id: 'inventory-uom-units', expected_row_version: 1, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_UNIT_IN_USE' });
    database.close();
  });

  test('keeps read access separate from manager mutations and survives restart', async () => {
    const databasePath = `/tmp/core3-inventory-units-packagings-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const handler = apiHandler(first.repository, { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Reader', roles: ['user'], permissions: ['inventory.read'] });
    expect((await handler(new Request('http://inventory.test/api/pages/units-packagings'), new URL('http://inventory.test/api/pages/units-packagings'))).status).toBe(200);
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.units_packagings.create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: {} }) }), new URL('http://inventory.test/api/actions/inventory.units_packagings.create'))).rejects.toMatchObject({ status: 403 });
    await first.repository.executeMutation(action('create_inventory_unit_packaging').mutation, { id: 'inventory-uom-restart', current_company_name: 'Core3 Demo Company', values: { name: 'Restart Case', relative_factor: 6, reference_unit_id: 'inventory-uom-units', reference_unit_name: 'Units', company_name: 'Core3 Demo Company' } });
    first.database.close();
    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, name, relative_factor, row_version FROM inventory_units_packagings WHERE id = ?', ['inventory-uom-restart'])).toEqual([{ id: 'inventory-uom-restart', name: 'Restart Case', relative_factor: 6, row_version: 1 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
