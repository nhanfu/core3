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
const page = parsed('pages/transfer-operations.yaml');
const api = parsed('api/transfer-operations.yaml');
const transferPage = parsed('pages/transfer-detail.yaml');
const transferApi = parsed('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_operations_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const params = {
  picking_id: 'delivery-operations-0001',
  current_company_name: 'Core3 Demo Company',
  expected_row_version: 1,
  q: null,
  fixture_state: null,
};

describe('Inventory transfer Operations parity', () => {
  test('maps Odoo action_picking_move_tree to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'inventory_transfer_operations', row_key: 'id' });
    expect(transferPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_operations', label: 'Operations', permission: 'inventory.read', value_field: 'operation_count' }));
    expect(transferApi.datasources[0].query).toContain('operation_count');
    expect(transferApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_operations', navigate_to: '/inventory/transfer/operations', permission: 'inventory.read' }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_operations_context', 'inventory_transfer_operations']));
    expect(sourceModel).toContain('def action_picking_move_tree(self):');
    expect(sourceModel).toContain("action['domain'] = [('picking_id', 'in', self.ids)]");
    expect(sourceModel).toContain("stock.stock_move_action");
    expect(sourceView).toContain('name="action_picking_move_tree"');
    expect(sourceView).toContain('>Operations</span>');
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual({ path: '/inventory/transfer/operations', page: 'transfer-operations', module: 'inventory' });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...transferPage, actions: transferApi.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('reads durable transfer operations with company, search, and stale guards', async () => {
    const { database, repository } = await openRepository();
    const context = source('inventory_transfer_operations_context');
    const operations = source('inventory_transfer_operations');
    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({ data: { transfer_name: 'WH/OUT/OPERATIONS/0001', state: 'Ready', operation_count: 2, company_name: 'Core3 Demo Company', row_version: 1 } });
    expect((await repository.querySource(operations, params, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'delivery-operations-0001-move-001', product_name: '[E-COM08] Storage Box', demand: 4, done_quantity: 0, state: 'Ready' }),
      expect.objectContaining({ id: 'delivery-operations-0001-move-002', product_name: '[FURN_8855] Drawer', demand: 2, done_quantity: 1, state: 'Partially Done' }),
    ]);
    expect((await repository.querySource(operations, { ...params, q: 'drawer' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(operations, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(operations, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, expected_row_version: 99 }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(operations, { ...params, expected_row_version: 99 }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(operations, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_TRANSFER_OPERATIONS_UNAVAILABLE' });
    database.close();
  });

  test('enforces read permission and survives a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-operations-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await openRepository(databasePath);
      expect((await first.repository.querySource(source('inventory_transfer_operations'), params, 0, 50)).data).toHaveLength(2);
      first.database.close();
      const second = await openRepository(databasePath);
      expect((await second.repository.querySource(source('inventory_transfer_operations'), params, 0, 50)).data).toEqual([
        expect.objectContaining({ product_name: '[E-COM08] Storage Box' }),
        expect.objectContaining({ product_name: '[FURN_8855] Drawer' }),
      ]);
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
      const url = 'http://inventory.test/api/pages/transfer-operations?picking_id=delivery-operations-0001&current_company_name=Core3%20Demo%20Company&expected_row_version=1';
      await expect(handler(new Request(url), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.read' });
      permissionDb.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
