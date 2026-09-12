import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Website Page Manager parity', () => {
  test('joins presentation and API contracts by page.id and traces the Odoo route', () => {
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'website-pages', route: '/website-pages', breadcrumb: ['Website', 'Site', 'Content', 'Pages'] });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('website-pages')).toContain('website_pages');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/website-pages', page: 'website-pages', module: 'website' }),
    ]));
  });

  test('seeds published and draft states, search and empty branches', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_pages_test_migrations', ['schema', 'data']);
    const source = yaml('api/pages.yaml').datasources.find((item: any) => item.id === 'website_pages');

    const rows = await repository.querySource(source, { q: null, state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Home', 'Contact us']);
    expect(rows.data[0]).toMatchObject({ state: 'Published', is_in_menu: true, is_seo_optimized: true });
    expect(rows.data[1]).toMatchObject({ state: 'Draft', is_in_menu: true, is_seo_optimized: false });
    expect((await repository.querySource(source, { q: 'missing', state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, state: 'Published' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Home']);
    database.close();
  });

  test('publishes and unpublishes a page through the declared workflow and permissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_workflow_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    let currentUser: any = { sub: 'website-editor', email: 'editor@workspace.example', name: 'Website Editor', permissions: ['website.read', 'website.write'] };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return currentUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('website_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'website')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'website').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('website')?.config || {},
      uploadRoot: '/tmp/core3-website-test-uploads', eventStore: {}, topics: {},
    });
    const pageId = 'website-page-demo-002';
    const transition = (name: string) => api(new Request(`http://website.test/api/actions/website.pages.${name}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pageId, values: {} }),
    }), new URL(`http://website.test/api/actions/website.pages.${name}`));

    expect((await (await transition('publish')).json())).toMatchObject({ id: pageId, state: 'Published' });
    expect((await repository.query('SELECT state, row_version, date_publish FROM website_pages WHERE id = ?', [pageId]))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    await expect(transition('publish')).rejects.toMatchObject({ status: 409 });
    await expect(transition('unpublish')).rejects.toMatchObject({ status: 403 });

    currentUser = { ...currentUser, permissions: ['website.read', 'website.write', 'website.manage'] };
    expect((await (await transition('unpublish')).json())).toMatchObject({ id: pageId, state: 'Draft' });
    expect((await repository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId]))[0]).toEqual({ state: 'Draft', row_version: 3 });
    database.close();
  });

  test('edits page metadata with row-version and site guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_edit_test', ['schema', 'data']);
    const pageApi = yaml('api/pages.yaml');
    const edit = pageApi.actions.find((action: any) => action.id === 'edit_website_page');
    const mutation = edit.mutation;

    const updated = await repository.executeMutation(mutation, {
      id: 'website-page-demo-002',
      expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact', url: '/contact', content_html: '<p>Contact the team.</p>', is_indexed: true, is_homepage: false, is_in_menu: true, is_seo_optimized: true },
    });
    expect(updated).toMatchObject({ id: 'website-page-demo-002', name: 'Contact', url: '/contact', content_html: '<p>Contact the team.</p>', row_version: 2 });
    expect((await repository.query('SELECT name, url, content_html, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ name: 'Contact', url: '/contact', content_html: '<p>Contact the team.</p>', row_version: 2 });
    await expect(repository.executeMutation(mutation, {
      id: 'website-page-demo-002', expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Stale', url: '/stale' },
    })).rejects.toMatchObject({ status: 409 });
    database.close();
  });

  test('keeps Odoo view labels and permission boundaries explicit', () => {
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    expect(page.components[0].view_navigation).toBe('tabs');
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Page Title', 'Page URL', 'Indexed', 'Is In Main Menu', 'Is SEO Optimized', 'Is Published']);
    expect(api.actions.find((action: any) => action.id === 'create_website_page')).toMatchObject({ permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'edit_website_page')).toMatchObject({ action: 'website.pages.update', permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'unpublish_website_page')).toMatchObject({ permission: 'website.manage' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['website.read', 'website.write', 'website.manage']));
  });
});
