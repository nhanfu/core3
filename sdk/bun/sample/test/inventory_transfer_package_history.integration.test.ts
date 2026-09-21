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
const page = parsed('pages/transfer-package-history.yaml');
const api = parsed('api/transfer-package-history.yaml');
const transferPage = parsed('pages/transfer-detail.yaml');
const transferApi = parsed('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_package_history_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

describe('Inventory transfer package history parity', () => {
  test('maps Odoo Done-transfer package history to separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const historyView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_package_history_views.xml', 'utf8');
    const historyModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_package_history.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(transferPage.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_package_histories', label: 'Packages', permission: 'inventory.read', value_field: 'package_history_count' }),
    ]));
    expect(transferApi.datasources[0].query).toContain('package_history_count');
    expect(transferApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_transfer_package_histories', navigate_to: '/inventory/transfer/package-history', params: { picking_id: '{state.inventory_transfer_detail.id}' } }),
    ]));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining([
      'inventory_transfer_package_history_context', 'inventory_transfer_package_histories',
    ]));
    expect(sourceView).toContain('name="action_see_package_histories"');
    expect(sourceModel).toContain('def action_see_package_histories(self):');
    expect(sourceModel).toContain("'domain': [('picking_ids', 'in', self.ids)]");
    expect(historyView).toContain('name="package_name"');
    expect(historyView).toContain('name="location_dest_id"');
    expect(historyModel).toContain("_name = 'stock.package.history'");
    expect(historyModel).toContain('def action_show_package(self):');
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual({ path: '/inventory/transfer/package-history', page: 'transfer-package-history', module: 'inventory' });
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...transferPage, actions: transferApi.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('persists deterministic Done-transfer history and supports main-package/search filters', async () => {
    const { database, repository, migrationName } = await openRepository();
    const params = { picking_id: 'delivery-package-history-0001', current_company_name: 'Core3 Demo Company', q: null, main_packages: null, fixture_state: null };
    const context = source('inventory_transfer_package_history_context');
    const histories = source('inventory_transfer_package_histories');

    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({
      data: { source_transfer_name: 'WH/OUT/PACKHISTORY/0001', source_state: 'Done', package_count: 1, company_name: 'Core3 Demo Company' },
    });
    expect((await repository.querySource(histories, params, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'package-history-row-0001', package_name: 'PACK/HISTORY/0001', package_type_name: 'Pallet', location_name: 'WH/Stock', location_dest_name: 'Customers/Wood Corner', move_count: 1 }),
    ]);
    expect((await repository.querySource(histories, { ...params, q: 'WOOD' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(histories, { ...params, main_packages: 'main' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(histories, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await repository.query('SELECT COUNT(*) AS count FROM inventory_package_histories', []) )[0].count).toBe(1);
    database.close();
  });

  test('enforces company, Done-state, and read permission boundaries', async () => {
    const { database, repository } = await openRepository();
    const context = source('inventory_transfer_package_history_context');
    const histories = source('inventory_transfer_package_histories');
    const params = { picking_id: 'delivery-package-history-0001', current_company_name: 'Core3 Demo Company', q: null, main_packages: null, fixture_state: null };
    expect((await repository.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(histories, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, picking_id: 'delivery-0001' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(histories, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PACKAGE_HISTORY_UNAVAILABLE' });

    const user: any = { sub: 'inventory-reader', permissions: [] };
    const apiHandler = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
      pageSources: new Map([[page.page.id, api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([[page.page.id, page]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read'], tables: {}, endpoints: {} }, eventStore: {}, topics: {},
    });
    const url = 'http://inventory.test/api/pages/transfer-package-history?picking_id=delivery-package-history-0001&current_company_name=Core3%20Demo%20Company';
    await expect(apiHandler(new Request(url), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
    database.close();
  });

  test('replays package history through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-package-history-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await openRepository(databasePath);
      const histories = source('inventory_transfer_package_histories');
      expect((await first.repository.querySource(histories, { picking_id: 'delivery-package-history-0001', current_company_name: 'Core3 Demo Company', q: null, main_packages: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
      first.database.close();
      const second = await openRepository(databasePath);
      expect((await second.repository.querySource(histories, { picking_id: 'delivery-package-history-0001', current_company_name: 'Core3 Demo Company', q: null, main_packages: null, fixture_state: null }, 0, 50)).data).toEqual([
        expect.objectContaining({ package_name: 'PACK/HISTORY/0001', company_name: 'Core3 Demo Company' }),
      ]);
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
