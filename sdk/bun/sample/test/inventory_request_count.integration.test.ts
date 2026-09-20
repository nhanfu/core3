import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/physical-inventory.yaml');
const api = yaml('api/physical-inventory.yaml');
const action = api.actions.find((candidate: any) => candidate.id === 'request_inventory_count');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return result;
}

describe('Inventory request a count parity', () => {
  test('keeps the Odoo manager bulk action and page/API contracts aligned', () => {
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(list.selectable).toBe(true);
    expect(list.bulk_actions).toEqual([{ id: 'request_inventory_count', label: 'Request a Count', permission: 'inventory.manage' }]);
    expect(api.page.id).toBe('physical-inventory');
    expect(api.datasources.map((source: any) => source.id)).toContain('inventory_count_requests');
    expect(action).toMatchObject({ type: 'server_form', permission: 'inventory.manage', action: 'inventory.quants.request_count' });
    expect(action.fields.map((field: any) => field.label)).toEqual(['Scheduled at', 'Assign to', 'Show expected quantity']);
  });

  test('schedules selected quants, records a durable request, and rolls back invalid selections', async () => {
    const db = await repository('inventory_request_count_test');
    const result = await db.executeMutation(action.mutation, { selectedIds: ['quant-desk-main', 'quant-chair-transit'], inventory_date: '2026-02-01', user_id: 'Inventory User', show_expected_quantity: true, current_user_name: 'Mitchell Admin' });
    expect(result).toMatchObject({ id: 'inventory-count-request-0002', inventory_date: '2026-02-01', assigned_user: 'Inventory User', show_expected_quantity: true, requested_by: 'Mitchell Admin', quant_count: 2 });
    expect(await db.query('SELECT id, inventory_date, inventory_user, inventory_quantity_set FROM inventory_quants WHERE id IN (?, ?) ORDER BY id', ['quant-chair-transit', 'quant-desk-main'])).toEqual([
      { id: 'quant-chair-transit', inventory_date: '2026-02-01T00:00:00.000Z', inventory_user: 'Inventory User', inventory_quantity_set: false },
      { id: 'quant-desk-main', inventory_date: '2026-02-01T00:00:00.000Z', inventory_user: 'Inventory User', inventory_quantity_set: false },
    ]);
    expect(await db.query('SELECT request_id, quant_id FROM inventory_count_request_lines WHERE request_id = ? ORDER BY quant_id', ['inventory-count-request-0002'])).toEqual([
      { request_id: 'inventory-count-request-0002', quant_id: 'quant-chair-transit' },
      { request_id: 'inventory-count-request-0002', quant_id: 'quant-desk-main' },
    ]);
    await expect(db.executeMutation(action.mutation, { selectedIds: ['quant-desk-main', 'missing-quant'], inventory_date: '2026-02-02', user_id: '', show_expected_quantity: false, current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_COUNT_REQUEST_QUANT_INVALID' });
    expect(await db.query("SELECT COUNT(*) AS count FROM inventory_count_requests WHERE inventory_date = DATE '2026-02-02'")).toEqual([{ count: 0 }]);
    await expect(db.executeMutation(action.mutation, { selectedIds: ['quant-desk-main'], inventory_date: 'bad-date', user_id: '', show_expected_quantity: false, current_user_name: 'Mitchell Admin' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_COUNT_REQUEST_DATE_INVALID' });
  });

  test('preserves count requests through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-request-count-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    const migrationName = `inventory_request_count_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(action.mutation, { selectedIds: ['quant-drawer-lot'], inventory_date: '2026-02-03', user_id: 'Mitchell Admin', show_expected_quantity: false, current_user_name: 'Mitchell Admin' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT inventory_date, inventory_user FROM inventory_quants WHERE id = ?', ['quant-drawer-lot'])).toEqual([{ inventory_date: '2026-02-03T00:00:00.000Z', inventory_user: 'Mitchell Admin' }]);
    expect(await secondRepository.query('SELECT inventory_date, assigned_user, quant_count FROM inventory_count_requests WHERE id = ?', ['inventory-count-request-0002'])).toEqual([{ inventory_date: '2026-02-03T00:00:00.000Z', assigned_user: 'Mitchell Admin', quant_count: 1 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces the manager-only request boundary at runtime', async () => {
    const db = await repository('inventory_request_count_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: db,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['physical-inventory', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['physical-inventory', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-request-count-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/pages/physical-inventory'), new URL('http://inventory.test/api/pages/physical-inventory'))).resolves.toBeDefined();
    await expect(handler(new Request('http://inventory.test/api/actions/inventory.quants.request_count', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selectedIds: ['quant-desk-main'], values: { inventory_date: '2026-02-01', user_id: '' } }) }), new URL('http://inventory.test/api/actions/inventory.quants.request_count'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.manage' });
  });
});
