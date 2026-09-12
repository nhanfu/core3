import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Website Homepage parity', () => {
  test('joins the Homepage presentation and client-action API by page.id', () => {
    const page = yaml('pages/homepage.yaml');
    const api = yaml('api/homepage.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'website-homepage', route: '/website-homepage', breadcrumb: ['Website', 'Site', 'Homepage'] });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('website-homepage')).toContain('website_homepage');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/website-homepage', page: 'website-homepage', module: 'website' }),
    ]));
  });

  test('uses the deterministic published homepage and declares empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_homepage_test_migrations', ['schema', 'data']);
    const source = yaml('api/homepage.yaml').datasources[0];
    const result = await repository.querySource(source, {}, 0, 1);
    expect(result.data).toMatchObject({ website_name: 'Core3 Storefront', page_name: 'Home', state: 'Published', is_in_menu: true });
    expect(source.meta.empty_state).toMatchObject({ title: 'Homepage unavailable' });
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'WEBSITE_HOMEPAGE_UNAVAILABLE' });
    database.close();
  });

  test('matches the Odoo client action permission and Site ordering', () => {
    const manifest = yaml('manifest.yaml');
    const api = yaml('api/homepage.yaml');
    expect(manifest.menu.groups[0]).toMatchObject({ id: 'site', label: 'Site' });
    expect(manifest.menu.groups[0].items[0]).toMatchObject({ path: '/website-homepage', label: 'Homepage', permission: 'website.read' });
    expect(api.actions).toContainEqual(expect.objectContaining({ id: 'open_website_homepage', type: 'client', permission: 'website.read' }));
  });
});
