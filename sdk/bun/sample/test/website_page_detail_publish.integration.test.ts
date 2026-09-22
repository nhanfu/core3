import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Page Manager detail publication parity', () => {
  test('traces the Odoo page form and joins detail page/API contracts', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml', 'utf8');
    const page = yaml('pages/page-detail.yaml');
    const api = yaml('api/page-detail.yaml');
    const headerActions = page.components[0].header_actions;
    const publish = api.actions.find((action: any) => action.id === 'publish_website_page_detail');
    const unpublish = api.actions.find((action: any) => action.id === 'unpublish_website_page_detail');

    expect(odoo).toContain('model">website.page</field>');
    expect(odoo).toContain('<field name="is_published"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.id).toBe('website-page-detail');
    expect(headerActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'publish_website_page_detail', label: 'Publish', permission: 'website.write', show_if: "row.state === 'Draft'" }),
      expect.objectContaining({ id: 'unpublish_website_page_detail', label: 'Unpublish', permission: 'website.manage', show_if: "row.state === 'Published'" }),
    ]));
    expect(publish).toMatchObject({ permission: 'website.write', handler: 'order_transition', workflow: 'website_pages', operation: 'publish' });
    expect(unpublish).toMatchObject({ permission: 'website.manage', handler: 'order_transition', workflow: 'website_pages', operation: 'unpublish' });
    expect(publish.refresh).toEqual(['website_page_detail', 'website_page_assets']);
    expect(unpublish.refresh).toEqual(['website_page_detail', 'website_page_assets']);
  });

  test('detail publication actions reuse guarded transitions and persist across restart', async () => {
    const databasePath = `/tmp/core3-website-page-detail-publish-${crypto.randomUUID()}.duckdb`;
    const workflow = yaml('pages/website-workflow.yaml').workflow;
    const publish = workflow.transitions.find((transition: any) => transition.id === 'publish');
    const unpublish = workflow.transitions.find((transition: any) => transition.id === 'unpublish');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, `website_page_detail_publish_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);

    await firstRepository.executeMutation(publish.mutation, { id: 'website-page-demo-002', expected_row_version: 1 });
    expect((await firstRepository.query('SELECT state, row_version, date_publish FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, `website_page_detail_publish_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    await secondRepository.executeMutation(unpublish.mutation, { id: 'website-page-demo-002', expected_row_version: 2 });
    expect((await secondRepository.query('SELECT state, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ state: 'Draft', row_version: 3 });
    await expect(secondRepository.executeMutation(unpublish.mutation, { id: 'website-page-demo-002', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_PAGE_UNPUBLISH_STALE' });
    second.close();
  });

  test('routes the detail buttons through the exact permissioned action endpoints', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_page_detail_publish_api', ['schema', 'data']);
    const page = yaml('pages/page-detail.yaml');
    const pagesApi = yaml('api/pages.yaml');
    const detailApi = yaml('api/page-detail.yaml');
    const workflow = yaml('pages/website-workflow.yaml');
    const permissions = yaml('permissions.yaml');
    let currentUser: any = { sub: 'website-editor', email: 'editor@workspace.example', name: 'Website Editor', permissions: ['website.read', 'website.write'] };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return currentUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...pagesApi.datasources, ...detailApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map([['website-page-detail', detailApi.datasources.map((source: any) => source.id)]]),
      pages: new Map([['website-page-detail', { ...page.page, components: page.components, actions: detailApi.actions }]]),
      catalogs: new Map(),
      menus: new Map(),
      workflows: new Map([['website_pages', workflow.workflow]]),
      workflowFiles: new Map([['website_pages', join(root, 'pages/website-workflow.yaml')]]),
      permissions,
      uploadRoot: '/tmp/core3-website-page-detail-publish-uploads', eventStore: {}, topics: {},
    });
    const pageId = 'website-page-demo-002';
    const action = (name: string, expectedRowVersion?: number) => api(new Request(`http://website.test/api/actions/website.pages.${name}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pageId, ...(expectedRowVersion === undefined ? {} : { expected_row_version: expectedRowVersion }), values: {} }),
    }), new URL(`http://website.test/api/actions/website.pages.${name}`));

    const published = await action('publish', 1);
    expect((await published.json())).toMatchObject({ id: pageId, state: 'Published', row_version: 2 });
    currentUser = { ...currentUser, permissions: ['website.read', 'website.write', 'website.manage'] };
    const unpublished = await action('unpublish', 2);
    expect((await unpublished.json())).toMatchObject({ id: pageId, state: 'Draft', row_version: 3 });
    currentUser = { ...currentUser, permissions: ['website.read'] };
    await expect(action('publish', 3)).rejects.toMatchObject({ status: 403, message: 'Requires permission: website.write' });
    expect(await repository.query('SELECT state, row_version FROM website_pages WHERE id = ?', [pageId])).toEqual([{ state: 'Draft', row_version: 3 }]);
    database.close();
  });

  test('detail actions keep the Odoo manager permission boundary', () => {
    const api = yaml('api/page-detail.yaml');
    const publish = api.actions.find((action: any) => action.id === 'publish_website_page_detail');
    const unpublish = api.actions.find((action: any) => action.id === 'unpublish_website_page_detail');
    expect(publish.permission).toBe('website.write');
    expect(unpublish.permission).toBe('website.manage');
    expect(publish.workflow).toBe('website_pages');
    expect(unpublish.workflow).toBe('website_pages');
  });
});
