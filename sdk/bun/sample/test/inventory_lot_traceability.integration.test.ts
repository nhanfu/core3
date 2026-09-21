import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/lot-traceability.yaml');
const api = yaml('api/lot-traceability.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'record_inventory_lot_traceability');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory lot traceability parity', () => {
  test('keeps the Odoo lot stat action, page/API split, and report contract aligned', () => {
    const detail = yaml('pages/lot-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'lot-traceability', route: '/lots/traceability' });
    expect(detail.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_lot_traceability', permission: 'inventory.tracking' }));
    expect(discovered.pages.get('lot-traceability')?.config.page.id).toBe('lot-traceability');
    expect(discovered.pageDatasources.get('lot-traceability')).toEqual(expect.arrayContaining(['inventory_lot_traceability_context', 'inventory_lot_traceability_lines', 'inventory_lot_traceability_runs']));
    expect(api.page.id).toBe('lot-traceability');
    expect(list.columns.map((column: any) => column.label)).toEqual(['Reference', 'Product', 'Date', 'Lot/Serial Number', 'From', 'To', 'Quantity', 'Unit']);
    expect(api.actions.find((candidate: any) => candidate.id === 'print_inventory_lot_traceability')).toMatchObject({ type: 'client', permission: 'inventory.tracking' });
    expect(action).toMatchObject({ type: 'server', permission: 'inventory.tracking', action: 'inventory.lots.print_traceability', operation: 'report' });
  });

  test('serves deterministic traceability context/lines and records a guarded report run', async () => {
    const db = await repository('inventory_lot_traceability_test');
    const context = api.datasources.find((source: any) => source.id === 'inventory_lot_traceability_context');
    const lines = api.datasources.find((source: any) => source.id === 'inventory_lot_traceability_lines');
    expect(await db.querySource(context, { id: 'lot-traceable-0001', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { id: 'lot-traceable-0001', lot_name: 'TRACE-LOT-0001', line_count: 1 } });
    expect((await db.querySource(lines, { id: 'lot-traceable-0001', current_company_name: 'Core3 Demo Company' }, 0, 10)).data).toEqual([
      expect.objectContaining({ id: 'trace-move-line-0001', reference: 'WH/IN/TRACE/0001', lot_name: 'TRACE-LOT-0001', source_location: 'Vendors', destination_location: 'Stock', quantity: 15 }),
    ]);
    const result = await db.executeMutation(action.mutation, { lot_id: 'lot-traceable-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' });
    expect(result).toMatchObject({ id: 'lot-traceability-lot-traceable-0001-2', lot_id: 'lot-traceable-0001', report_name: 'Traceability Report', output_format: 'PDF', line_count: 1, requested_by: 'Admin User' });
    expect((await db.querySource(api.datasources.find((source: any) => source.id === 'inventory_lot_traceability_runs'), { id: 'lot-traceable-0001', current_company_name: 'Core3 Demo Company' }, 0, 10)).data[0]).toMatchObject({ id: 'lot-traceability-lot-traceable-0001-2', output_format: 'PDF' });
  });

  test('rejects stale, wrong-company, empty, and anonymous report requests', async () => {
    const db = await repository('inventory_lot_traceability_guards_test');
    const base = { lot_id: 'lot-traceable-0001', company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRACEABILITY_STALE' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 1, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRACEABILITY_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...base, lot_id: 'lot-cable-empty', expected_row_version: 1, current_company_name: '', company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRACEABILITY_EMPTY' });
    await expect(db.executeMutation(action.mutation, { ...base, expected_row_version: 1, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRACEABILITY_ACTOR_REQUIRED' });
  });

  test('preserves report history through restart and enforces tracking permission', async () => {
    const databasePath = `/tmp/core3-inventory-traceability-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_traceability_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { lot_id: 'lot-traceable-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT lot_name, line_count, output_format FROM inventory_lot_traceability_runs WHERE id = ?', ['lot-traceability-lot-traceable-0001-2'])).toEqual([{ lot_name: 'TRACE-LOT-0001', line_count: 1, output_format: 'PDF' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_lot_traceability_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['lot-traceability', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['lot-traceability', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.tracking'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-traceability-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.lots.print_traceability', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lot_id: 'lot-traceable-0001', expected_row_version: 1, values: {} }) }), new URL('http://inventory.test/api/actions/inventory.lots.print_traceability'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.tracking' });
  });
});
