import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Live Chat user settings parity', () => {
  test('keeps the page/API contract and configuration route joined by page.id', () => {
    const page = yaml('pages/user-settings.yaml');
    const api = yaml('api/user-settings.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'livechat-user-settings', route: '/livechat/user-settings', auth: { require: ['livechat.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('livechat-user-settings')).toContain('livechat_user_settings');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/user-settings', page: 'livechat-user-settings', module: 'livechat' }),
    ]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/livechat/user-settings', label: 'User Settings', icon: 'settings', permission: 'livechat.read' });
    expect(page.components[0]).toMatchObject({ type: 'SettingsView', source: 'livechat_user_settings', save_action: 'save_livechat_user_settings' });
    expect(page.components[0].tabs[0].sections[0].fields.map((field: any) => field.label))
      .toEqual(['Livechat Name', 'Spoken Languages', 'Expertise', 'Available for Live Chat']);
  });

  test('persists operator settings and enforces missing, stale, invalid, and permission boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_user_settings_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_user_settings_test_migrations', ['schema', 'data']);

    const api = yaml('api/user-settings.yaml');
    const source = api.datasources[0];
    const save = api.actions[0];
    expect(await repository.querySource(source, { current_user_id: 'user-admin', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { id: 'user-admin', livechat_name: 'Mitchell Admin', spoken_languages: 'English, French', expertise_names: 'Livechat, Support', livechat_enabled: true, row_version: 1 } });
    expect((await repository.querySource(source, { current_user_id: 'user-admin', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { current_user_id: 'user-admin', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_USER_SETTINGS_FORBIDDEN' });
    await expect(repository.querySource(source, { current_user_id: 'user-admin', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_USER_SETTINGS_UNAVAILABLE' });

    const updated = await repository.executeMutation(save.mutation, { id: 'user-admin', expected_row_version: 1, values: { livechat_name: 'Maya Chen', spoken_languages: 'English, Vietnamese', expertise_names: 'Billing', livechat_enabled: false } });
    expect(updated).toMatchObject({ id: 'user-admin', livechat_name: 'Maya Chen', spoken_languages: 'English, Vietnamese', expertise_names: 'Billing', livechat_enabled: false, row_version: 2 });
    await expect(repository.executeMutation(save.mutation, { id: 'user-admin', expected_row_version: 1, values: { livechat_name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_USER_SETTINGS_STALE' });
    await expect(repository.executeMutation(save.mutation, { id: 'user-admin', expected_row_version: 2, values: { livechat_name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_USER_SETTINGS_VALUES_INVALID' });
    await expect(repository.executeMutation(save.mutation, { id: 'missing-livechat-user', expected_row_version: 1, values: { livechat_name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_USER_SETTINGS_NOT_FOUND' });
    expect(save.permission).toBe('livechat.write');
    expect(source.permission).toBe('livechat.read');
  });
});
