import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = parsed('pages/transfer-waiting-queue.yaml');
const api = parsed('api/transfer-waiting-queue.yaml');
const waitingQueue = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_waiting_queue_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const params = {
  current_company_name: 'Core3 Demo Company',
  expected_row_version: 1,
  q: null,
  operation_kind: null,
  fixture_state: null,
};

describe('Inventory Waiting Transfers queue parity', () => {
  test('maps Odoo action_picking_tree_waiting to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const waitingAction = sourceView.slice(sourceView.indexOf('id="action_picking_tree_waiting"'), sourceView.indexOf('id="action_picking_tree_late"'));
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'inventory_transfer_waiting_transfers', row_key: 'id', row_open_action: 'view_inventory_waiting_transfer' });
    expect(list.header_actions).toContainEqual(expect.objectContaining({ id: 'refresh_inventory_transfer_waiting_queue', permission: 'inventory.read' }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_waiting_queue_context', 'inventory_transfer_waiting_transfers', 'inventory_transfer_waiting_queue_runs']));
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'refresh_inventory_transfer_waiting_queue', action: 'stock.action_picking_tree_waiting', permission: 'inventory.read' }));
    expect(waitingAction).toContain('<field name="name">Waiting Transfers</field>');
    expect(waitingAction).toContain("'search_default_waiting': 1");
    expect(waitingAction).toContain('<field name="view_mode">list,kanban,form,calendar</field>');
    expect(page.page.route).toBe('/inventory/transfer/waiting');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('reads durable Waiting transfers with company/search/type filters and missing states', async () => {
    const { database, repository } = await openRepository();
    const context = waitingQueue('inventory_transfer_waiting_queue_context');
    const transfers = waitingQueue('inventory_transfer_waiting_transfers');
    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'waiting-queue', title: 'Waiting Transfers', company_name: 'Core3 Demo Company', row_version: 1 } });
    expect((await repository.querySource(transfers, params, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-waiting-queue-0001', name: 'WH/OUT/WAITINGQUEUE/0001', operation_kind: 'delivery', state: 'Waiting', move_count: 1 }),
    ]));
    expect((await repository.querySource(transfers, { ...params, q: 'waitingqueue' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(transfers, { ...params, operation_kind: 'delivery' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation_kind: 'delivery', state: 'Waiting' }),
    ]));
    expect((await repository.querySource(transfers, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(transfers, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(transfers, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_WAITING_QUEUE_UNAVAILABLE' });
    database.close();
  });

  test('refreshes durable queue history with actor/company/stale guards and survives restart', async () => {
    const { database, repository } = await openRepository();
    const action = api.actions.find((candidate: any) => candidate.id === 'refresh_inventory_transfer_waiting_queue');
    const values = { company_name: 'Core3 Demo Company', refreshed_by: 'Inventory Operator', current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', expected_row_version: 1 };
    const created = await repository.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({ id: 'waiting-queue-run-1', company_name: 'Core3 Demo Company', refreshed_by: 'Inventory Operator', row_version: 1 });
    expect(await repository.query('SELECT row_version FROM inventory_transfer_waiting_queue_context WHERE id = ?', ['waiting-queue'])).toEqual([{ row_version: 2 }]);
    await expect(repository.executeMutation(action.mutation, values)).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, current_user_name: '', refreshed_by: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_WAITING_QUEUE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, current_company_name: 'Other Company', company_name: 'Other Company' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();

    const databasePath = `/tmp/core3-inventory-transfer-waiting-queue-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await openRepository(databasePath);
      await first.repository.executeMutation(action.mutation, values);
      first.database.close();
      const second = await openRepository(databasePath);
      expect(await second.repository.query('SELECT refreshed_by FROM inventory_transfer_waiting_queue_runs WHERE company_name = ?', ['Core3 Demo Company'])).toEqual([{ refreshed_by: 'Inventory Operator' }]);
      second.database.close();
      const permissionDb = await openRepository();
      const user = { sub: 'inventory-anonymous', permissions: [] };
      const handler = createYamlApi({
        repository: permissionDb.repository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
        pageSources: new Map([[page.page.id, api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([[page.page.id, { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
        permissions: { permissions: ['inventory.read'], tables: {}, endpoints: {} }, eventStore: {}, topics: {},
      });
      const url = 'http://inventory.test/api/actions/stock.action_picking_tree_waiting';
      await expect(handler(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
      permissionDb.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
