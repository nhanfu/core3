import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function migratedDatabase(path = ':memory:', migrationName = `website_redirects_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

function createApi(repository: YamlRepository, currentUser: any) {
  const discovered = discoverPages(sampleRoot);
  return createYamlApi({
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
    uploadRoot: '/tmp/core3-website-redirect-manager-uploads', eventStore: {}, topics: {},
  });
}

describe('Website Redirects manager parity', () => {
  test('joins the YAML page/API contract and traces the Odoo action and filters', () => {
    const page = yaml('pages/redirects.yaml');
    const api = yaml('api/redirects.yaml');
    const manifest = yaml('manifest.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_rewrite.xml', 'utf8');
    const discovered = discoverPages(sampleRoot);

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'website-redirects', route: '/website-rewrite', breadcrumb: ['Website', 'Configuration', 'Redirects'] });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('website-redirects')).toContain('website_redirects');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/website-rewrite', page: 'website-redirects', module: 'website' }),
    ]));
    expect(manifest.menu.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'configuration', items: expect.arrayContaining([expect.objectContaining({ path: '/website-rewrite', label: 'Redirects' })]) }),
    ]));
    expect(odoo).toContain('id="action_website_rewrite_list"');
    expect(odoo).toContain('path">website-rewrite');
    expect(odoo).toContain('string="404 Not Found"');
    expect(odoo).toContain('string="Archived"');
  });

  test('lists durable redirects with URL, type, and active filters', async () => {
    const { database, repository } = await migratedDatabase();
    const source = yaml('api/redirects.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, redirect_type: null, active: null }, 0, 50);
    expect(all.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'website-redirect-demo-001', redirect_type: '301', url_from: '/legacy-contact', url_to: '/contactus', active: true }),
    ]));
    expect((await repository.querySource(source, { q: 'legacy', redirect_type: null, active: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['website-redirect-demo-001']);
    expect((await repository.querySource(source, { q: null, redirect_type: '404', active: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, redirect_type: null, active: 'archived' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('archives and restores a redirect with guards, permissions, and restart persistence', async () => {
    const databasePath = `/tmp/core3-website-redirect-manager-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_redirect_manager_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await migratedDatabase(databasePath, migrationName);
    const apiDefinition = yaml('api/redirects.yaml');
    const archive = apiDefinition.actions.find((action: any) => action.id === 'archive_website_redirect');
    const restore = apiDefinition.actions.find((action: any) => action.id === 'restore_website_redirect');

    await expect(first.repository.executeMutation(archive.mutation, { id: 'website-redirect-demo-001', expected_row_version: 1, values: { active: false } })).resolves.toMatchObject({ active: false, row_version: 2 });
    await expect(first.repository.executeMutation(archive.mutation, { id: 'website-redirect-demo-001', expected_row_version: 1, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_REDIRECT_ALREADY_ARCHIVED' });
    first.database.close();

    const second = await migratedDatabase(databasePath, migrationName);
    expect(await second.repository.query('SELECT active, row_version FROM website_page_redirects WHERE id = ?', ['website-redirect-demo-001'])).toEqual([{ active: false, row_version: 2 }]);
    await expect(second.repository.executeMutation(restore.mutation, { id: 'website-redirect-demo-001', expected_row_version: 2, values: { active: true } })).resolves.toMatchObject({ active: true, row_version: 3 });
    second.database.close();

    const third = await migratedDatabase(databasePath, migrationName);
    const readOnlyApi = createApi(third.repository, { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] });
    await expect(readOnlyApi(new Request('http://website.test/api/actions/website.redirects.archive', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-redirect-demo-001', expected_row_version: 3, values: { active: false } }),
    }), new URL('http://website.test/api/actions/website.redirects.archive'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: website.manage' });
    expect(await third.repository.query('SELECT active, row_version FROM website_page_redirects WHERE id = ?', ['website-redirect-demo-001'])).toEqual([{ active: true, row_version: 3 }]);
    third.database.close();
    rmSync(databasePath, { force: true });
  });
});
