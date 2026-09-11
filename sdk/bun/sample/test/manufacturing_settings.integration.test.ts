import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Manufacturing Settings parity slice', () => {
  test('binds the manager-only form to its page-owned API contract', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const settingsItem = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Settings');
    const view = page.components.find((component: any) => component.type === 'SettingsView');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-settings', route: '/manufacturing/settings', auth: { require: ['manufacturing.manage'] } });
    expect(api.page.id).toBe('manufacturing-settings');
    expect(discovered.pages.get('manufacturing-settings')?.config.page.id).toBe('manufacturing-settings');
    expect(discovered.pageDatasources.get('manufacturing-settings')).toContain('manufacturing_settings');
    expect(settingsItem).toMatchObject({ path: '/manufacturing/settings', permission: 'manufacturing.manage' });
    expect(view).toMatchObject({ source: 'manufacturing_settings', save_action: 'save_manufacturing_settings' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Operations', 'Planning']);
    expect(view.tabs[0].sections.flatMap((section: any) => section.fields.map((field: any) => field.label))).toEqual([
      'Work Orders', 'Work Order Dependencies', 'Subcontracting', 'Barcode Scanner', 'Quality',
      'Unlock Manufacturing Orders', 'By-Products', 'Allocation Report for Manufacturing Orders', 'Master Production Schedule',
    ]);
    expect(yaml('permissions.yaml').permissions).toContain('manufacturing.manage');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 } });
  });

  test('seeds live defaults, supports a valid save, and rejects stale or missing settings', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'mrp_settings_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'mrp_settings_schema_migrations', ['schema', 'data']);

    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({
      id: 'manufacturing-settings-demo', row_version: 1, company_name: 'My Company (San Francisco)', group_mrp_routings: true,
      group_mrp_workorder_dependencies: false, module_quality_control: false,
    }) });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});

    const mutation = api.actions.find((action: any) => action.id === 'manufacturing_settings_update_server').mutation;
    const values = {
      group_mrp_routings: true, group_mrp_workorder_dependencies: true, module_mrp_subcontracting: true,
      module_stock_barcode: false, module_quality_control: true,
      group_unlocked_by_default: true, group_mrp_byproducts: true, group_mrp_reception_report: true, module_mrp_mps: true,
    };
    const updated = await repository.executeMutation(mutation, { id: 'manufacturing-settings-demo', expected_row_version: 1, values });
    expect(updated).toMatchObject({ ...values, row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'manufacturing-settings-demo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'MRP_SETTINGS_NOT_FOUND' });
  });

  test('keeps the settings fixture deterministic', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911200000-013-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(readFileSync(join(serviceRoot, 'api/settings.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
