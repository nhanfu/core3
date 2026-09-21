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
const page = yaml('pages/package-detail.yaml');
const api = yaml('api/package-detail.yaml');
const removeAction = api.actions.find((candidate: any) => candidate.id === 'remove_inventory_package_from_transfer');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'package-main-0001', expected_row_version: 1, picking_id: 'delivery-package-remove-0001',
  current_company_name: 'My Company (San Francisco)', current_user_name: 'Inventory Operator', reason: 'Remove damaged package link',
};

describe('Inventory package Remove from Transfer parity', () => {
  test('keeps the Odoo transfer-pack action in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.page.id).toBe('package-detail');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'remove_inventory_package_from_transfer', label: 'Remove from Transfer', permission: 'inventory.write' }));
    expect(api.page.id).toBe('package-detail');
    expect(removeAction).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.package.action_remove_package', operation: 'remove_package', handler: 'yaml_mutation' });
    expect(removeAction.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'picking_id', options_source: 'inventory_package_removal_transfers', required: true })]));
    expect(source('inventory_package_removal_runs').query).toContain('inventory_package_removal_runs');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('removes the package link from an open transfer and records durable history', async () => {
    const db = await repository('inventory_package_remove_create_test');
    const result = await db.executeMutation(removeAction.mutation, values) as any;
    expect(result).toMatchObject({ id: 'inventory-package-removal-package-main-0001-1', package_id: 'package-main-0001', picking_id: 'delivery-package-remove-0001', package_name: 'PACK0000001', removed_count: 1, requested_by: 'Inventory Operator' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_move_lines WHERE package_id = ? AND move_id IN (SELECT id FROM inventory_picking_moves WHERE picking_id = ?)', ['package-main-0001', 'delivery-package-remove-0001'])).toEqual([{ count: 0 }]);
    expect(await db.query('SELECT row_version, content_count FROM inventory_packages WHERE id = ?', ['package-main-0001'])).toEqual([{ row_version: 2, content_count: 2 }]);
    expect((await db.querySource(source('inventory_package_removal_runs'), { id: 'package-main-0001', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ picking_id: 'delivery-package-remove-0001', removed_count: 1, requested_by: 'Inventory Operator' });
    expect((await db.querySource(source('inventory_package_removal_transfers'), { id: 'package-main-0001', current_company_name: 'My Company (San Francisco)' }, 0, 10)).data).toEqual([]);
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_package_remove_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_removal_runs')).toEqual([{ count: 1 }]);
  });

  test('enforces company, actor, open-transfer, link, stale, and empty guards', async () => {
    const db = await repository('inventory_package_remove_guards_test');
    await expect(db.executeMutation(removeAction.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_REMOVE_STALE' });
    await expect(db.executeMutation(removeAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PACKAGE_REMOVE_ACTOR_REQUIRED' });
    await expect(db.executeMutation(removeAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_REMOVE_STALE' });
    await expect(db.executeMutation(removeAction.mutation, { ...values, picking_id: 'receipt-00005' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_REMOVE_TRANSFER_INVALID' });
    await db.executeMutation(removeAction.mutation, values);
    await expect(db.executeMutation(removeAction.mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PACKAGE_REMOVE_NOT_LINKED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_removal_runs')).toEqual([{ count: 1 }]);
  });

  test('preserves removal history across restart and enforces the write permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-package-remove-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_package_remove_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(removeAction.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT package_name, removed_count, requested_by FROM inventory_package_removal_runs WHERE package_id = ?', ['package-main-0001'])).toEqual([{ package_name: 'PACK0000001', removed_count: 1, requested_by: 'Restart Operator' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_package_remove_permission_test');
    const user = { sub: 'inventory-tracker', email: 'tracker@core3.local', roles: ['user'], permissions: ['inventory.tracking'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['package-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['package-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.tracking', 'inventory.write'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-package-remove-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.package.action_remove_package', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.package.action_remove_package'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
