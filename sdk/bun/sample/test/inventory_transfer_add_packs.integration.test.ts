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
const action = api.actions.find((candidate: any) => candidate.id === 'add_inventory_entire_package');
const packages = api.datasources.find((candidate: any) => candidate.id === 'inventory_transfer_add_pack_packages');
const additions = api.datasources.find((candidate: any) => candidate.id === 'inventory_transfer_package_additions');

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_add_packs_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository: result, migrationName };
}

const values = {
  id: 'delivery-entire-pack-0001',
  package_id: 'package-main-0001',
  expected_row_version: 1,
  current_company_name: 'My Company (San Francisco)',
  current_user_name: 'Inventory Operator',
};

describe('Inventory transfer entire-package parity', () => {
  test('maps Odoo action_add_entire_packs to separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const additionList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'inventory_transfer_package_additions');
    const stockSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const stockView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'add_inventory_entire_package', label: 'Add Entire Package', permission: 'inventory.write' }));
    expect(additionList).toMatchObject({ source: 'inventory_transfer_package_additions', row_key: 'id' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.action_add_entire_packs', operation: 'add_entire_package', handler: 'yaml_mutation' });
    expect(action.fields).toContainEqual(expect.objectContaining({ field: 'package_id', options_source: 'inventory_transfer_add_pack_packages', required: true }));
    expect(packages).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(additions).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(stockSource).toContain('def action_add_entire_packs(self, package_ids):');
    expect(stockSource).toContain("self.env['stock.package'].search([('id', 'child_of', package_ids)])");
    expect(stockSource).toContain('self._prepare_entire_pack_move_line_vals(all_packages)');
    expect(stockView).toContain('name="action_see_packages"');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('adds package contents as durable transfer moves and links the source package', async () => {
    const { database, repository } = await openRepository();
    expect((await repository.querySource(packages, { id: values.id, current_company_name: values.current_company_name }, 0, 20)).data).toEqual([
      expect.objectContaining({ value: 'package-main-0001', label: 'PACK0000001', content_count: 3 }),
    ]);

    const created = await repository.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({ id: 'transfer-entire-pack-delivery-entire-pack-0001-1', picking_id: values.id, package_id: values.package_id, package_name: 'PACK0000001', company_name: values.current_company_name, content_count: 3, added_by: values.current_user_name, state: 'Added', row_version: 1 });
    expect(await repository.query('SELECT product_name, quantity FROM inventory_picking_moves WHERE picking_id = ? ORDER BY id', [values.id])).toEqual([
      { product_name: '[FURN_8855] Drawer', quantity: 80 },
      { product_name: '[E-COM08] Storage Box', quantity: 18 },
      { product_name: '[FURN_5555] Cable Management Box', quantity: 50 },
    ]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_package_move_lines WHERE move_id LIKE ?', [`${created.id}-move-%`])).toEqual([{ count: 3 }]);
    expect(await repository.query('SELECT row_version FROM inventory_pickings WHERE id = ?', [values.id])).toEqual([{ row_version: 2 }]);
    expect((await repository.querySource(additions, { id: values.id, current_company_name: values.current_company_name, fixture_state: null }, 0, 20)).data).toEqual([
      expect.objectContaining({ package_name: 'PACK0000001', content_count: 3, added_by: 'Inventory Operator' }),
    ]);
    database.close();
  });

  test('enforces missing, company, actor, state, duplicate, and stale guards', async () => {
    const { database, repository } = await openRepository();
    await expect(repository.executeMutation(action.mutation, { ...values, id: 'missing-transfer' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRANSFER_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_PACK_COMPANY' });
    await expect(repository.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_PACK_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...values, package_id: 'package-empty-0004' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_PACKAGE_EMPTY' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PACK_NOT_ALLOWED' });
    await repository.executeMutation(action.mutation, values);
    await expect(repository.executeMutation(action.mutation, values)).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PACK_NOT_ALLOWED' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_PACKAGE_DUPLICATE' });
    database.close();
  });

  test('survives restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-add-packs-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_add_packs_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await openRepository(databasePath, migrationName);
    await first.repository.executeMutation(action.mutation, values);
    first.database.close();
    const second = await openRepository(databasePath, migrationName);
    expect(await second.repository.query('SELECT package_name, content_count FROM inventory_transfer_package_additions WHERE picking_id = ?', [values.id])).toEqual([{ package_name: 'PACK0000001', content_count: 3 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });

    const permissionDb = await openRepository();
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb.repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-add-packs-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_add_entire_packs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.picking.action_add_entire_packs'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
    permissionDb.database.close();
  });
});
