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
const action = api.actions.find((candidate: any) => candidate.id === 'print_inventory_transfer_labels');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_lot_labels_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const actor = { current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator' };

describe('Inventory transfer Lot/SN Labels parity', () => {
  test('matches the Odoo label wizard branch in the paired page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceType = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_label_type.py', 'utf8');
    const sourceLayout = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_lot_label_layout.py', 'utf8');
    const sourceLayoutView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_lot_label_layout.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components.find((component: any) => component.type === 'OdooFormView').header_actions).toContainEqual(expect.objectContaining({ id: 'print_inventory_transfer_labels', label: 'Labels', permission: 'inventory.write' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_print_labels', operation: 'print_labels', handler: 'yaml_mutation' });
    expect(action.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'label_type', options: expect.arrayContaining([expect.objectContaining({ value: 'lots', label: 'Lot/SN Labels' })]) }),
      expect.objectContaining({ field: 'label_quantity', options: expect.arrayContaining([expect.objectContaining({ value: 'lots', label: 'One per lot/SN' }), expect.objectContaining({ value: 'units', label: 'One per unit' })]) }),
      expect.objectContaining({ field: 'print_format', options: expect.arrayContaining([expect.objectContaining({ value: '4x12', label: '4 x 12' }), expect.objectContaining({ value: 'zpl', label: 'ZPL Labels' })]) }),
    ]));
    expect(source('inventory_transfer_label_lots').query).toContain('inventory_transfer_label_lot_lines');
    expect(sourceView).toContain('<record id="action_print_labels"');
    expect(sourceType).toContain("('lots', 'Lot/SN Labels')");
    expect(sourceType).toContain("stock.lot_label_layout");
    expect(sourceLayout).toContain("('lots', 'One per lot/SN')");
    expect(sourceLayout).toContain("('units', 'One per unit')");
    expect(sourceLayout).toContain("('zpl', 'ZPL Labels')");
    expect(sourceLayoutView).toContain('name="label_quantity" widget="radio"');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('prepares one-per-lot and one-per-unit Lot/SN labels with durable history', async () => {
    const first = await openRepository();
    const lots = await first.repository.executeMutation(action.mutation, { id: 'delivery-labels-0001', expected_row_version: 1, ...actor, label_type: 'lots', label_quantity: 'lots', print_format: '4x12', output_format: 'PDF' }) as any;
    expect(lots).toMatchObject({ id: 'transfer-labels-delivery-labels-0001-1', label_type: 'lots', output_format: '4X12', label_count: 1, requested_by: 'Inventory Operator' });
    expect((await first.repository.querySource(source('inventory_transfer_label_lots'), { id: 'delivery-labels-0001', current_company_name: actor.current_company_name, fixture_state: null }, 0, 10)).data).toEqual([expect.objectContaining({ lot_name: 'TRACE-LOT-0001', quantity: 3 })]);
    expect((await first.repository.querySource(source('inventory_transfer_timeline'), { id: 'delivery-labels-0001', fixture_state: null }, 0, 20)).data).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'inventory.transfer.labels_printed', detail: 'Lot/SN labels prepared for printing' })]));
    const units = await first.repository.executeMutation(action.mutation, { id: 'delivery-labels-0001', expected_row_version: 2, ...actor, label_type: 'lots', label_quantity: 'units', print_format: 'zpl', output_format: 'PDF' }) as any;
    expect(units).toMatchObject({ id: 'transfer-labels-delivery-labels-0001-2', label_type: 'lots', output_format: 'ZPL', label_count: 3 });
    expect(await first.repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_label_runs WHERE picking_id = ?', ['delivery-labels-0001'])).toEqual([{ count: 2 }]);
    await migrateDatabase(first.repository, serviceRoot + '/migrations', undefined, 'inventory_transfer_lot_labels_replay', ['schema', 'data']);
    expect(await first.repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_label_lot_lines WHERE picking_id = ?', ['delivery-labels-0001'])).toEqual([{ count: 1 }]);
    first.database.close();
  });

  test('enforces tracked-lot, company, actor, format, and row-version guards', async () => {
    const { database, repository } = await openRepository();
    const base = { id: 'delivery-labels-0001', expected_row_version: 1, ...actor, label_type: 'lots', label_quantity: 'lots', print_format: '4x12', output_format: 'PDF' };
    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_LABELS_NOT_ALLOWED' });
    await expect(repository.executeMutation(action.mutation, { ...base, print_format: 'PDF' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_LABEL_FORMAT_UNSUPPORTED' });
    await repository.run("DELETE FROM inventory_transfer_label_lot_lines WHERE picking_id = 'delivery-labels-0001'");
    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_LOT_LABELS_NO_LOTS' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_label_runs')).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves Lot/SN label history across restart and protects the action by permission', async () => {
    const databasePath = `/tmp/core3-inventory-lot-labels-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_lot_labels_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await openRepository(databasePath, migrationName);
    await first.repository.executeMutation(action.mutation, { id: 'delivery-labels-0001', expected_row_version: 1, ...actor, label_type: 'lots', label_quantity: 'lots', print_format: '4x12', output_format: 'PDF' });
    first.database.close();
    const second = await openRepository(databasePath, migrationName);
    expect(await second.repository.query('SELECT label_type, output_format, requested_by, label_count FROM inventory_transfer_label_runs WHERE picking_id = ?', ['delivery-labels-0001'])).toEqual([{ label_type: 'lots', output_format: '4X12', requested_by: 'Inventory Operator', label_count: 1 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });

    const permissionDb = await openRepository();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-lot-labels-test', eventStore: {}, topics: {},
    });
    const request = new Request('http://inventory.test/api/actions/stock.picking.action_print_labels', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-labels-0001', expected_row_version: 1, ...actor, label_type: 'lots', label_quantity: 'lots', print_format: '4x12', output_format: 'PDF' } }) });
    await expect(handler(request, new URL(request.url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
    permissionDb.database.close();
  });
});
