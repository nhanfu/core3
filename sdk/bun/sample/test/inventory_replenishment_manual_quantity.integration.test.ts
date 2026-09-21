import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/replenishment.yaml');
const page = yaml('pages/replenishment.yaml');
const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_orderpoints');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

function discoverInventoryOnly() {
  const isolatedRoot = mkdtempSync('/tmp/core3-inventory-discovery-');
  try {
    cpSync(serviceRoot, join(isolatedRoot, 'services/inventory'), { recursive: true });
    return discoverPages(isolatedRoot);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

async function repository(name: string, databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory replenishment manual quantity parity', () => {
  test('maps the Odoo reset action to separate discoverable page/API contracts', () => {
    const discovered = discoverInventoryOnly();
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_orderpoint_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_orderpoint.py', 'utf8');
    const reset = action('remove_manual_inventory_replenishment');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'replenishment', route: '/replenishment', auth: { require: ['inventory.manage'] } });
    expect(api.page).toEqual({ id: 'replenishment' });
    expect(discovered.pages.get('replenishment')?.config.page.id).toBe('replenishment');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/replenishment', page: 'replenishment', module: 'inventory' });
    expect(reset).toMatchObject({ id: 'remove_manual_inventory_replenishment', action: 'inventory.replenishment.remove_manual_qty', permission: 'inventory.manage' });
    expect(reset.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_COMPANY' }),
    ]));
    expect(sourceView).toContain('name="action_remove_manual_qty_to_order"');
    expect(sourceView).toContain('title="Remove manually entered value and replace by the quantity to order based on the forecasted quantities"');
    expect(sourceModel).toContain('def action_remove_manual_qty_to_order(self):');
    expect(sourceModel).toContain('self.qty_to_order_manual = 0');
  });

  test('seeds a deterministic manual override without changing the existing report population', async () => {
    const { database, repository: db } = await repository('inventory_replenishment_manual_quantity_fixture');
    const params = { q: null, trigger: 'manual', category_name: null, status: 'to_reorder', snooze_status: 'not_snoozed', horizon_days: '365', fixture_state: null };
    const rows = (await db.querySource(source, params, 0, 50)).data;
    expect(rows).toHaveLength(4);
    expect(rows.find((row: any) => row.id === 'orderpoint-desk-right')).toMatchObject({ to_order: 12, to_order_manual: 12, trigger: 'Manual' });
    expect((await db.query('SELECT to_order_manual, to_order FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-right']))).toEqual([{ to_order_manual: 12, to_order: 12 }]);
    database.close();
  });

  test('resets the manual quantity with actor, company, state, and stale guards', async () => {
    const { database, repository: db } = await repository('inventory_replenishment_manual_quantity_mutation');
    const mutation = action('remove_manual_inventory_replenishment').mutation;
    const base = { id: 'orderpoint-desk-right', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)' };

    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_STALE' });
    await expect(db.executeMutation(mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_COMPANY' });
    await expect(db.executeMutation(mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_COMPANY' });
    expect(await db.executeMutation(mutation, base)).toMatchObject({ id: 'orderpoint-desk-right', to_order: 10, to_order_manual: 0, row_version: 2 });
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_REPLENISHMENT_MANUAL_QTY_NOT_SET' });
    expect(await db.query('SELECT to_order_manual, to_order, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-right'])).toEqual([{ to_order_manual: 0, to_order: 10, row_version: 2 }]);
    database.close();
  });

  test('persists the reset across restart and denies the manager action to readers', async () => {
    const databasePath = `/tmp/core3-inventory-replenishment-manual-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_replenishment_manual_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await repository(migrationName, databasePath);
      await first.repository.executeMutation(action('remove_manual_inventory_replenishment').mutation, { id: 'orderpoint-desk-right', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'My Company (San Francisco)', company_name: 'My Company (San Francisco)' });
      first.database.close();

      const second = await repository(migrationName, databasePath);
      expect(await second.repository.query('SELECT to_order_manual, to_order, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-right'])).toEqual([{ to_order_manual: 0, to_order: 10, row_version: 2 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: [] };
      const handler = createYamlApi({
        repository: second.repository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['replenishment', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['replenishment', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.replenishment.remove_manual_qty', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ id: 'orderpoint-desk-right', expected_row_version: 2 }) }), new URL('http://inventory.test/api/actions/inventory.replenishment.remove_manual_qty'))).rejects.toMatchObject({ status: 403 });
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
