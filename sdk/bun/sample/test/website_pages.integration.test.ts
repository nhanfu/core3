import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

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

  test('keeps Odoo view labels and permission boundaries explicit', () => {
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');
    expect(page.components[0].view_navigation).toBe('tabs');
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Page Title', 'Page URL', 'Indexed', 'Is In Main Menu', 'Is SEO Optimized', 'Is Published']);
    expect(api.actions.find((action: any) => action.id === 'create_website_page')).toMatchObject({ permission: 'website.write' });
    expect(api.actions.find((action: any) => action.id === 'unpublish_website_page')).toMatchObject({ permission: 'website.manage' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['website.read', 'website.write', 'website.manage']));
  });
});
