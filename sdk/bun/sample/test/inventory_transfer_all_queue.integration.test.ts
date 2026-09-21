import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = parsed('pages/transfer-all.yaml');
const api = parsed('api/transfer-all.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrationName = `inventory_transfer_all_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

const params = { current_company_name: 'My Company (San Francisco)', operation_type_id: 'operation-deliveries', q: null, state: null, operation_kind: null, fixture_state: null };

describe('Inventory All Transfers queue parity', () => {
  test('maps the Odoo operation-card All action to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.components.every((component: any) => !component.source || !component.datasources)).toBe(true);
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'inventory_transfer_all_transfers', row_key: 'id', row_open_action: 'view_inventory_all_transfer' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'refresh_inventory_transfer_all_queue', action: 'stock.stock_picking_action_picking_type', permission: 'inventory.read' }));
    expect(sourceView).toContain('<record id="stock_picking_action_picking_type" model="ir.actions.act_window">');
    expect(sourceView).toContain('<field name="name">All Transfers</field>');
    expect(sourceView).toContain("<field name=\"context\">{'contact_display': 'partner_address'}</field>");
    expect(sourceModel).toContain("return self._get_action('stock.stock_picking_action_picking_type')");
    expect(sourceModel).toContain("action['domain'] = [('picking_type_id', '=', self.id)]");
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual({ path: '/inventory/transfer/all', page: 'transfer-all', module: 'inventory' });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('reads company-scoped transfer rows with operation, state, search, empty, and transport states', async () => {
    const { database, repository } = await openRepository();
    expect((await repository.querySource(source('inventory_transfer_all_queue_context'), params, 0, 1)).data).toMatchObject({ id: 'all-transfer-queue', title: 'Deliveries', operation_type_id: 'operation-deliveries' });
    expect((await repository.querySource(source('inventory_transfer_all_transfers'), params, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-ready-moves-0001', operation_type_name: 'Deliveries', operation_kind: 'delivery', state: 'Ready' }),
      expect.objectContaining({ id: 'delivery-entire-pack-0001', state: 'Waiting' }),
    ]));
    expect((await repository.querySource(source('inventory_transfer_all_transfers'), { ...params, state: 'Waiting' }, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'delivery-entire-pack-0001', state: 'Waiting' })]));
    expect((await repository.querySource(source('inventory_transfer_all_transfers'), { ...params, q: 'PACKREMOVE' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source('inventory_transfer_all_transfers'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source('inventory_transfer_all_transfers'), { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source('inventory_transfer_all_transfers'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_ALL_QUEUE_UNAVAILABLE' });
    database.close();
  });

  test('refreshes the durable queue with actor/company/stale guards and survives restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-all-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const action = api.actions.find((candidate: any) => candidate.id === 'refresh_inventory_transfer_all_queue');
    const values = { company_name: 'My Company (San Francisco)', operation_type_id: '', refreshed_by: 'Inventory Operator', current_company_name: 'My Company (San Francisco)', current_user_name: 'Inventory Operator', expected_row_version: 1 };
    const created = await first.repository.executeMutation(action.mutation, values) as any;
    expect(created).toMatchObject({ id: 'all-transfer-queue-run-2', company_name: 'My Company (San Francisco)', refreshed_by: 'Inventory Operator', row_version: 1 });
    expect(await first.repository.query('SELECT row_version FROM inventory_transfer_all_queue_context WHERE id = ?', ['all-transfer-queue'])).toEqual([{ row_version: 2 }]);
    await expect(first.repository.executeMutation(action.mutation, values)).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(first.repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_ALL_QUEUE_ACTOR_REQUIRED' });
    await expect(first.repository.executeMutation(action.mutation, { ...values, expected_row_version: 2, operation_type_id: 'operation-other' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_ALL_QUEUE_OPERATION_SCOPE' });
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT refreshed_by FROM inventory_transfer_all_queue_runs WHERE id = ?', ['all-transfer-queue-run-2'])).toEqual([{ refreshed_by: 'Inventory Operator' }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});
