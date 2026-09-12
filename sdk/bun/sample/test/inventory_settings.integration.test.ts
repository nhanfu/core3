import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory Settings Odoo parity', () => {
  test('binds the manager-only form to its page-owned API contract', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const item = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((entry: any) => entry.label === 'Settings');
    const view = page.components[0];
    expect(page.page).toMatchObject({ id: 'inventory-settings', route: '/inventory/settings', auth: { require: ['inventory.manage'] } });
    expect(api.page.id).toBe('inventory-settings');
    expect(discovered.pageDatasources.get('inventory-settings')).toContain('inventory_settings');
    expect(item).toMatchObject({ path: '/inventory/settings', permission: 'inventory.manage' });
    expect(view).toMatchObject({ type: 'SettingsView', source: 'inventory_settings', save_action: 'save_inventory_settings' });
    expect(page.actions[0]).toMatchObject({ id: 'save_inventory_settings', type: 'server', action: 'inventory.settings.update', permission: 'inventory.manage' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Operations', 'Advanced Operations']);
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
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ id: 'inventory-settings-demo', row_version: 1, group_stock_multi_locations: true, group_stock_tracking_lot: true }) });
    const mutation = api.actions[0].mutation;
    const values = { group_stock_multi_locations: false, group_stock_multi_warehouses: true, group_stock_tracking_lot: true, group_stock_production_lot: true, group_stock_packaging: false, group_stock_adv_location: true, module_stock_barcode: true, group_stock_reception_report: true };
    expect(await repository.executeMutation(mutation, { id: 'inventory-settings-demo', expected_row_version: 1, values })).toMatchObject({ ...values, row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'inventory-settings-demo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_SETTINGS_NOT_FOUND' });
  });

  test('keeps settings data fixed for repeatable development runs', () => {
    const migration = readFileSync(join(root, 'migrations/20260912190000-017-inventory-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 08:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
