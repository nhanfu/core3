import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (id: string) => {
  const api = yaml('api/themes.yaml');
  return api.datasources.find((item: any) => item.id === id);
};

async function migratedDatabase(path = ':memory:', migrationName = `website_themes_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
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
    uploadRoot: '/tmp/core3-website-theme-test-uploads', eventStore: {}, topics: {},
  });
}

describe('Website Theme Manager parity', () => {
  test('joins the YAML page/API contract and records the Odoo action identity', () => {
    const page = yaml('pages/themes.yaml');
    const api = yaml('api/themes.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(sampleRoot);
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'website-themes', route: '/website-themes', breadcrumb: ['Website', 'Site', 'Pick a Theme'] });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('website-themes')).toContain('website_themes');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/website-themes', page: 'website-themes', module: 'website' }),
    ]));
    expect(manifest.menu.groups[0].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/website-themes', label: 'Themes' }),
    ]));
    expect(odooViews).toContain('id="theme_install_kanban_action"');
    expect(odooViews).toContain('<field name="name">Pick a Theme</field>');
    expect(odooViews).toContain('name="button_choose_theme"');
    expect(odooViews).toContain('name="button_refresh_theme"');
    expect(odooViews).toContain('name="button_remove_theme"');
  });

  test('seeds durable themes, website-scoped installed state, search, category, and empty branches', async () => {
    const { database, repository } = await migratedDatabase();
    const themes = source('website_themes');

    const rows = await repository.querySource(themes, { website_id: 'website-demo-001', q: null, category_name: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['theme_core', 'theme_docs']);
    expect(rows.data[0]).toMatchObject({ website_name: 'Core3 Storefront', is_installed_on_current_website: true, theme_status: 'Installed', theme_revision: 1 });
    expect(rows.data[1]).toMatchObject({ is_installed_on_current_website: false, theme_status: 'Available' });
    expect((await repository.querySource(themes, { website_id: 'website-demo-001', q: 'documentation', category_name: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['theme_docs']);
    expect((await repository.querySource(themes, { website_id: 'website-demo-001', q: null, category_name: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(themes, { website_id: 'website-demo-002', q: null, category_name: 'Documentation' }, 0, 50)).data[0]).toMatchObject({ website_name: 'Core3 Docs', is_installed_on_current_website: true });
    database.close();
  });

  test('chooses a theme with manage permission and rejects stale or duplicate selection', async () => {
    const { database, repository } = await migratedDatabase();
    const apiDefinition = yaml('api/themes.yaml');
    const choose = apiDefinition.actions.find((action: any) => action.id === 'choose_website_theme');

    expect(await repository.executeMutation(choose.mutation, { id: 'website-demo-001', theme_id: 'theme_docs', expected_row_version: 1 })).toMatchObject({ theme_id: 'theme_docs' });
    expect(await repository.query('SELECT theme_id, row_version FROM website_websites WHERE id = ?', ['website-demo-001'])).toEqual([{ theme_id: 'theme_docs', row_version: 2 }]);
    await expect(repository.executeMutation(choose.mutation, { id: 'website-demo-001', theme_id: 'theme_core', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_THEME_STALE_WEBSITE' });
    await expect(repository.executeMutation(choose.mutation, { id: 'website-demo-001', theme_id: 'theme_docs', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_THEME_ALREADY_SELECTED' });
    database.close();
  });

  test('enforces the direct action permission boundary without writing a row', async () => {
    const { database, repository } = await migratedDatabase();
    const readOnlyApi = createApi(repository, { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] });
    const request = readOnlyApi(
      new Request('http://website.test/api/actions/website.themes.choose', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'website-demo-001', theme_id: 'theme_docs', expected_row_version: 1 }),
      }),
      new URL('http://website.test/api/actions/website.themes.choose'),
    );
    await expect(request).rejects.toMatchObject({ status: 403, message: 'Requires permission: website.manage' });
    expect(await repository.query('SELECT theme_id, row_version FROM website_websites WHERE id = ?', ['website-demo-001'])).toEqual([{ theme_id: 'theme_core', row_version: 1 }]);
    database.close();
  });

  test('refreshes, removes, and restores theme state across a file-backed restart', async () => {
    const databasePath = `/tmp/core3-website-themes-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_theme_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const apiDefinition = yaml('api/themes.yaml');
    const refresh = apiDefinition.actions.find((action: any) => action.id === 'refresh_website_theme');
    const remove = apiDefinition.actions.find((action: any) => action.id === 'remove_website_theme');
    const choose = apiDefinition.actions.find((action: any) => action.id === 'choose_website_theme');

    const first = await migratedDatabase(databasePath, migrationName);
    await first.repository.executeMutation(refresh.mutation, { id: 'website-demo-001', current_theme_id: 'theme_core', expected_row_version: 1 });
    first.database.close();

    const second = await migratedDatabase(databasePath, migrationName);
    expect(await second.repository.query('SELECT theme_id, theme_revision, row_version FROM website_websites WHERE id = ?', ['website-demo-001'])).toEqual([{ theme_id: 'theme_core', theme_revision: 2, row_version: 2 }]);
    await second.repository.executeMutation(remove.mutation, { id: 'website-demo-001', current_theme_id: 'theme_core', expected_row_version: 2, values: { theme_id: null } });
    expect(await second.repository.query('SELECT theme_id, theme_revision, row_version FROM website_websites WHERE id = ?', ['website-demo-001'])).toEqual([{ theme_id: null, theme_revision: 2, row_version: 3 }]);
    second.database.close();

    const third = await migratedDatabase(databasePath, migrationName);
    await third.repository.executeMutation(choose.mutation, { id: 'website-demo-001', theme_id: 'theme_docs', expected_row_version: 3 });
    expect(await third.repository.query('SELECT theme_id, theme_revision, row_version FROM website_websites WHERE id = ?', ['website-demo-001'])).toEqual([{ theme_id: 'theme_docs', theme_revision: 2, row_version: 4 }]);
    await expect(third.repository.executeMutation(remove.mutation, { id: 'website-demo-001', current_theme_id: 'theme_core', expected_row_version: 4, values: { theme_id: null } })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_THEME_NOT_SELECTED' });
    third.database.close();
    rmSync(databasePath, { force: true });
  });

  test('keeps Odoo theme card labels, grouped search, and permissioned actions explicit', () => {
    const page = yaml('pages/themes.yaml');
    const api = yaml('api/themes.yaml');
    const component = page.components[0];
    const actionIds = component.columns.find((column: any) => column.field === 'id').actions.map((action: any) => action.id);

    expect(component.views.map((view: any) => view.label)).toEqual(['Kanban', 'List']);
    expect(component.search.label).toBe('Theme');
    expect(component.filters[0]).toMatchObject({ field: 'category_name', label: 'Category' });
    expect(component.group_by.map((group: any) => group.label)).toEqual(['Author', 'Category']);
    expect(component.columns.map((column: any) => column.label)).toEqual(['Theme', 'Summary', 'Category', 'Author', 'Status', '']);
    expect(actionIds).toEqual(['open_website_theme_preview', 'choose_website_theme', 'refresh_website_theme', 'remove_website_theme']);
    expect(api.actions.filter((action: any) => action.id.endsWith('_website_theme')).map((action: any) => action.permission)).toEqual(['website.manage', 'website.manage', 'website.manage']);
  });
});
