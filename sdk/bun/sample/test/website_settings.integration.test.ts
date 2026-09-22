import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website settings identification parity', () => {
  test('traces Odoo Settings action and joins the page/API contracts', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/res_config_settings_views.xml', 'utf8');
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');

    expect(odoo).toContain('id="action_website_configuration"');
    expect(odoo).toContain('id="menu_website_website_settings"');
    expect(odoo).toContain('string="Website Identification"');
    expect(odoo).toContain('name="website_name"');
    expect(odoo).toContain('name="favicon"');
    expect(page.page).toMatchObject({ id: 'website-settings', route: '/website-settings', auth: { require: ['website.manage'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toContain('website_settings');
    expect(config.items).toContainEqual({ path: '/website-settings', label: 'Settings', icon: 'settings', permission: 'website.manage' });
    expect(page.components[0].tabs[0].sections.map((section: any) => section.title)).toEqual(['General', 'Website Identification']);
    expect(api.actions.find((action: any) => action.id === 'website_settings_update_server')).toMatchObject({ permission: 'website.manage', action: 'website.settings.update' });
  });

  test('persists per-site identification settings and rejects invalid or stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_settings_guards', ['schema', 'data']);
    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    const mutation = api.actions.find((action: any) => action.id === 'website_settings_update_server').mutation;

    expect((await repository.querySource(source, { website_id: 'website-demo-001' }, 0, 1)).data).toMatchObject({
      id: 'website-demo-001', name: 'Core3 Storefront', domain: 'https://www.core3.example',
    });
    const updated = await repository.executeMutation(mutation, {
      id: 'website-demo-001', expected_row_version: 1,
      values: { name: 'Core3 Storefront QA', domain: 'https://qa.core3.example' },
    });
    expect(updated).toMatchObject({ id: 'website-demo-001', row_version: 2, name: 'Core3 Storefront QA', domain: 'https://qa.core3.example' });
    await expect(repository.executeMutation(mutation, {
      id: 'website-demo-001', expected_row_version: 1,
      values: { name: 'Stale', domain: 'https://stale.example' },
    })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_SETTINGS_STALE' });
    await expect(repository.executeMutation(mutation, {
      id: 'website-demo-001', expected_row_version: 2,
      values: { name: '', domain: 'https://qa.core3.example' },
    })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_SETTINGS_NAME_INVALID' });
    await expect(repository.executeMutation(mutation, {
      id: 'website-demo-001', expected_row_version: 2,
      values: { name: 'Core3 Storefront QA', domain: 'not-a-url' },
    })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_SETTINGS_DOMAIN_INVALID' });
    database.close();
  });

  test('replays the durable setting across a DuckDB restart and keeps the permission boundary declared', async () => {
    const databasePath = `/tmp/core3-website-settings-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_settings_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const mutation = yaml('api/settings.yaml').actions.find((action: any) => action.id === 'website_settings_update_server').mutation;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(mutation, { id: 'website-demo-002', expected_row_version: 1, values: { name: 'Core3 Docs QA', domain: 'https://docs.qa.core3.example' } });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, domain, row_version FROM website_websites WHERE id = ?', ['website-demo-002']))[0]).toEqual({ name: 'Core3 Docs QA', domain: 'https://docs.qa.core3.example', row_version: 2 });
    expect(yaml('api/settings.yaml').datasources[0].permission).toBe('website.manage');
    expect(yaml('api/settings.yaml').actions.find((action: any) => action.id === 'save_website_identification').permission).toBe('website.manage');
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('blocks the settings endpoint for a read-only Website actor without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_settings_permission', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('website_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([id]) => discovered.pages.get(id)?.module === 'website')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'website').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('website')?.config || {},
      uploadRoot: '/tmp/core3-website-settings-test-uploads', eventStore: {}, topics: {},
    });
    const actionUrl = new URL('http://website.test/api/actions/website.settings.update');
    await expect(api(new Request(actionUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-demo-001', expected_row_version: 1, values: { name: 'Blocked', domain: 'https://blocked.example' } }),
    }), actionUrl)).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT name, domain, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ name: 'Core3 Storefront', domain: 'https://www.core3.example', row_version: 1 });
    database.close();
  });
});
