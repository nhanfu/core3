import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/product-update-quantity.yaml');
const page = yaml('pages/product-update-quantity.yaml');
const templateApi = yaml('api/product-template-detail.yaml');
const templatePage = yaml('pages/product-template-detail.yaml');
const variantApi = yaml('api/product-variant-detail.yaml');
const variantPage = yaml('pages/product-variant-detail.yaml');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);
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

describe('Inventory product Update Quantity parity', () => {
  test('maps Odoo action_open_quants to separate page/API contracts', () => {
    const discovered = discoverInventoryOnly();
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/product.py', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'product-update-quantity', route: '/products/update-quantity', auth: { require: ['inventory.manage'] } });
    expect(api.page).toEqual({ id: 'product-update-quantity' });
    expect(discovered.pages.get('product-update-quantity')?.config.page.id).toBe('product-update-quantity');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/products/update-quantity', page: 'product-update-quantity', module: 'inventory' });
    expect(templatePage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_inventory_product_quantity', label: 'Update Quantity' }));
    expect(templateApi.actions).toContainEqual(expect.objectContaining({ id: 'update_inventory_product_quantity', navigate_to: '/products/update-quantity', permission: 'inventory.manage' }));
    expect(variantPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_inventory_product_variant_quantity', label: 'Update Quantity' }));
    expect(variantApi.actions).toContainEqual(expect.objectContaining({ id: 'update_inventory_product_variant_quantity', navigate_to: '/products/update-quantity', permission: 'inventory.manage' }));
    expect(action('update_inventory_product_quantity')).toMatchObject({ action: 'inventory.products.update_quantity', handler: 'yaml_mutation', operation: 'update_quantity', permission: 'inventory.manage' });
    expect(action('update_inventory_product_quantity').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_STALE' }),
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_COMPANY' }),
      expect.objectContaining({ code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_ACTOR_REQUIRED' }),
    ]));
    expect(sourceView).toContain('name="action_open_quants"');
    expect(sourceView).toContain('groups="stock.group_stock_manager"');
    expect(sourceModel).toContain('def action_open_quants(self):');
    expect(sourceModel).toContain("action[\"name\"] = _('Update Quantity')");
    expect(sourceModel).toContain("'default_product_id': self.id");
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
  });

  test('returns deterministic product-scoped quantities and update history', async () => {
    const { database, repository: db } = await repository('inventory_product_update_quantity_fixture');
    const params = { product_id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null };
    expect(await db.querySource(source('inventory_product_update_quantity_context'), params, 0, 1)).toMatchObject({ data: {
      product_id: 'inventory-template-storage-box', product_name: 'Storage Box', on_hand: 33, quant_count: 2,
    } });
    expect((await db.querySource(source('inventory_product_update_quantity_lines'), params, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'quant-box-main', product_id: 'inventory-template-storage-box', product_name: '[E-COM08] Storage Box', quantity: 18, reserved_quantity: 3 }),
      expect.objectContaining({ id: 'quant-trace-location-0001', product_id: 'inventory-template-storage-box', quantity: 15, reserved_quantity: 2 }),
    ]));
    expect((await db.querySource(source('inventory_product_quantity_updates'), params, 0, 50)).data).toEqual([expect.objectContaining({
      id: 'product-quantity-update-inventory-template-storage-box-1', previous_quantity: 18, new_quantity: 18, updated_by: 'Seeded Inventory',
    })]);
    expect((await db.querySource(source('inventory_product_update_quantity_lines'), { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_product_update_quantity_lines'), { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await db.querySource(source('inventory_product_update_quantity_context'), { ...params, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    await expect(db.querySource(source('inventory_product_quantity_updates'), { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_HISTORY_UNAVAILABLE' });
    database.close();
  });

  test('updates quantity with actor, company, reserved, and stale guards', async () => {
    const { database, repository: db } = await repository('inventory_product_update_quantity_mutation');
    const mutation = action('update_inventory_product_quantity').mutation;
    const base = { product_id: 'inventory-template-storage-box', quant_id: 'quant-box-main', quantity: 19, expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' };

    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_STALE' });
    await expect(db.executeMutation(mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_ACTOR_REQUIRED' });
    await expect(db.executeMutation(mutation, { ...base, company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_COMPANY' });
    await expect(db.executeMutation(mutation, { ...base, quantity: 2 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_INVALID' });
    expect(await db.executeMutation(mutation, base)).toMatchObject({
      id: 'product-quantity-update-inventory-template-storage-box-2', product_id: 'inventory-template-storage-box', previous_quantity: 18, new_quantity: 19, quantity_delta: 1, updated_by: 'Admin User', row_version: 1,
    });
    expect(await db.query('SELECT quantity, row_version FROM inventory_quants WHERE id = ?', ['quant-box-main'])).toEqual([{ quantity: 19, row_version: 2 }]);
    expect(await db.query('SELECT on_hand, free_to_use FROM inventory_stock_report WHERE id = ?', ['stock-report-storage-box'])).toEqual([{ on_hand: 34, free_to_use: 29 }]);
    await expect(db.executeMutation(mutation, { ...base, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_PRODUCT_UPDATE_QUANTITY_STALE' });
    database.close();
  });

  test('persists across restart and denies the manager action to readers', async () => {
    const databasePath = `/tmp/core3-inventory-product-update-quantity-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_product_update_quantity_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await repository(migrationName, databasePath);
      await first.repository.executeMutation(action('update_inventory_product_quantity').mutation, { product_id: 'inventory-template-storage-box', quant_id: 'quant-box-main', quantity: 19, expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Restart Operator', current_company_name: 'Core3 Demo Company', company_name: 'Core3 Demo Company' });
      first.database.close();

      const second = await repository(migrationName, databasePath);
      expect(await second.repository.query('SELECT new_quantity, updated_by FROM inventory_product_quantity_updates WHERE id = ?', ['product-quantity-update-inventory-template-storage-box-2'])).toEqual([{ new_quantity: 19, updated_by: 'Restart Operator' }]);
      const reader: any = { sub: 'inventory-reader', email: 'reader@core3.local', name: 'Inventory Reader', roles: ['user'], permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: second.repository,
        authProvider: { async getCurrentUser() { return reader; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['product-update-quantity', api.datasources.map((candidate: any) => candidate.id)]]),
        pages: new Map([['product-update-quantity', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['inventory.read', 'inventory.manage'] }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/actions/inventory.products.update_quantity', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ values: { product_id: 'inventory-template-storage-box', quant_id: 'quant-box-main', quantity: 20, expected_row_version: 2 } }) }), new URL('http://inventory.test/api/actions/inventory.products.update_quantity'))).rejects.toMatchObject({ status: 403 });
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(`${databasePath}.wal`, { force: true });
    }
  });
});
