import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Page Manager old-URL redirect parity', () => {
  test('traces Odoo Page Properties redirect controls and keeps page/API contracts joined', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml', 'utf8');
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    const edit = api.actions.find((action: any) => action.id === 'edit_website_page');

    expect(odoo).toContain('field name="redirect_old_url"');
    expect(odoo).toContain('field name="redirect_type"');
    expect(api.page.id).toBe(page.page.id);
    expect(edit).toMatchObject({ permission: 'website.write', action: 'website.pages.update', operation: 'update' });
    expect(edit.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'redirect_old_url', type: 'checkbox' }),
      expect.objectContaining({ field: 'redirect_type', type: 'select' }),
    ]));
    expect(edit.mutation.before_steps[0].query).toContain('old_url');
    expect(edit.mutation.steps[0].query).toContain('website_page_redirects');
  });

  test('creates a durable 301 redirect only when a page URL changes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_page_redirect_test', ['schema', 'data']);
    const edit = yaml('api/pages.yaml').actions.find((action: any) => action.id === 'edit_website_page');

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'website-page-demo-002',
      expected_row_version: 1,
      values: {
        website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact us', url: '/contact',
        content_html: '<p>Contact the team.</p>', is_indexed: true, is_homepage: false,
        is_in_menu: true, is_seo_optimized: false, track: false, redirect_old_url: true, redirect_type: '301',
      },
    }) as any;
    expect(updated).toMatchObject({ id: 'website-page-demo-002', url: '/contact', row_version: 2 });
    expect(await repository.query('SELECT page_id, url_from, url_to, redirect_type, active FROM website_page_redirects')).toEqual([{
      page_id: 'website-page-demo-002', url_from: '/contactus', url_to: '/contact', redirect_type: '301', active: true,
    }]);

    await expect(repository.executeMutation(edit.mutation, {
      id: 'website-page-demo-002', expected_row_version: 2,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact us', url: '/contact', redirect_old_url: true, redirect_type: '308' },
    })).rejects.toMatchObject({ status: 422, code: 'WEBSITE_PAGE_REDIRECT_TYPE_INVALID' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM website_page_redirects')).toEqual([{ count: 1 }]);
    database.close();
  });

  test('preserves page redirects across restart and blocks read-only actors', async () => {
    const databasePath = `/tmp/core3-website-page-redirect-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_page_redirect_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const edit = yaml('api/pages.yaml').actions.find((action: any) => action.id === 'edit_website_page');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(edit.mutation, {
      id: 'website-page-demo-002', expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact us', url: '/contact-restart', redirect_old_url: true, redirect_type: '302' },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT url_from, url_to, redirect_type, row_version FROM website_page_redirects')).toEqual([{
      url_from: '/contactus', url_to: '/contact-restart', redirect_type: '302', row_version: 1,
    }]);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const api = createYamlApi({
      repository: secondRepository,
      authProvider: {
        async getCurrentUser() { return { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] }; },
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
      uploadRoot: '/tmp/core3-website-page-redirect-test-uploads', eventStore: {}, topics: {},
    });
    await expect(api(new Request('http://website.test/api/actions/website.pages.update', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-page-demo-002', expected_row_version: 2, values: { website_id: 'website-demo-001', name: 'Blocked', url: '/blocked', redirect_old_url: true, redirect_type: '301' } }),
    }), new URL('http://website.test/api/actions/website.pages.update'))).rejects.toMatchObject({ status: 403 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
