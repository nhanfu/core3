import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/transfer-detail.yaml');
const api = yaml('api/transfer-detail.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'print_inventory_transfer_labels');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory transfer Product Labels parity', () => {
  test('keeps the Odoo Labels action in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('transfer-detail');
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'print_inventory_transfer_labels', label: 'Labels', permission: 'inventory.write' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_print_labels', operation: 'print_labels', handler: 'yaml_mutation' });
    expect(action.fields.find((field: any) => field.field === 'label_type')).toMatchObject({ options: expect.arrayContaining([expect.objectContaining({ value: 'products', label: 'Product Labels' })]) });
    expect(source('inventory_transfer_label_runs').query).toContain('inventory_transfer_label_runs');
  });

  test('prepares durable Product Labels, records actor/timeline, and is idempotent to migration replay', async () => {
    const db = await repository('inventory_transfer_labels_create_test');
    await db.executeMutation(action.mutation, {
      id: 'delivery-labels-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator',
      label_type: 'products', output_format: 'PDF',
    });
    const result = await db.query('SELECT id, label_type, output_format, label_count, requested_by FROM inventory_transfer_label_runs WHERE picking_id = ?', ['delivery-labels-0001']);
    expect(result).toEqual([{ id: 'transfer-labels-delivery-labels-0001-1', label_type: 'products', output_format: 'PDF', label_count: 3, requested_by: 'Inventory Operator' }]);
    expect(await db.query('SELECT row_version FROM inventory_pickings WHERE id = ?', ['delivery-labels-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_transfer_label_runs'), { id: 'delivery-labels-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ label_count: 3, requested_by: 'Inventory Operator' });
    expect((await db.querySource(source('inventory_transfer_timeline'), { id: 'delivery-labels-0001', fixture_state: null }, 0, 10)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'inventory.transfer.labels_printed', action_label: 'Labels prepared', actor_name: 'Inventory Operator' }),
    ]));
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_transfer_labels_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_label_runs')).toEqual([{ count: 1 }]);
  });

  test('rejects wrong company, missing actor, stale rows, invalid label type, and cancelled rows', async () => {
    const db = await repository('inventory_transfer_labels_guards_test');
    const base = { id: 'delivery-labels-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', label_type: 'products', output_format: 'PDF' };
    await expect(db.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_LABELS_NOT_ALLOWED' });
    await expect(db.executeMutation(action.mutation, { ...base, label_type: 'invalid' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_LABEL_TYPE_UNSUPPORTED' });
    await db.run("UPDATE inventory_pickings SET state = 'Cancelled' WHERE id = ?", ['delivery-labels-0001']);
    await expect(db.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_LABELS_NOT_ALLOWED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_label_runs')).toEqual([{ count: 0 }]);
  });

  test('preserves label history across restart and enforces the write permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-labels-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_transfer_labels_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { id: 'delivery-labels-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Restart Operator', label_type: 'products', output_format: 'PDF' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT label_type, requested_by, label_count FROM inventory_transfer_label_runs WHERE picking_id = ?', ['delivery-labels-0001'])).toEqual([{ label_type: 'products', requested_by: 'Restart Operator', label_count: 3 }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_labels_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-labels-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_print_labels', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-labels-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Reader', label_type: 'products', output_format: 'PDF' } }) }), new URL('http://inventory.test/api/actions/stock.picking.action_print_labels'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
