import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Website Page Manager import parity', () => {
  test('declares the Odoo Page Manager import action and page/API separation', () => {
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    const importAction = api.actions.find((action: any) => action.id === 'import_website_pages');

    expect(page.page.id).toBe('website-pages');
    expect(page.components[0].header_actions).toEqual([
      { id: 'import_website_pages', label: 'Import', permission: 'website.write', variant: 'secondary' },
    ]);
    expect(api.page.id).toBe(page.page.id);
    expect(importAction).toMatchObject({
      type: 'server_form', permission: 'website.write', action: 'website.pages.import',
      handler: 'yaml_mutation', operation: 'create', submit_label: 'Import',
    });
    expect(importAction.fields).toEqual([
      expect.objectContaining({ field: 'page_list', label: 'Page List', type: 'textarea', required: true }),
    ]);
  });

  test('validates, upserts, and keeps imported page state durable', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_import_test', ['schema', 'data']);
    const mutation = yaml('api/pages.yaml').actions.find((action: any) => action.id === 'import_website_pages').mutation;
    const pageList = [
      'website-demo-001|About|/about|Published|true|true|true|false',
      'website-demo-002|API Guide|/api-guide|Draft|true|false|false|true',
    ].join('\n');

    await expect(repository.executeMutation(mutation, { page_list: '' })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_PAGE_IMPORT_REQUIRED' });
    await expect(repository.executeMutation(mutation, { page_list: 'website-demo-001|Broken|about|Draft|true|true|false|false' })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_PAGE_IMPORT_INVALID' });
    await expect(repository.executeMutation(mutation, { page_list: 'missing-site|About|/about|Draft|true|true|false|false' })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_PAGE_IMPORT_SITE_INVALID' });

    const first = await repository.executeMutation(mutation, { page_list: pageList });
    expect(first).toMatchObject({ imported: 2 });
    expect(await repository.query('SELECT website_id, website_name, name, url, state, is_in_menu, track, row_version FROM website_pages WHERE url IN (?, ?) ORDER BY website_id', ['/about', '/api-guide'])).toEqual([
      { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'About', url: '/about', state: 'Published', is_in_menu: true, track: false, row_version: 1 },
      { website_id: 'website-demo-002', website_name: 'Core3 Docs', name: 'API Guide', url: '/api-guide', state: 'Draft', is_in_menu: false, track: true, row_version: 1 },
    ]);

    const second = await repository.executeMutation(mutation, { page_list: 'website-demo-001|About us|/about|Draft|false|false|true|true' });
    expect(second).toMatchObject({ imported: 1 });
    expect(await repository.query('SELECT name, state, is_indexed, is_in_menu, track, row_version FROM website_pages WHERE website_id = ? AND url = ?', ['website-demo-001', '/about'])).toEqual([
      { name: 'About us', state: 'Draft', is_indexed: false, is_in_menu: false, track: true, row_version: 2 },
    ]);
    database.close();
  });

  test('rejects duplicate rows and keeps the write permission explicit', async () => {
    const api = yaml('api/pages.yaml');
    const mutation = api.actions.find((action: any) => action.id === 'import_website_pages').mutation;
    expect(mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WEBSITE_PAGE_IMPORT_DUPLICATE' }),
    ]));
    expect(api.actions.find((action: any) => action.id === 'import_website_pages')).toMatchObject({ permission: 'website.write' });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_import_duplicate_test', ['schema', 'data']);
    await expect(repository.executeMutation(mutation, {
      page_list: 'website-demo-001|About|/about|Draft|true|true|false|false\nwebsite-demo-001|About copy|/about|Draft|true|true|false|false',
    })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_PAGE_IMPORT_DUPLICATE' });
    database.close();
  });

  test('blocks the Page Manager import endpoint for a read-only actor', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_import_permission_test', ['schema', 'data']);
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
      uploadRoot: '/tmp/core3-website-import-test-uploads', eventStore: {}, topics: {},
    });
    const actionUrl = new URL('http://website.test/api/actions/website.pages.import');
    await expect(api(new Request(actionUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_list: 'website-demo-001|Blocked|/blocked|Draft|true|false|false|false' }),
    }), actionUrl)).rejects.toMatchObject({ status: 403 });
    expect((await repository.query("SELECT COUNT(*) AS count FROM website_pages WHERE url = '/blocked'"))[0]).toEqual({ count: 0 });
    database.close();
  });
});
