import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/lot-transfers.yaml');
const page = yaml('pages/lot-transfers.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory lot transfers parity', () => {
  test('maps the Odoo lot Transfers stat action to separate page/API contracts', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const detailPage = yaml('pages/lot-detail.yaml');
    const detailApi = yaml('api/lot-detail.yaml');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_lot_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_lot.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'lot-transfers', route: '/lots/transfers', auth: { require: ['inventory.tracking'] } });
    expect(api.page).toEqual({ id: 'lot-transfers' });
    expect(discovered.pages.get('lot-transfers')?.config.page.id).toBe('lot-transfers');
    expect(discovered.pageDatasources.get('lot-transfers')).toEqual(expect.arrayContaining([
      'inventory_lot_transfers_context', 'inventory_lot_transfers', 'inventory_lot_transfers_runs',
    ]));
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/lots/transfers', page: 'lot-transfers', module: 'inventory' });
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_lot_transfers', permission: 'inventory.tracking' }));
    expect(detailApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_lot_transfers', navigate_to: '/lots/transfers' }));
    expect(action('record_inventory_lot_transfers')).toMatchObject({ action: 'inventory.lots.transfers', handler: 'yaml_mutation', operation: 'report', permission: 'inventory.tracking' });
    expect(action('record_inventory_lot_transfers').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_LOT_TRANSFERS_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_LOT_TRANSFERS_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_LOT_TRANSFERS_ACTOR_REQUIRED' }),
    ]));
    expect(odooView).toContain('name="action_lot_open_transfers"');
    expect(odooView).toContain('string="Transfers"');
    expect(odooModel).toContain('def action_lot_open_transfers(self):');
    expect(odooModel).toContain("self.env['stock.picking']");
    validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true });
  });

  test('returns deterministic company-scoped outgoing transfers and durable open history', async () => {
    const { database, repository: db } = await repository('inventory_lot_transfers_fixture');
    const params = { id: 'serial-unused-0001', current_company_name: 'My Company (San Francisco)', q: null };
    expect(await db.querySource(source('inventory_lot_transfers_context'), params, 0, 1)).toMatchObject({ data: {
      id: 'serial-unused-0001', lot_name: 'SN-NEW-0001', product_name: '[FURN_0269] Office Chair Black', delivery_count: 1,
    } });
    expect((await db.querySource(source('inventory_lot_transfers'), params, 0, 50)).data).toMatchObject([{
      id: 'delivery-lot-transfer-0001', name: 'WH/OUT/LOT/0001', operation_type_name: 'Deliveries', state: 'Done', quantity: 1, lot_name: 'SN-NEW-0001',
    }]);
    expect((await db.querySource(source('inventory_lot_transfers_runs'), params, 0, 50)).data).toMatchObject([{
      id: 'lot-transfers-serial-unused-0001-1', transfer_count: 1, requested_by: 'Seeded Inventory',
    }]);
    expect((await db.querySource(source('inventory_lot_transfers'), { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_lot_transfers'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_lot_transfers_context'), { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    await expect(db.querySource(source('inventory_lot_transfers'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_LOT_TRANSFERS_LINES_UNAVAILABLE' });
    database.close();
  });

  test('records a durable transfer request with actor/company/stale/empty guards', async () => {
    const { database, repository: db } = await repository('inventory_lot_transfers_mutation');
    const mutation = action('record_inventory_lot_transfers').mutation;
    const base = { lot_id: 'serial-unused-0001', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'My Company (San Francisco)' };
    expect(await db.executeMutation(mutation, base)).toMatchObject({ id: 'lot-transfers-serial-unused-0001-2', lot_id: 'serial-unused-0001', transfer_count: 1, requested_by: 'Admin User' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_lot_transfer_runs WHERE lot_id = ?', ['serial-unused-0001'])).toEqual([{ count: 2 }]);
    await expect(db.executeMutation(mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOT_TRANSFERS_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_LOT_TRANSFERS_COMPANY' });
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOT_TRANSFERS_STALE' });
    await expect(db.executeMutation(mutation, { ...base, lot_id: 'lot-cable-empty' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOT_TRANSFERS_EMPTY' });
    database.close();
  });

  test('survives restart and denies users without tracking permission', async () => {
    const databasePath = `/tmp/core3-inventory-lot-transfers-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_lot_transfers_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(action('record_inventory_lot_transfers').mutation, { lot_id: 'serial-unused-0001', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'My Company (San Francisco)' });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT requested_by, transfer_count FROM inventory_lot_transfer_runs WHERE id = ?', ['lot-transfers-serial-unused-0001-2'])).toEqual([{ requested_by: 'Restart Operator', transfer_count: 1 }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['lot-transfers', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['lot-transfers', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
        permissions: { permissions: ['inventory.read', 'inventory.tracking'] }, uploadRoot: '/tmp/core3-inventory-lot-transfers-test', eventStore: {}, topics: {},
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.lots.transfers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: { lot_id: 'serial-unused-0001', expected_row_version: 1 } }) }), new URL('http://inventory.test/api/actions/inventory.lots.transfers'))).rejects.toMatchObject({ status: 403 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
