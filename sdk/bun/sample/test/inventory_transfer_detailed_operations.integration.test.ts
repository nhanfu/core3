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
const transferPage = yaml('pages/transfer-detail.yaml');
const transferApi = yaml('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_detailed_operations_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory transfer detailed operations parity', () => {
  test('keeps Odoo action_detailed_operations in a separate contextual page/API contract', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const sourceMoveLines = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_move_line_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(transferPage.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_detailed_operations', label: 'Moves', permission: 'inventory.read', value_field: 'move_count' }),
    ]));
    expect(transferApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_detailed_operations', navigate_to: '/inventory/transfer/detailed-operations', params: { picking_id: '{state.inventory_transfer_detail.id}' } }),
    ]));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining([
      'inventory_transfer_detailed_operations_context', 'inventory_transfer_detailed_operations',
    ]));
    expect(sourceView).toContain('name="action_detailed_operations"');
    expect(sourceModel).toContain("def action_detailed_operations(self):");
    expect(sourceModel).toContain("'domain': [('picking_id', '=', self.id)]");
    expect(sourceModel).toContain("'default_picking_id': self.id");
    expect(sourceMoveLines).toContain('id="view_move_line_tree_detailed"');
    expect(sourceMoveLines).toContain('<field name="picking_id"');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...transferPage, actions: transferApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/inventory/transfer/detailed-operations');
  });

  test('filters detailed operations by picking and company with deterministic fields', async () => {
    const { database, repository } = await openRepository();
    const context = source('inventory_transfer_detailed_operations_context');
    const operations = source('inventory_transfer_detailed_operations');

    expect(await repository.querySource(context, { picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).toMatchObject({
      data: { transfer_name: 'WH/OUT/DETAIL/0001', operation_type_name: 'Deliveries', operation_count: 1, state: 'Ready' },
    });
    expect((await repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null,
    }, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'delivery-detailed-0001-line-001', reference: 'WH/OUT/DETAIL/0001',
      product_name: '[E-COM08] Storage Box', source_location: 'Stock', destination_location: 'Customers',
      quantity: 2, state: 'Assigned', picking_partner_name: 'Detailed Operations Customer',
    })]);
    expect((await repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: 'customers', fixture_state: null,
    }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Other Company', q: null, fixture_state: null,
    })).data).toEqual([]);
    expect((await repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: 'empty',
    })).data).toEqual([]);
    await expect(repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: 'transport_error',
    })).rejects.toMatchObject({ status: 503, code: 'INVENTORY_DETAILED_OPERATIONS_UNAVAILABLE' });
    database.close();
  });

  test('enforces read permission and contextual route access without exposing management actions', async () => {
    const { database, repository } = await openRepository();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const denied = { ...reader, permissions: [] };
    const makeApi = (user: any) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([[page.page.id, api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([[page.page.id, page]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-detailed-operations-test', eventStore: {}, topics: {},
    });
    const url = 'http://inventory.test/api/pages/transfer-detailed-operations?picking_id=delivery-detailed-0001&current_company_name=Core3%20Demo%20Company';
    const response = await makeApi(reader)(new Request(url, { headers: { Authorization: 'Bearer test-token' } }), new URL(url));
    expect(response.status).toBe(200);
    await expect(makeApi(denied)(new Request(url, { headers: { Authorization: 'Bearer test-token' } }), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'back_to_inventory_transfer_from_detailed_operations', type: 'navigate' }),
      expect.objectContaining({ id: 'view_inventory_detailed_operation', type: 'navigate', navigate_to: '/moves/detail' }),
    ]));
    database.close();
  });

  test('replays the migration and preserves the contextual operation after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-detailed-operations-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const operations = source('inventory_transfer_detailed_operations');
    expect((await first.repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null,
    }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'delivery-detailed-0001-line-001', row_version: 1 })]));
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT picking_id FROM inventory_move_lines WHERE id = ?', ['delivery-detailed-0001-line-001'])).toEqual([{ picking_id: 'delivery-detailed-0001' }]);
    expect((await second.repository.querySource(operations, {
      picking_id: 'delivery-detailed-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null,
    }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ reference: 'WH/OUT/DETAIL/0001' })]));
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
