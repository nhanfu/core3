import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet Settings Odoo parity slice', () => {
  test('keeps the system settings menu, page, API, and shared number control joined by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const manifest = yaml('manifest.yaml');
    const permissions = yaml('permissions.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    const menu = configuration.items.find((item: any) => item.label === 'Settings');
    const view = page.components.find((component: any) => component.type === 'SettingsView');
    const field = view.tabs[0].sections[0].fields[0];
    const save = page.actions.find((action: any) => action.id === 'save_fleet_settings');
    const serverSave = api.actions.find((action: any) => action.id === 'fleet_settings_update_server');
    const source = api.datasources.find((candidate: any) => candidate.id === 'fleet_settings');

    expect(menu).toEqual({ path: '/fleet/config/settings', label: 'Settings', icon: 'settings', permission: 'fleet.settings' });
    expect(page.datasources).toBeUndefined();
    expect(page.page).toEqual({ id: 'fleet-settings', route: '/fleet/config/settings', auth: { require: ['fleet.settings'] } });
    expect(api.page).toEqual({ id: 'fleet-settings' });
    expect(discovered.pages.get('fleet-settings')?.config.page.id).toBe('fleet-settings');
    expect(discovered.pageDatasources.get('fleet-settings')).toEqual(['fleet_settings']);
    expect(permissions.permissions).toContain('fleet.settings');
    expect(view).toMatchObject({ id: 'fleet-settings-view', source: 'fleet_settings', title: 'Settings', save_action: 'save_fleet_settings' });
    expect(view.tabs.map((tab: any) => tab.label)).toEqual(['General Settings']);
    expect(view.tabs[0].sections).toEqual([{ title: 'Fleet Management', fields: [field] }]);
    expect(field).toEqual({ field: 'delay_alert_contract', label: 'End Date Contract Alert', description: 'Send an alert', suffix: 'days before the end date', type: 'number' });
    expect(save).toMatchObject({ id: 'save_fleet_settings', type: 'client', permission: 'fleet.settings' });
    expect(serverSave).toMatchObject({ type: 'server', permission: 'fleet.settings', action: 'fleet.settings.update', handler: 'yaml_mutation', operation: 'update' });
    expect(source).toMatchObject({ id: 'fleet_settings', single: true, permission: 'fleet.settings' });
    expect(api.actions).toHaveLength(1);
    expect(serverSave.mutation.operation).toBe('update');
    expect(serverSave.mutation).not.toHaveProperty('generated');
  });

  test('seeds the Odoo default and covers empty, permission, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_settings_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_settings_migrations', ['schema', 'data']);

    const source = yaml('api/settings.yaml').datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'fleet-settings-demo', row_version: 1, company_name: 'My Company (San Francisco)', delay_alert_contract: 30 },
    });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'unauthorized' }, 0, 1)).rejects.toMatchObject({ status: 401, code: 'FLEET_SETTINGS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'FLEET_SETTINGS_FORBIDDEN' });
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'FLEET_SETTINGS_UNAVAILABLE' });
    database.close();
  });

  test('saves a positive integer and rejects invalid, stale, and missing updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_settings_mutation_migrations', ['schema', 'data']);
    const mutation = yaml('api/settings.yaml').actions[0].mutation;

    const updated = await repository.executeMutation(mutation, {
      id: 'fleet-settings-demo',
      expected_row_version: 1,
      values: { delay_alert_contract: 45 },
    });
    expect(updated).toMatchObject({ id: 'fleet-settings-demo', row_version: 2, delay_alert_contract: 45 });
    await expect(repository.executeMutation(mutation, {
      id: 'fleet-settings-demo', expected_row_version: 1, values: { delay_alert_contract: 60 },
    })).rejects.toMatchObject({ status: 409, code: 'FLEET_SETTINGS_STALE' });
    for (const value of ['', '0', -1, 1.5, 'days']) {
      await expect(repository.executeMutation(mutation, {
        id: 'fleet-settings-demo', expected_row_version: 2, values: { delay_alert_contract: value },
      })).rejects.toMatchObject({ status: 422, code: 'FLEET_SETTINGS_VALUES_INVALID' });
    }
    await expect(repository.executeMutation(mutation, {
      id: 'missing-settings', expected_row_version: 1, values: { delay_alert_contract: 45 },
    })).rejects.toMatchObject({ status: 404, code: 'FLEET_SETTINGS_NOT_FOUND' });
    database.close();
  });

  test('keeps the fixture and shared control independent from moving time or generated IDs', () => {
    const schema = readFileSync(join(root, 'migrations/20260911230000-019-fleet-settings-schema.yaml'), 'utf8');
    const data = readFileSync(join(root, 'migrations/20260911231000-020-fleet-settings-data.yaml'), 'utf8');
    expect(schema).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(data).toContain("'fleet-settings-demo'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/settings.yaml'), 'utf8')}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
