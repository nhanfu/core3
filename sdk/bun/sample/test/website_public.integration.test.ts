import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import WebsiteModule from '../services/website/module';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website public visibility', () => {
  test('serves published pages by path/id and never exposes drafts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_public_visibility_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const service = {
      async call(operation: string, request: any = {}) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      },
    };
    const module = new WebsiteModule();
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://website.test${path}`, init), new URL(`http://website.test${path}`), service);

    const list = await route('/api/public/website/pages');
    expect(list?.status).toBe(200);
    if (!list) throw new Error('Published page list response was not returned');
    expect((await list.json()).pages.map((page: any) => page.id)).toEqual(['website-page-demo-001', 'website-page-demo-003']);
    expect((await (await route('/api/public/website/pages?website_id=website-demo-002'))?.json())).toMatchObject({ pages: [expect.objectContaining({ id: 'website-page-demo-003', website_id: 'website-demo-002' })] });
    const home = await route('/api/public/website/page?path=/');
    if (!home) throw new Error('Published homepage response was not returned');
    expect((await home.json()).page).toMatchObject({ id: 'website-page-demo-001', url: '/', content_html: '<p>Welcome to the Core3 Storefront.</p>', asset_id: 'website-asset-demo-001', asset_url: '/api/public/website/assets/website-asset-demo-001' });
    const asset = await route('/api/public/website/assets/website-asset-demo-001');
    expect(asset?.status).toBe(200);
    expect(asset?.headers.get('content-type')).toBe('image/svg+xml');
    expect(await asset?.text()).toContain('<svg');
    expect((await route('/api/public/website/assets/website-asset-demo-001', { method: 'POST' }))?.status).toBe(405);
    expect((await route('/api/public/website/assets/website-asset-missing'))?.status).toBe(404);
    expect((await (await route('/api/public/website/page?path=%2F&website_id=website-demo-002'))?.json())).toMatchObject({ page: expect.objectContaining({ id: 'website-page-demo-003', website_name: 'Core3 Docs' }) });
    expect((await route('/api/public/website/pages/website-page-demo-001?website_id=website-demo-002'))?.status).toBe(404);
    expect((await route('/api/public/website/page?path=/contactus'))?.status).toBe(404);
    expect((await route('/api/public/website/pages/website-page-demo-002'))?.status).toBe(404);
    expect((await route('/api/public/website/pages/website-page-demo-001', { method: 'POST' }))?.status).toBe(405);
    database.close();
  });

  test('declares the public browser route and Fluent HTML renderer', () => {
    const appSource = readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8');
    const componentSource = readFileSync(join(import.meta.dir, '../public/components/PublicWebsitePage.ts'), 'utf8');
    expect(appSource).toMatch(/website\\\/page/);
    expect(appSource).toContain("./components/PublicWebsitePage.ts");
    expect(componentSource).toContain("@core3/client/html");
    expect(componentSource).toContain("/api/public/website/page?path=");
    expect(componentSource).toContain("html.take(outlet).add('main')");
    expect(componentSource).toContain('sanitizePublicHtml');
    expect(componentSource).toContain("'SCRIPT', 'STYLE', 'IFRAME'");
  });
});
