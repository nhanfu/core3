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
const page = yaml('pages/transfer-traceability.yaml');
const api = yaml('api/transfer-traceability.yaml');
const transferPage = yaml('pages/transfer-detail.yaml');
const transferApi = yaml('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_traceability_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory transfer traceability parity', () => {
  test('maps the Odoo transfer Traceability stat to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceReport = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/stock_traceability.py', 'utf8');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.route).toBe('/inventory/transfer/traceability');
    expect(transferPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_traceability', label: 'Traceability', permission: 'inventory.tracking', value_field: 'traceability_count' }));
    expect(transferApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_traceability', navigate_to: '/inventory/transfer/traceability', params: { picking_id: '{state.inventory_transfer_detail.id}', row_version: '{state.inventory_transfer_detail.row_version}', company_name: '{state.inventory_transfer_detail.company_name}' } }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_traceability_context', 'inventory_transfer_traceability_lines', 'inventory_transfer_traceability_runs']));
    expect(action('record_inventory_transfer_traceability')).toMatchObject({ type: 'server', permission: 'inventory.tracking', action: 'inventory.transfers.print_traceability', operation: 'report' });
    expect(sourceView).toContain('name="%(action_stock_report)d"');
    expect(sourceView).toContain('>Traceability</span>');
    expect(sourceReport).toContain("model in ('stock.picking', 'mrp.production')");
    expect(sourceReport).toContain("model == 'stock.picking'");
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('serves deterministic transfer-scoped traceability lines and records a PDF run', async () => {
    const { database, repository } = await openRepository();
    const params = { picking_id: 'delivery-transfer-traceability-0001', current_company_name: 'Core3 Demo Company' };
    expect(await repository.querySource(source('inventory_transfer_traceability_context'), params, 0, 1)).toMatchObject({ data: { transfer_name: 'WH/OUT/TRACE/0001', state: 'Done', line_count: 1 } });
    expect((await repository.querySource(source('inventory_transfer_traceability_lines'), params, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'transfer-trace-in-0001', lot_name: 'TRACE-TRANSFER-0001', source_transfer: false, quantity: 5 }),
      expect.objectContaining({ id: 'transfer-trace-out-0001', lot_name: 'TRACE-TRANSFER-0001', source_transfer: true, quantity: 5 }),
    ]);
    expect((await repository.querySource(source('inventory_transfer_traceability_runs'), params, 0, 10)).data).toEqual([expect.objectContaining({ id: 'transfer-traceability-delivery-transfer-traceability-0001-1', line_count: 2, output_format: 'PDF' })]);
    const result = await repository.executeMutation(action('record_inventory_transfer_traceability').mutation, { picking_id: 'delivery-transfer-traceability-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' });
    expect(result).toMatchObject({ id: 'transfer-traceability-delivery-transfer-traceability-0001-2', transfer_name: 'WH/OUT/TRACE/0001', line_count: 2, requested_by: 'Admin User' });
    database.close();
  });

  test('enforces transfer state, company, actor, stale, and empty guards', async () => {
    const { database, repository } = await openRepository();
    const mutation = action('record_inventory_transfer_traceability').mutation;
    const base = { picking_id: 'delivery-transfer-traceability-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    await expect(repository.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_TRACEABILITY_NOT_ALLOWED' });
    await expect(repository.executeMutation(mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_TRACEABILITY_COMPANY_MISMATCH' });
    await expect(repository.executeMutation(mutation, { ...base, current_company_name: 'Other Company', company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_TRACEABILITY_COMPANY' });
    await expect(repository.executeMutation(mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_TRACEABILITY_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(mutation, { ...base, picking_id: 'delivery-detailed-0001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_TRACEABILITY_NOT_ALLOWED' });
    database.close();
  });

  test('preserves report history across restart and denies readers the tracking action', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-traceability-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const mutation = action('record_inventory_transfer_traceability').mutation;
    await first.repository.executeMutation(mutation, { picking_id: 'delivery-transfer-traceability-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Restart Operator' });
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT transfer_name, line_count, output_format, requested_by FROM inventory_transfer_traceability_runs WHERE id = ?', ['transfer-traceability-delivery-transfer-traceability-0001-2'])).toEqual([{ transfer_name: 'WH/OUT/TRACE/0001', line_count: 2, output_format: 'PDF', requested_by: 'Restart Operator' }]);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: second.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-traceability', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-traceability', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.tracking'] }, eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.transfers.print_traceability', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { picking_id: 'delivery-transfer-traceability-0001', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.transfers.print_traceability'))).rejects.toMatchObject({ status: 403 });
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
