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
const page = yaml('pages/transfer-detail.yaml');
const api = yaml('api/transfer-detail.yaml');
const scrapAction = api.actions.find((candidate: any) => candidate.id === 'scrap_inventory_transfer');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'delivery-scrap-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator',
  product_name: '[E-COM08] Storage Box', scrap_qty: 1, product_uom: 'Units', source_location: 'WH/Stock', scrap_location: 'Virtual Locations/Scrap', should_replenish: false, note: 'Damaged during picking',
};

describe('Inventory transfer Scrap parity', () => {
  test('keeps Odoo transfer Scrap in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'scrap_inventory_transfer', label: 'Scrap', permission: 'inventory.write' }));
    expect(scrapAction).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_scrap', operation: 'scrap', handler: 'yaml_mutation' });
    expect(scrapAction.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'product_name', required: true }),
      expect.objectContaining({ field: 'scrap_qty', required: true }),
    ]));
    expect(source('inventory_transfer_scrap_runs').query).toContain('inventory_transfer_scrap_runs');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('creates a durable scrap order, updates transfer concurrency, and records actor history', async () => {
    const db = await repository('inventory_transfer_scrap_create_test');
    const result = await db.executeMutation(scrapAction.mutation, values) as any;
    expect(result).toMatchObject({ id: 'transfer-scrap-delivery-scrap-0001-1', scrap_id: 'inventory-scrap-delivery-scrap-0001-1', product_name: '[E-COM08] Storage Box', scrap_qty: 1, requested_by: 'Inventory Operator' });
    expect(await db.query('SELECT state, origin, picking_name FROM inventory_scrap_orders WHERE id = ?', ['inventory-scrap-delivery-scrap-0001-1'])).toEqual([{ state: 'Draft', origin: 'SO/SCRAP/0001', picking_name: 'WH/OUT/SCRAP/0001' }]);
    expect(await db.query('SELECT row_version FROM inventory_pickings WHERE id = ?', ['delivery-scrap-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_transfer_scrap_runs'), { id: 'delivery-scrap-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ product_name: '[E-COM08] Storage Box', scrap_qty: 1, requested_by: 'Inventory Operator' });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-scrap-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'inventory.transfer.scrapped', action_label: 'Scrap Products', actor_name: 'Inventory Operator' }),
    ]));
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_transfer_scrap_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_scrap_runs')).toEqual([{ count: 1 }]);
  });

  test('enforces company, actor, row-version, state, and input guards without partial scrap state', async () => {
    const db = await repository('inventory_transfer_scrap_guards_test');
    await expect(db.executeMutation(scrapAction.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(scrapAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(scrapAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_SCRAP_NOT_ALLOWED' });
    await expect(db.executeMutation(scrapAction.mutation, { ...values, scrap_qty: 0 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_SCRAP_INVALID' });
    await db.run("UPDATE inventory_pickings SET state = 'Cancelled' WHERE id = ?", ['delivery-scrap-0001']);
    await expect(db.executeMutation(scrapAction.mutation, values)).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_SCRAP_NOT_ALLOWED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_scrap_runs')).toEqual([{ count: 0 }]);
  });

  test('preserves transfer Scrap history across restart and enforces write permission', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-scrap-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_scrap_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(scrapAction.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT product_name, requested_by, scrap_qty FROM inventory_transfer_scrap_runs WHERE picking_id = ?', ['delivery-scrap-0001'])).toEqual([{ product_name: '[E-COM08] Storage Box', requested_by: 'Restart Operator', scrap_qty: 1 }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_scrap_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-scrap-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_scrap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.picking.action_scrap'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
