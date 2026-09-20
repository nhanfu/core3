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
const page = yaml('pages/move-line-detail.yaml');
const api = yaml('api/move-line-detail.yaml');
const revertAction = api.actions.find((candidate: any) => candidate.id === 'revert_inventory_adjustment');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = { id: 'move-line-0001', expected_row_version: 1, current_company_name: 'My Company (San Francisco)', current_user_name: 'Inventory Manager' };

describe('Inventory move-line Revert Inventory Adjustment parity', () => {
  test('maps the Odoo bound action into separate detail page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.page.id).toBe('move-line-detail');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detail.header_actions).toContainEqual(expect.objectContaining({ id: 'revert_inventory_adjustment', label: 'Revert Inventory Adjustment', permission: 'inventory.manage' }));
    expect(api.page.id).toBe('move-line-detail');
    expect(revertAction).toMatchObject({ type: 'server', permission: 'inventory.manage', action: 'action_revert_inventory_adjustment', operation: 'revert_inventory_adjustment', handler: 'yaml_mutation' });
    expect(source('inventory_move_revert_runs').query).toContain('inventory_move_revert_runs');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('creates the durable reversed move, source revision, and history row', async () => {
    const db = await repository('inventory_move_revert_create_test');
    const result = await db.executeMutation(revertAction.mutation, values) as any;
    expect(result).toMatchObject({ id: 'inventory-revert-run-move-line-0001-1', source_move_line_id: 'move-line-0001', reversal_move_line_id: 'inventory-revert-line-move-line-0001-1', product_name: 'Customizable Desk (Black)', quantity: 70, requested_by: 'Inventory Manager' });
    expect(await db.query('SELECT reference, source_location_id, destination_location_id, origin, done_by, state FROM inventory_move_lines WHERE id = ?', ['inventory-revert-line-move-line-0001-1'])).toEqual([{ reference: 'Product Quantity Updated [reverted]', source_location_id: 'location-stock', destination_location_id: 'location-loss', origin: 'Reversal of Product Quantity Updated', done_by: 'Inventory Manager', state: 'Done' }]);
    expect(await db.query('SELECT row_version FROM inventory_move_lines WHERE id = ?', ['move-line-0001'])).toEqual([{ row_version: 2 }]);
    expect((await db.querySource(source('inventory_move_line_detail'), { id: 'move-line-0001', fixture_state: null }, 0, 1)).data).toMatchObject({ is_inventory_adjustment: true, revert_count: 1, row_version: 2 });
    expect((await db.querySource(source('inventory_move_revert_runs'), { id: 'move-line-0001', current_company_name: 'My Company (San Francisco)', fixture_state: null }, 0, 10)).data[0]).toMatchObject({ product_name: 'Customizable Desk (Black)', quantity: 70, requested_by: 'Inventory Manager' });
    await migrateDatabase(db, serviceRoot + '/migrations', undefined, 'inventory_move_revert_create_test', ['schema', 'data']);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_move_revert_runs')).toEqual([{ count: 1 }]);
  });

  test('enforces company, actor, adjustment, stale, and duplicate guards without partial state', async () => {
    const db = await repository('inventory_move_revert_guards_test');
    await expect(db.executeMutation(revertAction.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_MOVE_LINE_COMPANY_SCOPE_REQUIRED' });
    await expect(db.executeMutation(revertAction.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_MOVE_REVERT_ACTOR_REQUIRED' });
    await expect(db.executeMutation(revertAction.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_MOVE_REVERT_NOT_ALLOWED' });
    await expect(db.executeMutation(revertAction.mutation, { ...values, id: 'move-line-0002' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_MOVE_REVERT_NOT_ALLOWED' });
    await db.executeMutation(revertAction.mutation, values);
    await expect(db.executeMutation(revertAction.mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_MOVE_ALREADY_REVERTED' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_move_revert_runs')).toEqual([{ count: 1 }]);
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_move_lines WHERE id LIKE \'inventory-revert-line-%\'')).toEqual([{ count: 1 }]);
  });

  test('preserves reversal history across restart and enforces the manager permission boundary', async () => {
    const databasePath = `/tmp/core3-inventory-move-revert-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_move_revert_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(revertAction.mutation, { ...values, current_user_name: 'Restart Manager' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT product_name, quantity, requested_by FROM inventory_move_revert_runs WHERE source_move_line_id = ?', ['move-line-0001'])).toEqual([{ product_name: 'Customizable Desk (Black)', quantity: 70, requested_by: 'Restart Manager' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_move_revert_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['move-line-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['move-line-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-move-revert-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/action_revert_inventory_adjustment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/action_revert_inventory_adjustment'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
  });
});
