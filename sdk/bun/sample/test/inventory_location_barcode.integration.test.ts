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
const page = yaml('pages/location-detail.yaml');
const api = yaml('api/location-detail.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'print_inventory_location_barcode');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'location-stock',
  expected_row_version: 1,
  company_name: 'My Company (San Francisco)',
  current_company_name: 'My Company (San Francisco)',
  current_user_id: 'user-inventory',
  current_user_name: 'Inventory Operator',
};

describe('Inventory location barcode report parity', () => {
  test('keeps the Odoo report in separate page/API contracts joined by page id', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const sourceMenu = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_location_views.xml', 'utf8');
    const sourceReports = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/stock_report_views.xml', 'utf8');
    const sourceTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/report_location_barcode.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'location-detail', route: '/locations/detail' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'print_inventory_location_barcode', label: 'Print Barcode', permission: 'inventory.read' }));
    expect(page.components).toContainEqual(expect.objectContaining({ type: 'ListView', source: 'inventory_location_barcode_runs' }));
    expect(api.page.id).toBe(page.page.id);
    expect(action).toMatchObject({ type: 'server', permission: 'inventory.read', action: 'stock.action_report_location_barcode', operation: 'print_report', handler: 'yaml_mutation' });
    expect(source('inventory_location_barcode_runs').query).toContain('inventory_location_barcode_runs');
    expect(sourceMenu).toContain('menu_action_location_form');
    expect(sourceMenu).toContain('action="action_location_form"');
    expect(sourceReports).toContain('id="action_report_location_barcode"');
    expect(sourceReports).toContain('<field name="name">Location Barcode</field>');
    expect(sourceReports).toContain('<field name="model">stock.location</field>');
    expect(sourceTemplate).toContain('id="report_location_barcode"');
    expect(sourceTemplate).toContain('t-field="o.barcode"');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('prepares one durable PDF report, records history, and replays migrations idempotently', async () => {
    const db = await repository('inventory_location_barcode_create_test');
    expect((await db.querySource(source('inventory_location_barcode_runs'), { id: 'location-stock', current_company_name: values.current_company_name }, 0, 10)).data).toEqual([
      expect.objectContaining({ id: 'location-barcode-location-stock-1', location_name: 'Stock', report_name: 'Location Barcode', output_format: 'PDF' }),
    ]);
    const result = await db.executeMutation(action.mutation, values) as any;
    expect(result).toMatchObject({
      id: 'location-barcode-location-stock-2',
      location_id: 'location-stock',
      location_name: 'Stock',
      report_name: 'Location Barcode',
      report_action: 'stock.action_report_location_barcode',
      output_format: 'PDF',
      printed_by: 'Inventory Operator',
      row_version: 1,
    });
    expect(await db.query('SELECT row_version FROM inventory_locations WHERE id = ?', ['location-stock'])).toEqual([{ row_version: 1 }]);
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_location_barcode_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_location_barcode_runs')).toEqual([{ count: 2 }]);
  });

  test('enforces missing, company, actor, and stale guards', async () => {
    const db = await repository('inventory_location_barcode_guards_test');
    await expect(db.executeMutation(action.mutation, { ...values, id: 'location-missing' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOCATION_BARCODE_NOT_FOUND' });
    await expect(db.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOCATION_BARCODE_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOCATION_BARCODE_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOCATION_BARCODE_STALE' });
    await expect(db.executeMutation(action.mutation, { ...values, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOCATION_BARCODE_COMPANY_MISMATCH' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_location_barcode_runs')).toEqual([{ count: 1 }]);
  });

  test('preserves report history across restart and enforces the read permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-location-barcode-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_location_barcode_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT location_name, report_name, printed_by FROM inventory_location_barcode_runs WHERE location_id = ? ORDER BY id', ['location-stock'])).toEqual([
      { location_name: 'Stock', report_name: 'Location Barcode', printed_by: 'Inventory Fixture' },
      { location_name: 'Stock', report_name: 'Location Barcode', printed_by: 'Restart Operator' },
    ]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_location_barcode_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.write'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([['location-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['location-detail', { ...page, actions: api.actions }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} },
      uploadRoot: '/tmp/core3-inventory-location-barcode-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.action_report_location_barcode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.action_report_location_barcode'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
  });
});
