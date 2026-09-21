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
const action = api.actions.find((candidate: any) => candidate.id === 'exchange_inventory_transfer');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'delivery-return-0001',
  expected_row_version: 1,
  current_company_name: 'Core3 Demo Company',
  current_user_name: 'Inventory Operator',
  exchange_quantity: 2,
  reason: 'Customer replacement requested',
};

describe('Inventory transfer return-for-exchange parity', () => {
  test('keeps Odoo action_create_exchanges in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const sourceWizard = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_picking_return_views.xml', 'utf8');
    const sourcePython = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_picking_return.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'exchange_inventory_transfer', label: 'Return for Exchange', permission: 'inventory.write' }));
    expect(page.components).toContainEqual(expect.objectContaining({ type: 'ListView', source: 'inventory_transfer_exchanges' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.return.exchange', operation: 'exchange', handler: 'yaml_mutation' });
    expect(source('inventory_transfer_exchanges')).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(sourceWizard).toContain('name="action_create_exchanges"');
    expect(sourceWizard).toContain('string="Return for Exchange"');
    expect(sourcePython).toContain('def action_create_exchanges(self):');
    expect(sourcePython).toContain('exchange_picking = self._create_exchange(return_picking)');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('creates durable return and replacement transfers with deterministic history', async () => {
    const db = await repository('inventory_transfer_exchanges_create_test');
    const created = await db.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({
      id: 'exchange-run-delivery-return-0001-1',
      source_picking_id: 'delivery-return-0001',
      return_picking_id: 'exchange-return-delivery-return-0001-1',
      exchange_picking_id: 'exchange-picking-delivery-return-0001-1',
      return_name: 'EXR/WH/OUT/RETURN/0001/exchange-return-delivery-return-0001-1',
      exchange_name: 'EXC/WH/OUT/RETURN/0001/exchange-picking-delivery-return-0001-1',
      product_name: '[E-COM08] Storage Box',
      exchange_quantity: 2,
      exchanged_by: 'Inventory Operator',
      reason: 'Customer replacement requested',
      state: 'Waiting',
      row_version: 1,
    });
    expect(await db.query('SELECT source_location_id, destination_location_id, state FROM inventory_pickings WHERE id = ?', ['exchange-return-delivery-return-0001-1'])).toEqual([{ source_location_id: 'location-customer', destination_location_id: 'location-stock', state: 'Waiting' }]);
    expect(await db.query('SELECT source_location_id, destination_location_id, state FROM inventory_pickings WHERE id = ?', ['exchange-picking-delivery-return-0001-1'])).toEqual([{ source_location_id: 'location-stock', destination_location_id: 'location-customer', state: 'Waiting' }]);
    expect(await db.query('SELECT product_name, quantity, done_quantity FROM inventory_picking_moves WHERE picking_id IN (?, ?) ORDER BY picking_id', ['exchange-picking-delivery-return-0001-1', 'exchange-return-delivery-return-0001-1'])).toEqual([
      { product_name: '[E-COM08] Storage Box', quantity: 2, done_quantity: 0 },
      { product_name: '[E-COM08] Storage Box', quantity: 2, done_quantity: 0 },
    ]);
    expect(await db.query('SELECT row_version FROM inventory_pickings WHERE id = ?', ['delivery-return-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_transfer_exchanges'), { id: 'delivery-return-0001', current_company_name: values.current_company_name, fixture_state: null }, 0, 10)).data[0]).toMatchObject({ exchange_name: 'EXC/WH/OUT/RETURN/0001/exchange-picking-delivery-return-0001-1', exchange_quantity: 2, exchanged_by: 'Inventory Operator' });
  });

  test('enforces missing, company, actor, stale, line, quantity, and duplicate guards', async () => {
    const db = await repository('inventory_transfer_exchanges_guards_test');
    const mutation = action.mutation;
    await expect(db.executeMutation(mutation, { ...values, id: 'transfer-missing' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRANSFER_EXCHANGE_NOT_FOUND' });
    await expect(db.executeMutation(mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_EXCHANGE_COMPANY' });
    await expect(db.executeMutation(mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_EXCHANGE_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_EXCHANGE_STALE' });
    await expect(db.executeMutation(mutation, { ...values, exchange_quantity: 5 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_EXCHANGE_QUANTITY_INVALID' });
    await db.executeMutation(mutation, values);
    await expect(db.executeMutation(mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_EXCHANGE_ALREADY_CREATED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_exchanges')).toEqual([{ count: 1 }]);
  });

  test('persists exchange history across restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-exchanges-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_exchanges_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT product_name, exchange_quantity, exchanged_by, state FROM inventory_transfer_exchanges WHERE source_picking_id = ?', ['delivery-return-0001'])).toEqual([{ product_name: '[E-COM08] Storage Box', exchange_quantity: 2, exchanged_by: 'Restart Operator', state: 'Waiting' }]);
    expect(await secondRepository.query('SELECT state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-return-0001'])).toEqual([{ state: 'Done', row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_exchanges_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], company_name: 'Core3 Demo Company', permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-exchanges-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.return.exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.picking.return.exchange'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
