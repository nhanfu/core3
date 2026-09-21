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
const action = api.actions.find((candidate: any) => candidate.id === 'split_inventory_transfer');
const detail = api.datasources.find((candidate: any) => candidate.id === 'inventory_transfer_detail');
const splits = api.datasources.find((candidate: any) => candidate.id === 'inventory_transfer_splits');

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_split_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const values = {
  id: 'delivery-split-0001',
  expected_row_version: 1,
  current_company_name: 'Core3 Demo Company',
  current_user_name: 'Inventory Operator',
};

describe('Inventory transfer split parity', () => {
  test('maps the Odoo form-bound split action to separate page/API contracts', () => {
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const splitList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'inventory_transfer_splits');
    const stockSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const stockView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'split_inventory_transfer', label: 'Split Transfer', permission: 'inventory.write' }));
    expect(splitList).toMatchObject({ source: 'inventory_transfer_splits', row_key: 'id' });
    expect(action).toMatchObject({ type: 'server', permission: 'inventory.write', action: 'stock.picking.action_split_transfer', operation: 'split_transfer', handler: 'yaml_mutation' });
    expect(action.mutation).toMatchObject({ concurrency: { required: true }, generated: ['split_id', 'split_move_id', 'split_run_id', 'message_id'] });
    expect(splits).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(stockView).toContain('<field name="name">Split</field>');
    expect(stockView).toContain('records.action_split_transfer()');
    expect(stockSource).toContain('def action_split_transfer(self):');
    expect(stockSource).toContain('moves._create_backorder()');
    expect(stockSource).toContain("Can't split: quantities done can't be above demand");
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('creates a durable Waiting split transfer for remaining quantities', async () => {
    const { database, repository } = await openRepository();
    expect((await repository.querySource(detail, { id: values.id, fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Ready', has_partial: true, split_count: 0, row_version: 1 });
    const created = await repository.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({ id: 'split-run-delivery-split-0001-1', source_picking_id: values.id, split_picking_id: 'split-delivery-split-0001-1', split_name: 'SPLIT/WH/OUT/SPLIT/0001/split-delivery-split-0001-1', company_name: values.current_company_name, line_count: 1, split_quantity: 6, split_by: values.current_user_name, state: 'Created', row_version: 1 });
    expect(await repository.query('SELECT split_of_id, state, row_version FROM inventory_pickings WHERE id = ?', [created.split_picking_id])).toEqual([{ split_of_id: values.id, state: 'Waiting', row_version: 1 }]);
    expect(await repository.query('SELECT product_name, quantity, done_quantity FROM inventory_picking_moves WHERE picking_id = ?', [created.split_picking_id])).toEqual([{ product_name: '[E-COM08] Storage Box', quantity: 6, done_quantity: 0 }]);
    expect(await repository.query('SELECT quantity, done_quantity FROM inventory_picking_moves WHERE id = ?', ['delivery-split-0001-move-001'])).toEqual([{ quantity: 4, done_quantity: 4 }]);
    expect((await repository.querySource(detail, { id: values.id, fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Done', has_partial: false, split_count: 1, row_version: 2 });
    expect((await repository.querySource(splits, { id: values.id, current_company_name: values.current_company_name, fixture_state: null }, 0, 10)).data).toEqual([expect.objectContaining({ split_name: created.split_name, split_quantity: 6, split_by: values.current_user_name })]);
    database.close();
  });

  test('enforces missing, company, actor, state, partial, duplicate, and stale guards', async () => {
    const { database, repository } = await openRepository();
    await expect(repository.executeMutation(action.mutation, { ...values, id: 'missing-transfer' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRANSFER_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_SPLIT_COMPANY' });
    await expect(repository.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_SPLIT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_SPLIT_NOT_ALLOWED' });
    await expect(repository.executeMutation(action.mutation, { id: 'receipt-00001', expected_row_version: 1, current_company_name: 'My Company', current_user_name: values.current_user_name })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_SPLIT_NOT_PARTIAL' });
    await repository.executeMutation(action.mutation, values);
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_SPLIT_DUPLICATE' });
    database.close();
  });

  test('persists across restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-split-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_split_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await openRepository(databasePath, migrationName);
    await first.repository.executeMutation(action.mutation, { ...values, current_user_name: 'Restart Operator' });
    first.database.close();
    const second = await openRepository(databasePath, migrationName);
    expect(await second.repository.query('SELECT split_by, split_quantity, state FROM inventory_transfer_splits WHERE source_picking_id = ?', [values.id])).toEqual([{ split_by: 'Restart Operator', split_quantity: 6, state: 'Created' }]);
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
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-split-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.action_split_transfer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.picking.action_split_transfer'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
    permissionDb.database.close();
  });
});
