import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website cookie consent settings parity', () => {
  test('traces the Odoo cookie-bar settings and keeps the Website page/API contract joined', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/res_config_settings_views.xml', 'utf8');
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const sections = page.components[0].tabs[0].sections;
    const consent = sections.find((section: any) => section.title === 'Tracking & Consent');
    const update = api.actions.find((action: any) => action.id === 'website_settings_update_server');

    expect(odoo).toContain('id="website_cookies_bar_setting"');
    expect(odoo).toContain('field name="website_cookies_bar"');
    expect(odoo).toContain('field name="website_block_third_party_domains"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources[0].query).toContain('cookies_bar');
    expect(api.datasources[0].query).toContain('block_third_party_domains');
    expect(consent.fields).toEqual([
      expect.objectContaining({ field: 'cookies_bar', label: 'Cookies bar', type: 'checkbox' }),
      expect.objectContaining({ field: 'block_third_party_domains', label: 'Block tracking 3rd-party services', type: 'checkbox' }),
    ]);
    expect(update).toMatchObject({ permission: 'website.manage' });
    expect(update.mutation.fields).toEqual(expect.arrayContaining(['cookies_bar', 'block_third_party_domains']));
    expect(update.mutation.boolean_fields).toEqual(['cookies_bar', 'block_third_party_domains']);
  });

  test('persists consent flags, normalizes checkbox values, and enforces stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_cookie_consent_settings', ['schema', 'data']);
    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    const mutation = api.actions.find((action: any) => action.id === 'website_settings_update_server').mutation;

    expect((await repository.querySource(source, { website_id: 'website-demo-001' }, 0, 1)).data).toMatchObject({
      cookies_bar: false,
      block_third_party_domains: true,
    });
    const updated = await repository.executeMutation(mutation, {
      id: 'website-demo-001',
      expected_row_version: 1,
      values: { name: 'Core3 Storefront', domain: 'https://www.core3.example', cookies_bar: 'true', block_third_party_domains: 'false' },
    });
    expect(updated).toMatchObject({ id: 'website-demo-001', row_version: 2, cookies_bar: true, block_third_party_domains: false });
    await expect(repository.executeMutation(mutation, {
      id: 'website-demo-001',
      expected_row_version: 1,
      values: { name: 'Stale', domain: 'https://stale.example', cookies_bar: false, block_third_party_domains: true },
    })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_SETTINGS_STALE' });
    database.close();
  });

  test('replays cookie consent settings across restart and blocks read-only actors', async () => {
    const databasePath = `/tmp/core3-website-cookie-consent-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_cookie_consent_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const mutation = yaml('api/settings.yaml').actions.find((action: any) => action.id === 'website_settings_update_server').mutation;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(mutation, {
      id: 'website-demo-002',
      expected_row_version: 1,
      values: { name: 'Core3 Docs', domain: 'https://docs.core3.example', cookies_bar: true, block_third_party_domains: false },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT cookies_bar, block_third_party_domains, row_version FROM website_websites WHERE id = ?', ['website-demo-002']))[0]).toEqual({
      cookies_bar: true,
      block_third_party_domains: false,
      row_version: 2,
    });
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDatabase = await DuckDbDatabase.open(':memory:');
    const permissionRepository = new YamlRepository(permissionDatabase);
    await migrateDatabase(permissionRepository, join(root, 'migrations'), undefined, 'website_cookie_consent_permission', ['schema', 'data']);
    const page = yaml('pages/settings.yaml');
    const settingsApi = yaml('api/settings.yaml');
    const permissions = yaml('permissions.yaml');
    const api = createYamlApi({
      repository: permissionRepository,
      authProvider: {
        async getCurrentUser() { return { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map(settingsApi.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map([['website-settings', ['website_settings']]]),
      pages: new Map([['website-settings', { page: page.page, components: page.components, actions: settingsApi.actions }]]),
      catalogs: new Map(),
      menus: new Map(),
      workflows: new Map(),
      workflowFiles: new Map(),
      permissions,
      uploadRoot: '/tmp/core3-website-cookie-consent-test-uploads', eventStore: {}, topics: {},
    });
    const actionUrl = new URL('http://website.test/api/actions/website.settings.update');
    await expect(api(new Request(actionUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-demo-001', expected_row_version: 1, values: { name: 'Blocked', domain: 'https://blocked.example', cookies_bar: true, block_third_party_domains: false } }),
    }), actionUrl)).rejects.toMatchObject({ status: 403 });
    expect((await permissionRepository.query('SELECT cookies_bar, block_third_party_domains, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({
      cookies_bar: false,
      block_third_party_domains: true,
      row_version: 1,
    });
    permissionDatabase.close();
  });
});
