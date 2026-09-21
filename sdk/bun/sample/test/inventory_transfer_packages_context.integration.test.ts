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
const page = parsed('pages/transfer-packages.yaml');
const api = parsed('api/transfer-packages.yaml');
const transferPage = parsed('pages/transfer-detail.yaml');
const transferApi = parsed('api/transfer-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `inventory_transfer_packages_context_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const params = {
  picking_id: 'delivery-package-context-0001',
  current_company_name: 'Core3 Demo Company',
  q: null,
  main_packages: null,
  fixture_state: null,
};

describe('Inventory open-transfer package context parity', () => {
  test('maps Odoo action_see_packages to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(list).toMatchObject({ source: 'inventory_transfer_packages', row_key: 'id', row_open_action: 'view_inventory_transfer_package' });
    expect(transferPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_packages', permission: 'inventory.tracking', value_field: 'package_count' }));
    expect(transferApi.datasources[0].query).toContain('package_count');
    expect(transferApi.actions).toContainEqual(expect.objectContaining({ id: 'view_inventory_transfer_packages', navigate_to: '/inventory/transfer/packages', permission: 'inventory.tracking' }));
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['inventory_transfer_package_context', 'inventory_transfer_packages']));
    expect(sourceModel).toContain('def action_see_packages(self):');
    expect(sourceModel).toContain("'domain': [('picking_ids', 'in', self.ids)]");
    expect(sourceModel).toContain("'can_add_entire_packs': self.picking_type_code != 'incoming'");
    expect(sourceModel).toContain("'search_default_main_packages': True");
    expect(sourceView).toContain('name="action_see_packages"');
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual({ path: '/inventory/transfer/packages', page: 'transfer-packages', module: 'inventory' });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...transferPage, actions: transferApi.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('reads durable company-scoped package context with search and main-package filters', async () => {
    const { database, repository } = await openRepository();
    const context = source('inventory_transfer_package_context');
    const packages = source('inventory_transfer_packages');
    expect(await repository.querySource(context, params, 0, 1)).toMatchObject({ data: { transfer_name: 'WH/OUT/PACKAGECTX/0001', state: 'Ready', package_count: 1, company_name: 'Core3 Demo Company' } });
    expect((await repository.querySource(packages, params, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'package-context-0005', name: 'PACK/CONTEXT/0001', package_type_name: 'Pallet', move_count: 1, company_name: 'Core3 Demo Company' }),
    ]);
    expect((await repository.querySource(packages, { ...params, q: 'context' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(packages, { ...params, main_packages: 'main' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(packages, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(context, { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(packages, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(packages, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_TRANSFER_PACKAGES_UNAVAILABLE' });
    database.close();
  });

  test('enforces tracking permission and survives a file-backed restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-packages-context-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await openRepository(databasePath);
      expect((await first.repository.querySource(source('inventory_transfer_packages'), params, 0, 50)).data).toHaveLength(1);
      first.database.close();
      const second = await openRepository(databasePath);
      expect((await second.repository.querySource(source('inventory_transfer_packages'), params, 0, 50)).data).toEqual([
        expect.objectContaining({ name: 'PACK/CONTEXT/0001', state: 'In internal locations' }),
      ]);
      second.database.close();
      const permissionDb = await openRepository();
      const user = { sub: 'inventory-reader', permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: permissionDb.repository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])),
        pageSources: new Map([[page.page.id, api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([[page.page.id, { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
        permissions: { permissions: ['inventory.read', 'inventory.tracking'], tables: {}, endpoints: {} }, eventStore: {}, topics: {},
      });
      const url = 'http://inventory.test/api/pages/transfer-packages?picking_id=delivery-package-context-0001&current_company_name=Core3%20Demo%20Company';
      await expect(handler(new Request(url), new URL(url))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.tracking' });
      permissionDb.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
