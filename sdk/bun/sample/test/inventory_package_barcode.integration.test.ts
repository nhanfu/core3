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
const page = yaml('pages/package-detail.yaml');
const api = yaml('api/package-detail.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'print_inventory_package_barcode');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  id: 'package-main-0001',
  expected_row_version: 1,
  current_company_name: 'My Company (San Francisco)',
  current_user_id: 'user-admin',
  current_user_name: 'Inventory Operator',
};

describe('Inventory package barcode report parity', () => {
  test('keeps the Odoo package report in separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const sourcePackage = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_package_views.xml', 'utf8');
    const sourceReports = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/stock_report_views.xml', 'utf8');
    const sourceTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/stock/report/report_package_barcode.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'package-detail', route: '/packages/detail' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'print_inventory_package_barcode', label: 'Print Barcode', permission: 'inventory.tracking' }));
    expect(page.components).toContainEqual(expect.objectContaining({ type: 'ListView', source: 'inventory_package_barcode_runs' }));
    expect(api.page.id).toBe(page.page.id);
    expect(action).toMatchObject({ type: 'server', permission: 'inventory.tracking', action: 'stock.action_report_package_barcode', operation: 'print_report', handler: 'yaml_mutation' });
    expect(source('inventory_package_barcode_runs').query).toContain('inventory_package_barcode_runs');
    expect(sourcePackage).toContain('id="menu_package"');
    expect(sourcePackage).toContain('action="action_package_view"');
    expect(sourceReports).toContain('id="action_report_package_barcode"');
    expect(sourceReports).toContain('<field name="name">Package Barcode with Contents</field>');
    expect(sourceTemplate).toContain('id="report_package_barcode"');
    expect(sourceTemplate).toContain('child_package');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('prepares one durable PDF barcode report and replays migrations idempotently', async () => {
    const db = await repository('inventory_package_barcode_create_test');
    const result = await db.executeMutation(action.mutation, values) as any;
    expect(result).toMatchObject({
      id: 'package-barcode-package-main-0001-1',
      package_id: 'package-main-0001',
      package_name: 'PACK0000001',
      report_name: 'Package Barcode with Contents',
      report_action: 'stock.action_report_package_barcode',
      output_format: 'PDF',
      content_count: 2,
      printed_by: 'Inventory Operator',
      row_version: 1,
    });
    expect(await db.query('SELECT row_version FROM inventory_packages WHERE id = ?', ['package-main-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_package_barcode_runs'), { id: 'package-main-0001', current_company_name: values.current_company_name }, 0, 10)).data).toEqual([
      expect.objectContaining({ package_name: 'PACK0000001', content_count: 2, printed_by: 'Inventory Operator' }),
    ]);
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_package_barcode_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_barcode_runs')).toEqual([{ count: 1 }]);
  });

  test('enforces company, actor, current-row, and non-empty package guards', async () => {
    const db = await repository('inventory_package_barcode_guards_test');
    await expect(db.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PACKAGE_BARCODE_COMPANY' });
    await expect(db.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PACKAGE_BARCODE_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_BARCODE_NOT_ALLOWED' });
    await expect(db.executeMutation(action.mutation, { ...values, id: 'package-empty-0004' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PACKAGE_BARCODE_NOT_ALLOWED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_package_barcode_runs')).toEqual([{ count: 0 }]);
  });

  test('preserves report history across restart and enforces the tracking permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-package-barcode-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_package_barcode_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT package_name, report_name, printed_by, content_count FROM inventory_package_barcode_runs WHERE package_id = ?', ['package-main-0001'])).toEqual([
      { package_name: 'PACK0000001', report_name: 'Package Barcode with Contents', printed_by: 'Restart Operator', content_count: 2 },
    ]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_package_barcode_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([['package-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['package-detail', { ...page, actions: api.actions }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.tracking'], tables: {}, endpoints: {} },
      uploadRoot: '/tmp/core3-inventory-package-barcode-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.action_report_package_barcode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.action_report_package_barcode'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.tracking' });
  });
});
