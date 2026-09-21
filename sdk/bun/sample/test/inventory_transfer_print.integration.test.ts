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
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_print_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const actor = { current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Inventory Operator' };

describe('Inventory transfer Print report parity', () => {
  test('keeps the state-specific Odoo Print actions in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const sourceReport = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/stock_report_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detail.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'print_inventory_transfer_operations', label: 'Print', permission: 'inventory.write', show_if: "state.inventory_transfer_detail.state === 'Ready'" }),
      expect.objectContaining({ id: 'print_inventory_transfer_delivery_slip', label: 'Print', permission: 'inventory.read', show_if: "state.inventory_transfer_detail.state === 'Done'" }),
    ]));
    expect(action('print_inventory_transfer_operations')).toMatchObject({ type: 'server', permission: 'inventory.write', action: 'stock.picking.do_print_picking', operation: 'print_report', handler: 'yaml_mutation' });
    expect(action('print_inventory_transfer_delivery_slip')).toMatchObject({ type: 'server', permission: 'inventory.read', action: 'stock.action_report_delivery', operation: 'print_report', handler: 'yaml_mutation' });
    expect(source('inventory_transfer_print_runs').query).toContain('inventory_transfer_print_runs');
    expect(sourceView).toContain('name="do_print_picking" string="Print"');
    expect(sourceView).toContain('name="%(action_report_delivery)d" string="Print"');
    expect(sourceModel).toContain("self.env.ref('stock.action_report_picking').report_action(self)");
    expect(sourceReport).toContain('id="action_report_delivery"');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/inventory/transfer/detail');
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('inventory_transfer_print_runs');
  });

  test('prepares Ready Picking Operations and Done Delivery Slip runs durably', async () => {
    const { database, repository } = await openRepository();
    const ready = await repository.executeMutation(action('print_inventory_transfer_operations').mutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor }) as any;
    expect(ready).toMatchObject({ id: 'transfer-print-delivery-print-0001-1', report_name: 'Picking Operations', report_action: 'stock.action_report_picking', output_format: 'PDF', printed_by: 'Inventory Operator', row_version: 1 });
    expect(await repository.query('SELECT printed, row_version FROM inventory_pickings WHERE id = ?', ['delivery-print-0001'])).toEqual([{ printed: true, row_version: 2 }]);

    const done = await repository.executeMutation(action('print_inventory_transfer_delivery_slip').mutation, { id: 'delivery-print-0002', expected_row_version: 1, ...actor }) as any;
    expect(done).toMatchObject({ id: 'transfer-print-delivery-print-0002-1', report_name: 'Delivery Slip', report_action: 'stock.action_report_delivery', output_format: 'PDF', printed_by: 'Inventory Operator' });
    expect(await repository.query('SELECT printed, row_version FROM inventory_pickings WHERE id = ?', ['delivery-print-0002'])).toEqual([{ printed: false, row_version: 1 }]);
    expect((await repository.querySource(source('inventory_transfer_print_runs'), { id: 'delivery-print-0001', current_company_name: actor.current_company_name, fixture_state: null }, 0, 10)).data).toEqual([expect.objectContaining({ report_name: 'Picking Operations', printed_by: 'Inventory Operator' })]);
    expect((await repository.querySource(source('inventory_transfer_timeline'), { id: 'delivery-print-0002', fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'inventory.transfer.printed', action_label: 'Print prepared', detail: 'Delivery Slip report prepared as PDF' }),
    ]));
    expect((await repository.querySource(source('inventory_transfer_print_runs'), { id: 'delivery-print-0001', current_company_name: actor.current_company_name, fixture_state: 'empty' }, 0, 10)).data).toEqual([]);
    await expect(repository.querySource(source('inventory_transfer_print_runs'), { id: 'delivery-print-0001', current_company_name: actor.current_company_name, fixture_state: 'transport_error' }, 0, 10)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_TRANSFER_PRINTS_UNAVAILABLE' });
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'inventory_transfer_print_replay', ['schema', 'data']);
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_print_runs')).toEqual([{ count: 2 }]);
    database.close();
  });

  test('enforces state, company, actor, move-line, and row-version guards', async () => {
    const { database, repository } = await openRepository();
    const readyMutation = action('print_inventory_transfer_operations').mutation;
    const doneMutation = action('print_inventory_transfer_delivery_slip').mutation;
    await expect(repository.executeMutation(readyMutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_PRINT_COMPANY' });
    await expect(repository.executeMutation(readyMutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_PRINT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(readyMutation, { id: 'delivery-print-0001', expected_row_version: 99, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PRINT_NOT_ALLOWED' });
    await expect(repository.executeMutation(readyMutation, { id: 'delivery-print-0002', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PRINT_NOT_ALLOWED' });
    await expect(repository.executeMutation(doneMutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PRINT_NOT_ALLOWED' });
    await repository.run("UPDATE inventory_picking_moves SET quantity = 0 WHERE picking_id = 'delivery-print-0001'");
    await expect(repository.executeMutation(readyMutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_PRINT_NO_LINES' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_print_runs')).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves print history across restart and protects the Ready action by permission', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-print-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_print_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await openRepository(databasePath, migrationName);
    await first.repository.executeMutation(action('print_inventory_transfer_operations').mutation, { id: 'delivery-print-0001', expected_row_version: 1, ...actor, current_user_name: 'Restart Operator' });
    first.database.close();
    const second = await openRepository(databasePath, migrationName);
    expect(await second.repository.query('SELECT report_name, printed_by FROM inventory_transfer_print_runs WHERE picking_id = ?', ['delivery-print-0001'])).toEqual([{ report_name: 'Picking Operations', printed_by: 'Restart Operator' }]);
    expect(await second.repository.query('SELECT printed, row_version FROM inventory_pickings WHERE id = ?', ['delivery-print-0001'])).toEqual([{ printed: true, row_version: 2 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });

    const permissionDb = await openRepository();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', company_name: 'Core3 Demo Company', roles: ['user'], permissions: ['inventory.read'] };
    const apiHandler = createYamlApi({
      repository: permissionDb.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-print-test', eventStore: {}, topics: {},
    });
    const request = (actionPath: string, values: any) => {
      const { id, expected_row_version, ...formValues } = values;
      return apiHandler(new Request(`http://inventory.test/api/actions/${actionPath}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, expected_row_version, values: formValues }) }), new URL(`http://inventory.test/api/actions/${actionPath}`));
    };
    await expect(request('stock.picking.do_print_picking', { id: 'delivery-print-0001', expected_row_version: 1, ...actor })).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
    const doneResponse = await request('stock.action_report_delivery', { id: 'delivery-print-0002', expected_row_version: 1, ...actor, current_user_name: 'Inventory Reader' });
    expect(doneResponse.status).toBe(200);
    permissionDb.database.close();
  });
});
