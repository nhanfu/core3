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
const api = yaml('api/quant-history.yaml');
const page = yaml('pages/quant-history.yaml');
const stockApi = yaml('api/stock.yaml');
const stockPage = yaml('pages/stock.yaml');
const context = api.datasources.find((candidate: any) => candidate.id === 'inventory_quant_history_context');
const lines = api.datasources.find((candidate: any) => candidate.id === 'inventory_quant_history_lines');
const runs = api.datasources.find((candidate: any) => candidate.id === 'inventory_quant_history_runs');
const action = api.actions.find((candidate: any) => candidate.id === 'record_inventory_quant_history');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory quant move history parity', () => {
  test('maps Odoo quant History to a separate contextual page/API contract', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_quant_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_quant.py', 'utf8');
    const moveView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_move_line_views.xml', 'utf8');
    const list = page.components[1];

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: 'quant-history' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining([
      'inventory_quant_history_context', 'inventory_quant_history_lines', 'inventory_quant_history_runs',
    ]));
    expect(page.page.route).toBe('/stock/quant-history');
    expect(stockPage.components[0].columns.find((column: any) => column.field === 'actions').actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_quant_history', label: 'History' }));
    expect(stockApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_quant_history', navigate_to: '/stock/quant-history', params: { quant_id: '{row.id}' } }),
    ]));
    expect(list.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'refresh_inventory_quant_history', permission: 'inventory.read' }),
      expect.objectContaining({ id: 'back_to_inventory_stock_from_quant_history', permission: 'inventory.read' }),
    ]));
    expect(action).toMatchObject({ action: 'inventory.quants.history', handler: 'yaml_mutation', operation: 'report' });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_QUANT_HISTORY_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_QUANT_HISTORY_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_QUANT_HISTORY_ACTOR_REQUIRED' }),
    ]));
    expect(sourceView).toContain('name="action_view_stock_moves" string="History"');
    expect(sourceView).toContain("id=\"menu_valuation\" name=\"Locations\"");
    expect(sourceModel).toContain('def action_view_stock_moves(self):');
    expect(sourceModel).toContain("('location_id', '=', self.location_id.id)");
    expect(sourceModel).toContain("('lot_id', '=', self.lot_id.id)");
    expect(sourceModel).toContain("search_default_product_id");
    expect(moveView).toContain('id="stock_move_line_action"');
    expect(moveView).toContain("'search_default_done': 1");
    expect(moveView).toContain('Moves History');
    expect(api.datasources.find((candidate: any) => candidate.id === 'inventory_quant_history_lines').query).toContain('m.source_location_id = q.location_id OR m.destination_location_id = q.location_id');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('returns deterministic company-scoped quant movements and seeded report history', async () => {
    const db = await repository('inventory_quant_history_fixture');
    const params = { quant_id: 'quant-box-main', current_company_name: 'Core3 Demo Company', q: null, state: 'done', movement_type: null, fixture_state: null };
    expect(await db.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'quant-box-main', product_name: '[E-COM08] Storage Box', location_name: 'Stock', history_count: 2 } });
    expect((await db.querySource(lines, params, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'quant-history-move-out-0001', reference: 'WH/OUT/HISTORY/0001', source_location: 'Stock', destination_location: 'Customers', quantity: 4, state: 'Done' }),
      expect.objectContaining({ id: 'quant-history-move-in-0001', reference: 'WH/IN/HISTORY/0001', source_location: 'Vendors', destination_location: 'Stock', quantity: 12, state: 'Done' }),
    ]);
    expect((await db.querySource(lines, { ...params, q: 'HISTORY/0001' }, 0, 50)).data).toHaveLength(2);
    expect((await db.querySource(lines, { ...params, movement_type: 'incoming' }, 0, 50)).data).toHaveLength(1);
    expect((await db.querySource(lines, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(runs, params, 0, 50)).data).toEqual([expect.objectContaining({ id: 'quant-history-run-0001', line_count: 2, requested_by: 'Seeded Inventory' })]);
    expect((await db.querySource(context, { ...params, current_company_name: 'My Company (San Francisco)' }, 0, 1)).data).toEqual({});
  });

  test('records a durable history request with actor/company/stale guards', async () => {
    const db = await repository('inventory_quant_history_mutation');
    const base = { quant_id: 'quant-box-main', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' };
    expect(await db.executeMutation(action.mutation, base)).toMatchObject({ id: 'quant-history-quant-box-main-2', quant_id: 'quant-box-main', line_count: 2, requested_by: 'Admin User' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_quant_history_runs WHERE quant_id = ?', ['quant-box-main'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(action.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_QUANT_HISTORY_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_QUANT_HISTORY_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_QUANT_HISTORY_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, quant_id: 'quant-cabinet-main' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_QUANT_HISTORY_EMPTY' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_quant_history_runs WHERE quant_id = ?', ['quant-cabinet-main'])).toEqual([{ count: 0 }]);
  });

  test('persists history across restart and denies users without inventory.read', async () => {
    const databasePath = `/tmp/core3-inventory-quant-history-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_quant_history_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action.mutation, { quant_id: 'quant-box-main', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, line_count FROM inventory_quant_history_runs WHERE id = ?', ['quant-history-quant-box-main-2'])).toEqual([{ requested_by: 'Restart Operator', line_count: 2 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: [] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['quant-history', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['quant-history', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { quant_id: 'quant-box-main', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.quants.history'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
