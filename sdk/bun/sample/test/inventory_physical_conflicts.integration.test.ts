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
const page = yaml('pages/physical-inventory.yaml');
const api = yaml('api/physical-inventory.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'resolve_inventory_conflict');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  selectedIds: ['quant-box-main'],
  expected_row_version: 1,
  current_company_name: 'Core3 Demo Company',
  current_user_name: 'Inventory Manager',
  decision: 'keep_counted',
};

describe('Inventory physical inventory conflict parity', () => {
  test('maps Odoo conflict choices into separate page/API contracts', () => {
    const list = page.components.find((component: any) => component.type === 'ListView');
    const sourceXml = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_inventory_conflict.xml', 'utf8');
    const sourceTests = readFileSync('/home/nhanjs/projects/odoo/addons/stock/tests/test_inventory.py', 'utf8');
    const sourceWizard = readFileSync('/home/nhanjs/projects/odoo/addons/stock/wizard/stock_inventory_conflict.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('physical-inventory');
    expect(api.page.id).toBe(page.page.id);
    expect(list.bulk_actions).toContainEqual(expect.objectContaining({ id: 'resolve_inventory_conflict', label: 'Resolve Conflict', permission: 'inventory.write' }));
    expect(page.components).toContainEqual(expect.objectContaining({ type: 'ListView', source: 'inventory_count_conflicts' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.inventory.conflict.resolve', operation: 'resolve_conflict', handler: 'yaml_mutation' });
    expect(source('inventory_count_conflicts')).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(action.fields.find((field: any) => field.field === 'decision').options).toEqual([
      { value: 'keep_counted', label: 'Keep Counted Quantity' },
      { value: 'keep_difference', label: 'Keep Difference' },
    ]);
    expect(sourceXml).toContain('name="action_keep_counted_quantity"');
    expect(sourceXml).toContain('name="action_keep_difference"');
    expect(sourceTests).toContain('action_keep_counted_quantity()');
    expect(sourceWizard).toContain('def action_keep_difference(self):');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('keeps a deterministic conflict, supports both Odoo resolutions, and persists the result', async () => {
    const countedDb = await repository('inventory_physical_conflicts_counted_test');
    expect((await countedDb.querySource(source('inventory_count_conflicts'), { current_company_name: values.current_company_name }, 0, 10)).data).toMatchObject([
      expect.objectContaining({ quant_id: 'quant-box-main', original_quantity: 18, counted_quantity: 20, current_quantity: 18, state: 'Open' }),
    ]);
    const counted = await countedDb.executeMutation(action.mutation, values) as any;
    expect(counted).toMatchObject({ id: 'inventory-conflict-resolution-quant-box-main-1', conflict_id: 'inventory-conflict-quant-box-main-0001', quant_id: 'quant-box-main', decision: 'keep_counted', resolved_by: 'Inventory Manager', row_version: 1 });
    expect(await countedDb.query('SELECT quantity, counted_quantity, inventory_quantity_set, is_outdated, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ quantity: 20, counted_quantity: null, inventory_quantity_set: false, is_outdated: false, row_version: 2 }]);
    expect(await countedDb.query('SELECT state, decision, resolved_by, row_version FROM inventory_count_conflicts WHERE quant_id = ?', ['quant-box-main'])).toEqual([{ state: 'Resolved', decision: 'keep_counted', resolved_by: 'Inventory Manager', row_version: 2 }]);

    const differenceDb = await repository('inventory_physical_conflicts_difference_test');
    await differenceDb.query('UPDATE inventory_quants SET quantity = 19 WHERE id = ?', ['quant-box-main']);
    const difference = await differenceDb.executeMutation(action.mutation, { ...values, decision: 'keep_difference', current_user_name: 'Difference Manager' }) as any;
    expect(difference).toMatchObject({ decision: 'keep_difference', resolved_by: 'Difference Manager' });
    expect(await differenceDb.query('SELECT quantity, counted_quantity, inventory_quantity_set, is_outdated FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ quantity: 19, counted_quantity: 21, inventory_quantity_set: true, is_outdated: false }]);
  });

  test('enforces selection, decision, company, actor, missing, and stale guards', async () => {
    const db = await repository('inventory_physical_conflicts_guards_test');
    await expect(db.executeMutation(action.mutation, { ...values, selectedIds: ['missing-quant'] })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_CONFLICT_NOT_FOUND' });
    await expect(db.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_CONFLICT_COMPANY_FORBIDDEN' });
    await expect(db.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_CONFLICT_ACTOR_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...values, decision: 'discard' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_CONFLICT_DECISION_INVALID' });
    await expect(db.executeMutation(action.mutation, { ...values, selectedIds: ['quant-box-main', 'quant-desk-main'] })).rejects.toMatchObject({ status: 400, code: 'INVENTORY_CONFLICT_SELECTION_REQUIRED' });
    await expect(db.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_CONFLICT_STALE' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_count_conflict_resolutions')).toEqual([{ count: 0 }]);
  });

  test('survives restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-physical-conflicts-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_physical_conflicts_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { ...values, current_user_name: 'Restart Manager' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT decision, resolved_by FROM inventory_count_conflict_resolutions WHERE quant_id = ?', ['quant-box-main'])).toEqual([{ decision: 'keep_counted', resolved_by: 'Restart Manager' }]);
    expect(await secondRepository.query('SELECT state, decision FROM inventory_count_conflicts WHERE quant_id = ?', ['quant-box-main'])).toEqual([{ state: 'Resolved', decision: 'keep_counted' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_physical_conflicts_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['physical-inventory', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['physical-inventory', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-physical-conflicts-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.inventory.conflict.resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.inventory.conflict.resolve'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});
