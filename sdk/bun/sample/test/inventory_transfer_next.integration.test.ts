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
const page = yaml('pages/transfer-next.yaml');
const api = yaml('api/transfer-next.yaml');
const transferPage = yaml('pages/transfer-detail.yaml');
const transferApi = yaml('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_next_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory transfer Next Transfer parity', () => {
  test('keeps Odoo action_next_transfer in separate contextual page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(transferPage.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_next', label: 'Next Transfer', permission: 'inventory.read', value_field: 'next_transfer_count' }),
    ]));
    expect(transferApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_next', navigate_to: '/inventory/transfer/next', params: { picking_id: '{state.inventory_transfer_detail.id}' } }),
    ]));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining([
      'inventory_transfer_next_context', 'inventory_transfer_next_transfers',
    ]));
    expect(sourceView).toContain('name="action_next_transfer"');
    expect(sourceView).toContain('<span class="o_stat_text">Next Transfer</span>');
    expect(sourceModel).toContain('def _get_next_transfers(self):');
    expect(sourceModel).toContain('move_dest_ids.picking_id');
    expect(sourceModel).toContain('return_ids');
    expect(sourceModel).toContain('def action_next_transfer(self):');
    expect(sourceModel).toContain("'name': _('Next Transfers')");
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...transferPage, actions: transferApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.page.route).toBe('/inventory/transfer/next');
  });

  test('follows durable move-destination links and excludes return transfers', async () => {
    const { database, repository } = await openRepository();
    const context = source('inventory_transfer_next_context');
    const next = source('inventory_transfer_next_transfers');
    const params = { picking_id: 'delivery-next-source-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null };

    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({
      data: { source_transfer_name: 'WH/OUT/NEXT/0001', source_state: 'Done', next_transfer_count: 1 },
    });
    expect((await repository.querySource(next, params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'delivery-next-target-0001', name: 'WH/OUT/NEXT/0002', operation_type_name: 'Deliveries',
      state: 'Waiting', source_picking_id: 'delivery-next-source-0001',
      source_location: 'Stock', destination_location: 'Customers', company_name: 'Core3 Demo Company',
    })]);
    expect((await repository.querySource(next, { ...params, q: 'NEXT/0002' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(next, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(next, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(next, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'INVENTORY_NEXT_TRANSFERS_UNAVAILABLE' });

    await repository.run("INSERT INTO inventory_transfer_returns(id, source_picking_id, return_picking_id, company_name, return_quantity, returned_by, reason, state) VALUES ('next-return-0001', 'delivery-next-source-0001', 'delivery-next-target-0001', 'Core3 Demo Company', 1, 'Inventory Operator', '', 'Waiting')");
    expect((await repository.querySource(context, params, 0, 1)).data.next_transfer_count).toBe(0);
    expect((await repository.querySource(next, params, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces read permission on the contextual next-transfer route', async () => {
    const { database, repository } = await openRepository();
    const reader = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
    const denied = { ...reader, permissions: [] };
    const makeApi = (user: any) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([[page.page.id, api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([[page.page.id, page]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-next-test', eventStore: {}, topics: {},
    });
    const url = 'http://inventory.test/api/pages/transfer-next?picking_id=delivery-next-source-0001&current_company_name=Core3%20Demo%20Company';
    const response = await makeApi(reader)(new Request(url, { headers: { Authorization: 'Bearer test-token' } }), new URL(url));
    expect(response.status).toBe(200);
    await expect(makeApi(denied)(new Request(url, { headers: { Authorization: 'Bearer test-token' } }), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
    expect(api.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'back_to_inventory_transfer_from_next', type: 'navigate' }),
      expect.objectContaining({ id: 'view_inventory_next_transfer', type: 'navigate', navigate_to: '/inventory/transfer/detail' }),
    ]));
    database.close();
  });

  test('replays the migration and preserves the next-transfer link after restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-next-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const next = source('inventory_transfer_next_transfers');
    expect((await first.repository.querySource(next, { picking_id: 'delivery-next-source-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-next-target-0001', link_id: 'delivery-next-link-0001' }),
    ]));
    first.database.close();
    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT source_picking_id, next_picking_id FROM inventory_picking_next_transfers WHERE id = ?', ['delivery-next-link-0001'])).toEqual([{
      source_picking_id: 'delivery-next-source-0001', next_picking_id: 'delivery-next-target-0001',
    }]);
    expect((await second.repository.querySource(next, { picking_id: 'delivery-next-source-0001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'WH/OUT/NEXT/0002', state: 'Waiting' }),
    ]));
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});
