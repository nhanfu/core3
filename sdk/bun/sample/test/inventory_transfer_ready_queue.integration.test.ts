import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = parsed('pages/transfer-ready-queue.yaml');
const api = parsed('api/transfer-ready-queue.yaml');
const readyQueue = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_ready_queue_${crypto.randomUUID().replaceAll('-', '_')}`) {
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

describe('Inventory To Do transfer queue parity', () => {
  test('maps Odoo action_picking_tree_ready to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const readyAction = sourceView.slice(sourceView.indexOf('id="action_picking_tree_ready"'), sourceView.indexOf('id="action_picking_tree_graph"'));
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'inventory_transfer_ready_transfers', row_key: 'id', row_open_action: 'view_inventory_ready_transfer' });
    expect(list.header_actions).toContainEqual(expect.objectContaining({ id: 'refresh_inventory_transfer_ready_queue', permission: 'inventory.read' }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_ready_queue_context', 'inventory_transfer_ready_transfers', 'inventory_transfer_ready_queue_runs']));
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'refresh_inventory_transfer_ready_queue', action: 'stock.action_picking_tree_ready', permission: 'inventory.read' }));
    expect(readyAction).toContain('<field name="name">To Do</field>');
    expect(readyAction).toContain("'search_default_available': 1");
    expect(readyAction).toContain('<field name="view_mode">list,kanban,form,calendar</field>');
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual({ path: '/inventory/transfer/ready', page: 'transfer-ready-queue', module: 'inventory' });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('reads durable Ready transfers with company/search/type filters and missing states', async () => {
    const { database, repository } = await openRepository();
    const context = readyQueue('inventory_transfer_ready_queue_context');
    const transfers = readyQueue('inventory_transfer_ready_transfers');
    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({ data: { id: 'ready-queue', title: 'To Do', company_name: 'Core3 Demo Company', row_version: 1 } });
    expect((await repository.querySource(transfers, params, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-ready-queue-0001', name: 'WH/OUT/READYQUEUE/0001', operation_kind: 'delivery', state: 'Ready', move_count: 1 }),
    ]));
    expect((await repository.querySource(transfers, { ...params, q: 'readyqueue' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(transfers, { ...params, operation_kind: 'receipt' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation_kind: 'receipt', state: 'Ready' }),
    ]));
    expect((await repository.querySource(transfers, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(transfers, { ...params, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(transfers, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_READY_QUEUE_UNAVAILABLE' });
    database.close();
  });

  test('refreshes durable queue history with actor/company/stale guards and survives restart', async () => {
    const { database, repository } = await openRepository();
    const action = api.actions.find((candidate: any) => candidate.id === 'refresh_inventory_transfer_ready_queue');
    const values = { company_name: 'Core3 Demo Company', refreshed_by: 'Inventory Operator', current_company_name: 'Core3 Demo Company', current_user_name: 'Inventory Operator', expected_row_version: 1 };
    const created = await repository.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({ id: 'ready-queue-run-1', company_name: 'Core3 Demo Company', refreshed_by: 'Inventory Operator', row_version: 1 });
    expect(await repository.query('SELECT row_version FROM inventory_transfer_ready_queue_context WHERE id = ?', ['ready-queue'])).toEqual([{ row_version: 2 }]);
    await expect(repository.executeMutation(action.mutation, values)).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, current_user_name: '', refreshed_by: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_READY_QUEUE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, current_company_name: 'Other Company', company_name: 'Other Company' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();

    const databasePath = `/tmp/core3-inventory-transfer-ready-queue-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await openRepository(databasePath);
      await first.repository.executeMutation(action.mutation, values);
      first.database.close();
      const second = await openRepository(databasePath);
      expect(await second.repository.query('SELECT refreshed_by FROM inventory_transfer_ready_queue_runs WHERE company_name = ?', ['Core3 Demo Company'])).toEqual([{ refreshed_by: 'Inventory Operator' }]);
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
      const url = 'http://inventory.test/api/actions/stock.action_picking_tree_ready';
      await expect(handler(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
      permissionDb.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
