import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
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
    expect(rows.data.map((row: any) => row.name)).toEqual(['Home', 'Docs Home', 'Contact us']);
    expect(rows.data[0]).toMatchObject({ state: 'Published', is_in_menu: true, is_seo_optimized: true });
    expect(rows.data[2]).toMatchObject({ state: 'Draft', is_in_menu: true, is_seo_optimized: false });
    expect((await repository.querySource(source, { q: 'missing', state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, state: 'Published' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Home', 'Docs Home']);
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
    const transition = (name: string, expected_row_version?: number) => api(new Request(`http://website.test/api/actions/website.pages.${name}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pageId, ...(expected_row_version === undefined ? {} : { expected_row_version }), values: {} }),
    }), new URL(`http://website.test/api/actions/website.pages.${name}`));

    await expect(transition('publish')).rejects.toMatchObject({ status: 400, code: 'WEBSITE_PAGE_VERSION_REQUIRED' });
    expect((await (await transition('publish', 1)).json())).toMatchObject({ id: pageId, state: 'Published' });
    expect((await repository.query('SELECT state, row_version, date_publish FROM website_pages WHERE id = ?', [pageId]))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    await expect(transition('publish', 1)).rejects.toMatchObject({ status: 409, code: 'WEBSITE_PAGE_PUBLISH_STALE' });
    await expect(transition('unpublish', 1)).rejects.toMatchObject({ status: 403 });

    currentUser = { ...currentUser, permissions: ['website.read', 'website.write', 'website.manage'] };
    await expect(transition('unpublish')).rejects.toMatchObject({ status: 400, code: 'WEBSITE_PAGE_VERSION_REQUIRED' });
    expect((await (await transition('unpublish', 2)).json())).toMatchObject({ id: pageId, state: 'Draft' });
    expect((await repository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId]))[0]).toEqual({ state: 'Draft', row_version: 3 });
    await expect(transition('unpublish', 2)).rejects.toMatchObject({ status: 409, code: 'WEBSITE_PAGE_UNPUBLISH_STALE' });
    database.close();
  });

  test('preserves publication state and version across a file-backed restart', async () => {
    const databasePath = `/tmp/core3-website-publish-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_publish_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const workflow = yaml('pages/website-workflow.yaml').workflow;
    const publish = workflow.transitions.find((transition: any) => transition.id === 'publish');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(publish.mutation, { id: 'website-page-demo-002', expected_row_version: 1 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT state, row_version, date_publish FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('completes publish and unpublish across restarts and rejects a replayed transition', async () => {
    const databasePath = `/tmp/core3-website-publish-cycle-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_publish_cycle_${crypto.randomUUID().replaceAll('-', '_')}`;
    const workflow = yaml('pages/website-workflow.yaml').workflow;
    const publish = workflow.transitions.find((transition: any) => transition.id === 'publish');
    const unpublish = workflow.transitions.find((transition: any) => transition.id === 'unpublish');
    const pageId = 'website-page-demo-002';

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(publish.mutation, { id: pageId, expected_row_version: 1 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId]))[0]).toEqual({ state: 'Published', row_version: 2 });
    await secondRepository.executeMutation(unpublish.mutation, { id: pageId, expected_row_version: 2 });
    second.close();

    const third = await DuckDbDatabase.open(databasePath);
    const thirdRepository = new YamlRepository(third);
    await migrateDatabase(thirdRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await thirdRepository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId]))[0]).toEqual({ state: 'Draft', row_version: 3 });
    await expect(thirdRepository.executeMutation(unpublish.mutation, { id: pageId, expected_row_version: 2 })).rejects.toMatchObject({
      status: 409,
      code: 'WEBSITE_PAGE_UNPUBLISH_STALE',
    });
    expect((await thirdRepository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId]))[0]).toEqual({ state: 'Draft', row_version: 3 });
    third.close();
    rmSync(databasePath, { force: true });
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

  test('preserves edited content across a file-backed database restart and migration replay', async () => {
    const databasePath = `/tmp/core3-website-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const edit = yaml('api/pages.yaml').actions.find((action: any) => action.id === 'edit_website_page');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(edit.mutation, {
      id: 'website-page-demo-001', expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Home updated', url: '/', content_html: '<p>Restart-safe content.</p>', is_indexed: true, is_homepage: true, is_in_menu: true, is_seo_optimized: true },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, content_html, state, row_version FROM website_pages WHERE id = ?', ['website-page-demo-001']))[0]).toMatchObject({ name: 'Home updated', content_html: '<p>Restart-safe content.</p>', state: 'Published', row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('keeps Odoo view labels and permission boundaries explicit', () => {
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    expect(page.components[0].view_navigation).toBe('tabs');
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Page Title', 'Page URL', 'Indexed', 'Is In Main Menu', 'Is SEO Optimized', 'Is Published']);
    expect(page.components[0].actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'website.pages.export', label: 'Export', permission: 'website.read' }),
    ]));
    expect(api.actions.find((action: any) => action.id === 'website.pages.export')).toMatchObject({ type: 'client', permission: 'website.read' });
    expect(api.actions.find((action: any) => action.id === 'create_website_page')).toMatchObject({ permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'edit_website_page')).toMatchObject({ action: 'website.pages.update', permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'unpublish_website_page')).toMatchObject({ permission: 'website.manage' });
    expect(yaml('pages/website-workflow.yaml').workflow.transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'publish', mutation: expect.objectContaining({ guards: expect.arrayContaining([expect.objectContaining({ code: 'WEBSITE_PAGE_VERSION_REQUIRED' }), expect.objectContaining({ code: 'WEBSITE_PAGE_PUBLISH_STALE' })]) }) }),
      expect.objectContaining({ id: 'unpublish', mutation: expect.objectContaining({ guards: expect.arrayContaining([expect.objectContaining({ code: 'WEBSITE_PAGE_VERSION_REQUIRED' }), expect.objectContaining({ code: 'WEBSITE_PAGE_UNPUBLISH_STALE' })]) }) }),
    ]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['website.read', 'website.write', 'website.manage']));
  });

  test('joins the page detail attachment manager to the page and asset actions', () => {
    const page = yaml('pages/page-detail.yaml');
    const api = yaml('api/page-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.page).toMatchObject({ id: 'website-page-detail', route: '/website-pages/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({
      source: 'website_page_detail',
      attachment_source: 'website_page_assets',
      attachment_upload_action: 'upload_website_page_asset',
      attachment_download_action: 'download_website_page_asset',
      attachment_actions: expect.arrayContaining([
        expect.objectContaining({ id: 'publish_website_page_asset', label: 'Make public' }),
        expect.objectContaining({ id: 'privatize_website_page_asset', label: 'Make private' }),
      ]),
    });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['website_page_detail', 'website_page_assets']);
    expect(api.actions.find((action: any) => action.id === 'upload_website_page_asset')).toMatchObject({ type: 'upload', kind: 'website_page_asset', permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'download_website_page_asset')).toMatchObject({ type: 'download', kind: 'website_page_asset', permission: 'website.read' });
  });
});
