import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/transfer-detail.yaml');
const page = yaml('pages/transfer-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

function discoverInventoryOnly() {
  const isolatedRoot = mkdtempSync('/tmp/core3-inventory-discovery-');
  try {
    cpSync(serviceRoot, join(isolatedRoot, 'services/inventory'), { recursive: true });
    return discoverPages(isolatedRoot);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

async function repository(name: string, databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory Return All parity', () => {
  test('maps Odoo action_create_returns_all to the shared transfer page/API pair', () => {
    const discovered = discoverInventoryOnly();
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_picking_return_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_picking_return.py', 'utf8');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: 'transfer-detail' });
    expect(discovered.pages.get('transfer-detail')?.config.page.id).toBe('transfer-detail');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/inventory/transfer/detail', page: 'transfer-detail', module: 'inventory' });
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'return_all_inventory_transfer', label: 'Return All', permission: 'inventory.write' }));
    expect(action('return_all_inventory_transfer')).toMatchObject({ action: 'stock.picking.return.all', handler: 'yaml_mutation', operation: 'return_all', permission: 'inventory.write' });
    expect(action('return_all_inventory_transfer').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_TRANSFER_RETURN_ALL_NOT_ALLOWED' }),
      expect.objectContaining({ code: 'INVENTORY_TRANSFER_RETURN_ALL_LINES_REQUIRED' }),
      expect.objectContaining({ code: 'INVENTORY_TRANSFER_RETURN_ALL_ALREADY_RETURNED' }),
    ]));
    expect(sourceView).toContain('name="action_create_returns_all"');
    expect(sourceView).toContain('string="Return All"');
    expect(sourceModel).toContain('def action_create_returns_all(self):');
    expect(sourceModel).toContain('return_move.quantity = quantity');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('seeds deterministic multi-line Done transfer data', async () => {
    const { database, repository: db } = await repository('inventory_transfer_return_all_fixture');
    expect(await db.query('SELECT name, state, row_version FROM inventory_pickings WHERE id = ?', ['delivery-return-all-0001'])).toEqual([{ name: 'WH/OUT/RETURN-ALL/0001', state: 'Done', row_version: 1 }]);
    expect(await db.query('SELECT product_name, quantity, done_quantity FROM inventory_picking_moves WHERE picking_id = ? ORDER BY id', ['delivery-return-all-0001'])).toEqual([
      { product_name: '[E-COM08] Storage Box', quantity: 4, done_quantity: 4 },
      { product_name: '[E-COM07] Large Cabinet', quantity: 2, done_quantity: 2 },
    ]);
    expect((await db.querySource(source('inventory_transfer_detail'), { id: 'delivery-return-all-0001', fixture_state: null }, 0, 1)).data).toMatchObject({ move_count: 2, return_count: 0 });
    database.close();
  });

  test('creates one reverse transfer with every completed move and guards actor/company/stale state', async () => {
    const { database, repository: db } = await repository('inventory_transfer_return_all_mutation');
    const mutation = action('return_all_inventory_transfer').mutation;
    const base = { id: 'delivery-return-all-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', reason: 'Customer return all' };

    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_RETURN_ALL_NOT_ALLOWED' });
    expect(await db.executeMutation(mutation, base)).toMatchObject({ id: 'return-all-run-delivery-return-all-0001-1', return_picking_id: 'return-all-delivery-return-all-0001-1', return_quantity: 6, returned_by: 'Inventory Operator', reason: 'Customer return all' });
    expect(await db.query('SELECT product_name, quantity FROM inventory_picking_moves WHERE picking_id = ? ORDER BY id', ['return-all-delivery-return-all-0001-1'])).toEqual([
      { product_name: '[E-COM08] Storage Box', quantity: 4 },
      { product_name: '[E-COM07] Large Cabinet', quantity: 2 },
    ]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_return_lines WHERE return_run_id = ?', ['return-all-run-delivery-return-all-0001-1'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_RETURN_ALL_ALREADY_RETURNED' });
    database.close();
  });

  test('persists Return All across restart and denies readers without inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-return-all-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_return_all_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await repository(migrationName, databasePath);
      await first.repository.executeMutation(action('return_all_inventory_transfer').mutation, { id: 'delivery-return-all-0001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Restart Operator', reason: 'Restart proof' });
      first.database.close();
      const second = await repository(migrationName, databasePath);
      expect(await second.repository.query('SELECT return_quantity, returned_by FROM inventory_transfer_returns WHERE source_picking_id = ?', ['delivery-return-all-0001'])).toEqual([{ return_quantity: 6, returned_by: 'Restart Operator' }]);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_return_lines WHERE source_picking_id = ?', ['delivery-return-all-0001'])).toEqual([{ count: 2 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: second.repository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.return.all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { id: 'delivery-return-all-0001', expected_row_version: 2 } }) }), new URL('http://inventory.test/api/actions/stock.picking.return.all'))).rejects.toMatchObject({ status: 403 });
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
