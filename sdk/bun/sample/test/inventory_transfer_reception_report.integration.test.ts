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
const page = yaml('pages/transfer-reception-report.yaml');
const api = yaml('api/transfer-reception-report.yaml');
const transferPage = yaml('pages/transfer-detail.yaml');
const transferApi = yaml('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_reception_report_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory transfer reception report parity', () => {
  test('maps the Odoo Allocation action to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceReport = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/report_stock_reception.py', 'utf8');
    const sourceReportView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/report_stock_reception.xml', 'utf8');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.route).toBe('/inventory/transfer/reception-report');
    expect(transferPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_reception_report', label: 'Allocation', permission: 'inventory.read', value_field: 'reception_report_count' }));
    expect(transferApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_reception_report', navigate_to: '/inventory/transfer/reception-report', params: { picking_id: '{state.inventory_transfer_detail.id}', row_version: '{state.inventory_transfer_detail.row_version}', company_name: '{state.inventory_transfer_detail.company_name}' } }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_reception_report_context', 'inventory_transfer_reception_report_lines', 'inventory_transfer_reception_report_events', 'inventory_transfer_reception_report_runs']));
    expect(action('record_inventory_transfer_reception_report')).toMatchObject({ type: 'server', permission: 'inventory.read', action: 'inventory.transfers.reception_report.open', operation: 'report' });
    expect(action('assign_all_inventory_reception')).toMatchObject({ type: 'server', permission: 'inventory.write', action: 'inventory.transfers.reception_report.assign_all' });
    expect(sourceView).toContain('name="action_view_reception_report"');
    expect(sourceView).toContain('>Allocation</span>');
    expect(sourceView).toContain('groups="stock.group_reception_report"');
    expect(sourceReport).toContain('def action_assign');
    expect(sourceReport).toContain('def action_unassign');
    expect(sourceReportView).toContain('id="stock_reception_action"');
    expect(sourceReportView).toContain('tag">reception_report</field>');
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('serves deterministic allocation lines and records a report run', async () => {
    const { database, repository } = await openRepository();
    const params = { picking_id: 'receipt-reception-report-0001', current_company_name: 'Core3 Demo Company' };
    expect(await repository.querySource(source('inventory_transfer_reception_report_context'), params, 0, 1)).toMatchObject({ data: { transfer_name: 'WH/IN/RECEPTION/0001', state: 'Ready', line_count: 1, assigned_count: 0 } });
    expect((await repository.querySource(source('inventory_transfer_reception_report_lines'), { ...params, q: null, fixture_state: null }, 0, 20)).data).toEqual([
      expect.objectContaining({ id: 'reception-line-0001', source_reference: 'WH/OUT/RECEPTION/0001', source_document: 'SO/RECEPTION/0001', product_name: '[E-COM01] Office Chair', quantity: 6, assigned_quantity: 0, is_qty_assignable: true, is_assigned: false, state: 'Waiting' }),
    ]);
    expect((await repository.querySource(source('inventory_transfer_reception_report_runs'), params, 0, 10)).data).toEqual([expect.objectContaining({ id: 'reception-report-receipt-reception-report-0001-1', line_count: 1, assigned_count: 0 })]);
    const result = await repository.executeMutation(action('record_inventory_transfer_reception_report').mutation, { picking_id: 'receipt-reception-report-0001', expected_row_version: 1, company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' });
    expect(result).toMatchObject({ id: 'reception-report-receipt-reception-report-0001-2', transfer_name: 'WH/IN/RECEPTION/0001', line_count: 1, assigned_count: 0, requested_by: 'Admin User' });
    expect(await repository.query('SELECT action, quantity, actor_name FROM inventory_reception_report_events WHERE id = ?', ['reception-report-open-reception-report-receipt-reception-report-0001-2'])).toEqual([{ action: 'inventory.reception.report_opened', quantity: 1, actor_name: 'Admin User' }]);
    database.close();
  });

  test('supports assign, unassign, and Assign All with permission/company/stale guards', async () => {
    const { database, repository } = await openRepository();
    const base = { picking_id: 'receipt-reception-report-0001', company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    const assign = action('assign_inventory_reception_line').mutation;
    const unassign = action('unassign_inventory_reception_line').mutation;
    const assigned = await repository.executeMutation(assign, { ...base, line_id: 'reception-line-0001', expected_row_version: 1 });
    expect(assigned).toMatchObject({ id: 'reception-line-0001', row_version: 2, assigned_quantity: 6, is_assigned: true, state: 'Assigned', assigned_by: 'Admin User' });
    await expect(repository.executeMutation(assign, { ...base, line_id: 'reception-line-0001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RECEPTION_ASSIGN_NOT_ALLOWED' });
    const unassigned = await repository.executeMutation(unassign, { ...base, line_id: 'reception-line-0001', expected_row_version: 2 });
    expect(unassigned).toMatchObject({ id: 'reception-line-0001', row_version: 3, assigned_quantity: 0, is_assigned: false, state: 'Waiting' });
    const assignedAll = await repository.executeMutation(action('assign_all_inventory_reception').mutation, { ...base, expected_row_version: 1 });
    expect(assignedAll).toMatchObject({ id: 'reception-assign-all-receipt-reception-report-0001-1', picking_id: 'receipt-reception-report-0001', line_count: 1, quantity: 6, assigned_by: 'Admin User' });
    await expect(repository.executeMutation(assign, { ...base, line_id: 'reception-line-0001', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_RECEPTION_ASSIGN_NOT_ALLOWED' });
    await expect(repository.executeMutation(assign, { ...base, line_id: 'reception-line-0001', expected_row_version: 4, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_RECEPTION_REPORT_COMPANY' });
    await expect(repository.executeMutation(unassign, { ...base, line_id: 'reception-line-0001', expected_row_version: 4, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_RECEPTION_REPORT_ACTOR_REQUIRED' });
    database.close();
  });

  test('preserves allocation history across restart and denies readers the write actions', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-reception-report-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const base = { picking_id: 'receipt-reception-report-0001', company_name: 'Core3 Demo Company', current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin', current_user_name: 'Restart Operator', expected_row_version: 1 };
    await first.repository.executeMutation(action('assign_all_inventory_reception').mutation, base);
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT assigned_quantity, is_assigned, state, assigned_by FROM inventory_reception_report_lines WHERE id = ?', ['reception-line-0001'])).toEqual([{ assigned_quantity: 6, is_assigned: true, state: 'Assigned', assigned_by: 'Restart Operator' }]);
    expect(await second.repository.query('SELECT COUNT(*) AS count FROM inventory_reception_report_events WHERE picking_id = ?', ['receipt-reception-report-0001'])).toEqual([{ count: 2 }]);
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: second.repository,
      authProvider: { async getCurrentUser() { return reader; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-reception-report', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-reception-report', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.write'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.transfers.reception_report.assign_all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { picking_id: 'receipt-reception-report-0001', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.transfers.reception_report.assign_all'))).rejects.toMatchObject({ status: 403 });
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
