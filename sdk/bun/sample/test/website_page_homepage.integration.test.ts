import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Page Properties homepage parity', () => {
  test('traces Odoo homepage inverse behavior and joins the page/API actions', () => {
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/website_page_properties.py', 'utf8');
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    const actions = api.actions.filter((action: any) => action.action === 'website.pages.homepage.set' || action.action === 'website.pages.homepage.clear');

    expect(odooView).toContain('field name="is_homepage"');
    expect(odooModel).toContain('def _inverse_is_homepage');
    expect(odooModel).toContain('self.website_id.homepage_url = url');
    expect(api.page.id).toBe(page.page.id);
    expect(actions).toHaveLength(2);
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ permission: 'website.write', handler: 'yaml_mutation' }),
    ]));
    expect(page.components[0].actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'set_website_page_homepage', label: 'Set as homepage' }),
      expect.objectContaining({ id: 'clear_website_page_homepage', label: 'Clear homepage' }),
    ]));
  });

  test('selects one page per website, clears back to the root, and persists the website URL', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_page_homepage_test', ['schema', 'data']);
    const api = yaml('api/pages.yaml');
    const setHomepage = api.actions.find((action: any) => action.id === 'set_website_page_homepage');
    const clearHomepage = api.actions.find((action: any) => action.id === 'clear_website_page_homepage');

    const selected = await repository.executeMutation(setHomepage.mutation, {
      id: 'website-page-demo-002', website_id: 'website-demo-001', expected_row_version: 1, expected_website_row_version: 1,
    }) as any;
    expect(selected).toMatchObject({ id: 'website-page-demo-002', is_homepage: true, row_version: 2 });
    expect(await repository.query('SELECT id, is_homepage FROM website_pages WHERE website_id = ? ORDER BY id', ['website-demo-001'])).toEqual([
      { id: 'website-page-demo-001', is_homepage: false },
      { id: 'website-page-demo-002', is_homepage: true },
    ]);
    expect((await repository.query('SELECT homepage_url, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ homepage_url: '/contactus', row_version: 2 });

    const cleared = await repository.executeMutation(clearHomepage.mutation, {
      id: 'website-page-demo-002', website_id: 'website-demo-001', expected_row_version: 2, expected_website_row_version: 2,
    }) as any;
    expect(cleared).toMatchObject({ id: 'website-page-demo-002', is_homepage: false, row_version: 3 });
    expect(await repository.query('SELECT id, is_homepage FROM website_pages WHERE website_id = ? ORDER BY id', ['website-demo-001'])).toEqual([
      { id: 'website-page-demo-001', is_homepage: true },
      { id: 'website-page-demo-002', is_homepage: false },
    ]);
    expect((await repository.query('SELECT homepage_url, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ homepage_url: null, row_version: 3 });
    await expect(repository.executeMutation(clearHomepage.mutation, {
      id: 'website-page-demo-002', website_id: 'website-demo-001', expected_row_version: 2, expected_website_row_version: 2,
    })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_PAGE_HOMEPAGE_STALE' });
    database.close();
  });

  test('survives restart and keeps the homepage action write-bound', async () => {
    const databasePath = `/tmp/core3-website-homepage-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_page_homepage_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const setHomepage = yaml('api/pages.yaml').actions.find((action: any) => action.id === 'set_website_page_homepage');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(setHomepage.mutation, {
      id: 'website-page-demo-002', website_id: 'website-demo-001', expected_row_version: 1, expected_website_row_version: 1,
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT homepage_url, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ homepage_url: '/contactus', row_version: 2 });
    expect((await secondRepository.query('SELECT is_homepage, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ is_homepage: true, row_version: 2 });

    const yamlApi = createYamlApi({
      repository: secondRepository,
      authProvider: {
        async getCurrentUser() { return { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map(yaml('api/pages.yaml').datasources.map((source: any) => [source.id, source])),
      pageSources: new Map(),
      pages: new Map([['website-pages', { ...yaml('pages/pages.yaml'), actions: yaml('api/pages.yaml').actions }]]),
      catalogs: new Map(),
      menus: new Map(),
      workflows: new Map([['website_pages', yaml('pages/website-workflow.yaml').workflow]]),
      workflowFiles: new Map([['website_pages', join(root, 'pages/website-workflow.yaml')]]),
      permissions: { permissions: ['website.read', 'website.write', 'website.manage'], tables: {}, endpoints: {} },
      uploadRoot: '/tmp/core3-website-page-homepage-test-uploads', eventStore: {}, topics: {},
    });
    await expect(yamlApi(new Request('http://website.test/api/actions/website.pages.homepage.set', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-page-demo-002', expected_row_version: 2, values: { website_id: 'website-demo-001', expected_website_row_version: 2 } }),
    }), new URL('http://website.test/api/actions/website.pages.homepage.set'))).rejects.toMatchObject({ status: 403 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
