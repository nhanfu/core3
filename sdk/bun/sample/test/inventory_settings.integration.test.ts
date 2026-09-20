import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory Settings Odoo parity', () => {
  test('binds the manager-only form to its page-owned API contract', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const item = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((entry: any) => entry.label === 'Settings');
    const view = page.components[0];
    expect(page.page).toMatchObject({ id: 'inventory-settings', route: '/inventory/settings', auth: { require: ['inventory.manage'] } });
    expect(api.page.id).toBe('inventory-settings');
    expect(api.datasources.map((source: any) => source.id)).toContain('inventory_settings');
    expect(item).toMatchObject({ path: '/inventory/settings', permission: 'inventory.manage' });
    expect(view).toMatchObject({ type: 'SettingsView', source: 'inventory_settings', save_action: 'save_inventory_settings' });
    expect(page.actions[0]).toMatchObject({ id: 'save_inventory_settings', type: 'server', action: 'inventory.settings.update', permission: 'inventory.manage' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Operations', 'Advanced Operations']);
    expect(view.tabs[0].sections[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'annual_inventory_day', label: 'Annual Inventory Day and Month', type: 'number' }),
      expect.objectContaining({ field: 'annual_inventory_month', label: 'Annual Inventory Month', type: 'select' }),
    ]));
    expect(api.datasources[0].query).toContain('annual_inventory_day');
    expect(page.actions[0].params).toMatchObject({ annual_inventory_day: '{row.annual_inventory_day}', annual_inventory_month: '{row.annual_inventory_month}' });
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 } });
  });

  test('seeds deterministic defaults, supports save, and rejects stale or missing settings', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_settings_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_settings_test', ['schema', 'data']);
    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ id: 'inventory-settings-demo', row_version: 1, group_stock_multi_locations: true, group_stock_tracking_lot: true, annual_inventory_day: 31, annual_inventory_month: '12' }) });
    const mutation = api.actions[0].mutation;
    const values = { group_stock_multi_locations: false, group_stock_multi_warehouses: true, group_stock_tracking_lot: true, group_stock_production_lot: true, group_stock_packaging: false, group_stock_adv_location: true, module_stock_barcode: true, group_stock_reception_report: true, annual_inventory_day: 15, annual_inventory_month: '6' };
    expect(await repository.executeMutation(mutation, { id: 'inventory-settings-demo', expected_row_version: 1, values })).toMatchObject({ ...values, row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'inventory-settings-demo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_SETTINGS_NOT_FOUND' });
  });

  test('keeps settings data fixed for repeatable development runs', () => {
    const migration = readFileSync(join(root, 'migrations/20260912190000-017-inventory-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 08:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });

  test('enforces manager permission and preserves annual settings after restart', async () => {
    const databasePath = `/tmp/core3-inventory-settings-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_settings_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      const migrations = join(root, 'migrations');
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
      const api = yaml('api/settings.yaml');
      const page = yaml('pages/settings.yaml');
      const sources = new Map(api.datasources.map((candidate: any) => [candidate.id, candidate]));
      const pageSources = new Map([['inventory-settings', api.datasources.map((candidate: any) => candidate.id)]]);
      const pages = new Map([['inventory-settings', page]]);
      const user: any = { sub: 'inventory-user', permissions: ['inventory.read'] };
      const handler = createYamlApi({
        repository: firstRepository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources, pageSources, pages, catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
        permissions: { permissions: ['inventory.read', 'inventory.manage'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
      });
      await expect(handler(new Request('http://inventory.test/api/pages/inventory-settings'), new URL('http://inventory.test/api/pages/inventory-settings'))).rejects.toMatchObject({ status: 403 });
      await expect(handler(new Request('http://inventory.test/api/mutate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mutation: 'inventory.settings.update', id: 'inventory-settings-demo', expected_row_version: '1', values: { annual_inventory_day: 20, annual_inventory_month: '3' } }) }), new URL('http://inventory.test/api/mutate'))).rejects.toMatchObject({ status: 403 });
      user.permissions = ['inventory.manage'];
      const updated = await firstRepository.executeMutation(api.actions[0].mutation, { id: 'inventory-settings-demo', expected_row_version: 1, values: { annual_inventory_day: 20, annual_inventory_month: '3' } }) as any;
      expect(updated).toMatchObject({ annual_inventory_day: 20, annual_inventory_month: '3', row_version: 2 });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      expect((await secondRepository.query('SELECT annual_inventory_day, annual_inventory_month, row_version FROM inventory_settings WHERE id = ?', ['inventory-settings-demo']))[0]).toEqual({ annual_inventory_day: 20, annual_inventory_month: '3', row_version: 2 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
