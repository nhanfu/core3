import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Purchase Settings parity slice', () => {
  test('keeps the form layout-only and binds its API by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const settingsItem = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Settings');
    const view = page.components.find((component: any) => component.type === 'SettingsView');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-settings', route: '/purchase/settings', auth: { require: ['purchase.settings'] } });
    expect(api.page.id).toBe('purchase-settings');
    expect(discovered.pages.get('purchase-settings')?.config.page.id).toBe('purchase-settings');
    expect(discovered.pageDatasources.get('purchase-settings')).toContain('purchase_settings');
    expect(settingsItem).toMatchObject({ path: '/purchase/settings', permission: 'purchase.settings' });
    expect(view).toMatchObject({ source: 'purchase_settings', save_action: 'save_purchase_settings' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Orders', 'Invoicing', 'Products', 'Logistics']);
    expect(view.tabs[0].sections.flatMap((section: any) => section.fields.map((field: any) => field.label))).toEqual([
      'Purchase Order Approval', 'Lock Confirmed Orders', 'Warnings', 'Purchase Agreements', 'Receipt Reminder',
      '3-way matching', 'Variants', 'Variant Grid Entry', 'Units of Measure & Packagings', 'Dropshipping', 'Replenish on Order (MTO)',
    ]);
    expect(yaml('permissions.yaml').permissions).toContain('purchase.settings');
  });

  test('seeds deterministic flags, supports valid updates, and rejects stale or missing records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_settings_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_settings_schema_migrations', ['schema', 'data']);

    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({
      id: 'purchase-settings-demo', row_version: 1, group_send_reminder: true, group_product_variant: true, group_uom: true,
    }) });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});

    const mutation = api.actions.find((action: any) => action.id === 'purchase_settings_update_server').mutation;
    const values = {
      po_order_approval: true, lock_confirmed_po: true, group_warning_purchase: true,
      module_purchase_requisition: true, group_send_reminder: false, group_product_variant: true,
      module_purchase_product_matrix: true, group_uom: true, module_stock_dropshipping: true, replenish_on_order: true,
    };
    const updated = await repository.executeMutation(mutation, { id: 'purchase-settings-demo', expected_row_version: 1, values });
    expect(updated).toMatchObject({ ...values, row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'purchase-settings-demo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_SETTINGS_NOT_FOUND' });
  });

  test('does not use moving-clock or generated fixture values', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260910220000-012-purchase-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(readFileSync(join(serviceRoot, 'api/settings.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
