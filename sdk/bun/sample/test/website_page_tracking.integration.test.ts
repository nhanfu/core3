import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Website page tracking and SEO filters parity', () => {
  test('traces Odoo tracking fields and keeps page/API ownership separate', () => {
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml', 'utf8');
    const odooViewModel = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/ir_ui_view.py', 'utf8');
    const odooPage = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/website_page.py', 'utf8');
    const page = yaml('pages/pages.yaml');
    const api = yaml('api/pages.yaml');

    expect(odooViews).toContain('<field name="track" optional="hide"/>');
    expect(odooViews).toContain('<filter string="Tracked" name="tracked" domain="[(\'track\', \'=\', True)]"/>');
    expect(odooViews).toContain('<filter string="Not tracked" name="not_tracked" domain="[(\'track\', \'=\', False)]"/>');
    expect(odooViews).toContain('<filter string="Not SEO optimized" name="not_seo_optimized"');
    expect(odooViewModel).toContain('track = fields.Boolean');
    expect(odooPage).toContain("_name = 'website.page'");
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'website_pages').query).toContain('track');
    expect(page.components[0].filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'track', label: 'Tracking', options: expect.arrayContaining([expect.objectContaining({ id: 'tracked', label: 'Tracked' }), expect.objectContaining({ id: 'not_tracked', label: 'Not tracked' })]) }),
      expect.objectContaining({ field: 'is_seo_optimized', label: 'SEO', options: [expect.objectContaining({ id: 'not_optimized', label: 'Not SEO optimized' })] }),
    ]));
    expect(action(api, 'edit_website_page').mutation.fields).toContain('track');
    expect(action(api, 'edit_website_page').mutation.boolean_fields).toContain('track');
    expect(() => api).not.toThrow();
  });

  test('filters tracked and untracked pages, updates the flag, and enforces the editor permission', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_tracking_filters', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'website_page_tracking_filters', ['schema', 'data']);
    const apiDefinition = yaml('api/pages.yaml');
    const source = apiDefinition.datasources.find((candidate: any) => candidate.id === 'website_pages');
    const params = { q: null, state: null, track: null, is_seo_optimized: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => [row.name, row.track])).toEqual([
      ['Home', true], ['Docs Home', true], ['Contact us', false],
    ]);
    expect((await repository.querySource(source, { ...params, track: 'tracked' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Home', 'Docs Home']);
    expect((await repository.querySource(source, { ...params, track: 'not_tracked' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Contact us']);
    expect((await repository.querySource(source, { ...params, is_seo_optimized: 'not_optimized' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Docs Home', 'Contact us']);

    const edit = action(apiDefinition, 'edit_website_page');
    const editValues = { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact us', url: '/contactus', track: true };
    const updated = await repository.executeMutation(edit.mutation, {
      id: 'website-page-demo-002', expected_row_version: 1,
      values: editValues,
    }) as any;
    expect(updated).toMatchObject({ id: 'website-page-demo-002', track: true, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'website-page-demo-002', expected_row_version: 1, values: { ...editValues, track: false },
    })).rejects.toMatchObject({ status: 409 });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    const editorApi = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return { sub: 'website-reader', permissions: ['website.read'] }; },
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
      uploadRoot: '/tmp/core3-website-page-tracking-test-uploads', eventStore: {}, topics: {},
    });
    await expect(editorApi(new Request('http://website.test/api/actions/website.pages.update', {
      method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'website-page-demo-002', expected_row_version: 2, values: { ...editValues, track: false } }),
    }), new URL('http://website.test/api/actions/website.pages.update'))).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT track, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ track: true, row_version: 2 });
    database.close();
  });

  test('preserves page tracking across a file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-website-page-tracking-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_page_tracking_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const edit = action(yaml('api/pages.yaml'), 'edit_website_page');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(edit.mutation, { id: 'website-page-demo-002', expected_row_version: 1, values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Contact us', url: '/contactus', track: true } });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await secondRepository.query('SELECT track, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ track: true, row_version: 2 });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
