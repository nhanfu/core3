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
const page = yaml('pages/transfer-detailed-operations.yaml');
const api = yaml('api/transfer-detailed-operations.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_detailed_operation_edit_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory transfer detailed operation edit parity', () => {
  test('maps Odoo mobile move-line editing to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_move_line_views.xml', 'utf8');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components.some((component: any) => component.source === 'inventory_transfer_detailed_operation_updates')).toBe(true);
    expect(page.components.flatMap((component: any) => component.columns ?? []).flatMap((column: any) => column.actions ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'update_inventory_detailed_operation', label: 'Update Quantity', permission: 'inventory.write' }),
    ]));
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('inventory_transfer_detailed_operation_updates');
    expect(action('update_inventory_detailed_operation')).toMatchObject({ type: 'server_form', action: 'stock.move.line.update_quantity', operation: 'update_quantity' });
    expect(sourceView).toContain('id="view_move_line_tree_detailed"');
    expect(sourceView).toContain('<attribute name="edit">1</attribute>');
    expect(sourceView).toContain('<field name="quantity"/>');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/inventory/transfer/detailed-operations');
  });

  test('seeds deterministic editable operation and update history', async () => {
    const { database, repository } = await openRepository();
    const params = { picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null };
    expect((await repository.querySource(source('inventory_transfer_detailed_operations'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'delivery-detailed-0001-line-001', quantity: 2, state: 'Assigned', row_version: 1,
    })]);
    expect((await repository.querySource(source('inventory_transfer_detailed_operation_updates'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'detailed-operation-update-seed-0001', previous_quantity: 2, new_quantity: 2, updated_by: 'Seeded Inventory',
    })]);
    database.close();
  });

  test('updates quantity durably with actor, company, state, validation, and stale guards', async () => {
    const { database, repository } = await openRepository();
    const mutation = action('update_inventory_detailed_operation').mutation;
    const base = { picking_id: 'delivery-detailed-0001', move_line_id: 'delivery-detailed-0001-line-001', expected_row_version: 1, quantity: 3, current_user_id: 'user-admin', current_user_name: 'Inventory Operator', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' };
    expect(await repository.executeMutation(mutation, base)).toMatchObject({ id: 'detailed-operation-update-delivery-detailed-0001-line-001-2', previous_quantity: 2, new_quantity: 3, updated_by: 'Inventory Operator' });
    expect(await repository.query('SELECT quantity, quantity_product_uom, row_version, done_by FROM inventory_move_lines WHERE id = ?', [base.move_line_id])).toEqual([{ quantity: 3, quantity_product_uom: 3, row_version: 2, done_by: 'Inventory Operator' }]);
    expect(await repository.query('SELECT done_quantity FROM inventory_picking_moves WHERE id = ?', ['delivery-detailed-0001-move-001'])).toEqual([{ done_quantity: 3 }]);
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 2, quantity: -1 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_DETAILED_OPERATION_QUANTITY_INVALID' });
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 1, quantity: 4 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_DETAILED_OPERATION_NOT_EDITABLE' });
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 2, current_company_name: 'Other Company', company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_DETAILED_OPERATION_COMPANY' });
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 2, current_user_id: '', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_DETAILED_OPERATION_ACTOR_REQUIRED' });
    database.close();
  });

  test('preserves edit history across restart and denies readers the write action', async () => {
    const databasePath = `/tmp/core3-inventory-detailed-operation-edit-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const mutation = action('update_inventory_detailed_operation').mutation;
    await first.repository.executeMutation(mutation, { picking_id: 'delivery-detailed-0001', move_line_id: 'delivery-detailed-0001-line-001', expected_row_version: 1, quantity: 3, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' });
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT new_quantity, updated_by FROM inventory_detailed_operation_updates WHERE id = ?', ['detailed-operation-update-delivery-detailed-0001-line-001-2'])).toEqual([{ new_quantity: 3, updated_by: 'Restart Operator' }]);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: second.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detailed-operations', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detailed-operations', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'] }, eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.move.line.update_quantity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { picking_id: 'delivery-detailed-0001', move_line_id: 'delivery-detailed-0001-line-001', expected_row_version: 2, quantity: 4 } }) }), new URL('http://inventory.test/api/actions/stock.move.line.update_quantity'))).rejects.toMatchObject({ status: 403 });
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
