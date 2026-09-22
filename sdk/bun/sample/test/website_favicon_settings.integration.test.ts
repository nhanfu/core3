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

function createTestApi(repository: YamlRepository, user: any, uploadRoot: string) {
  const discovered = discoverPages(join(import.meta.dir, '..'));
  const settings = yaml('api/settings.yaml');
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return user; },
      hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); },
    },
    sources: new Map(settings.datasources.map((source: any) => [source.id, source])),
    pageSources: new Map([...discovered.pageDatasources].filter(([id]) => id === 'website-settings')),
    pages: new Map([['website-settings', { actions: settings.actions }]]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: discovered.permissions.get('website')?.config || {},
    uploadRoot,
    eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
}

const manager = { sub: 'website-manager', email: 'manager@workspace.example', name: 'Website Manager', roles: ['manager'], permissions: ['website.read', 'website.manage'] };

describe('Website settings favicon parity', () => {
  test('declares the Odoo binary field, page/API join, upload action, and download contract', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/res_config_settings_views.xml', 'utf8');
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const favicon = page.components[0].tabs[0].sections[1].fields.find((field: any) => field.label === 'Favicon');
    const upload = api.actions.find((action: any) => action.id === 'upload_website_favicon');

    expect(odoo).toContain('<field name="favicon" widget="image"');
    expect(page.page.id).toBe('website-settings');
    expect(api.page.id).toBe(page.page.id);
    expect(favicon).toMatchObject({ type: 'image', upload_action: 'upload_website_favicon', url_field: 'favicon_data_url' });
    expect(upload).toMatchObject({ type: 'upload', permission: 'website.manage', kind: 'website_favicon' });
    expect(yaml('storage.yaml').attachments.website_favicon.download).toMatchObject({ route: '/api/website/favicons', permission: 'website.read' });
  });

  test('uploads, validates, replaces, and downloads a durable favicon with stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_favicon_upload_test', ['schema', 'data']);
    const uploadRoot = `/tmp/core3-website-favicon-${crypto.randomUUID()}`;
    const api = createTestApi(repository, manager, uploadRoot);
    const upload = (bytes: number[], name: string, type: string, expected = 1) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], name, { type }));
      form.set('meta', JSON.stringify({ kind: 'website_favicon', id: 'website-demo-001', expected_row_version: expected }));
      return api(new Request('http://website.test/api/upload', { method: 'POST', body: form }), new URL('http://website.test/api/upload'));
    };

    const response = await upload([0, 1, 2, 3], 'favicon.png', 'image/png');
    expect(response.status).toBe(200);
    const result = await response.json() as any;
    expect(result).toMatchObject({ id: 'website-demo-001', row_version: 2, favicon_file_name: 'favicon.png', favicon_mime_type: 'image/png', favicon_size_bytes: 4 });
    expect(result.favicon_data_url).toBe('data:image/png;base64,AAECAw==');
    expect((await repository.query('SELECT favicon_file_name, favicon_content_base64, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ favicon_file_name: 'favicon.png', favicon_content_base64: 'AAECAw==', row_version: 2 });

    const download = await api(new Request('http://website.test/api/website/favicons/website-demo-001'), new URL('http://website.test/api/website/favicons/website-demo-001'));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download.arrayBuffer())]).toEqual([0, 1, 2, 3]);
    const invalid = await upload([1], 'favicon.txt', 'text/plain', 2);
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ code: 'WEBSITE_FAVICON_INVALID' });
    const stale = await upload([4], 'new.png', 'image/png', 1);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ code: 'WEBSITE_FAVICON_STALE' });

    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('preserves the uploaded favicon through migration replay and DuckDB restart', async () => {
    const databasePath = `/tmp/core3-website-favicon-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_favicon_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const uploadRoot = `/tmp/core3-website-favicon-restart-uploads-${crypto.randomUUID()}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = createTestApi(firstRepository, manager, uploadRoot);
    const form = new FormData();
    form.set('file', new File([new Uint8Array([137, 80, 78, 71])], 'restart.png', { type: 'image/png' }));
    form.set('meta', JSON.stringify({ kind: 'website_favicon', id: 'website-demo-002', expected_row_version: 1 }));
    expect((await api(new Request('http://website.test/api/upload', { method: 'POST', body: form }), new URL('http://website.test/api/upload'))).status).toBe(200);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT favicon_file_name, favicon_content_base64, row_version FROM website_websites WHERE id = ?', ['website-demo-002']))[0]).toEqual({ favicon_file_name: 'restart.png', favicon_content_base64: 'iVBORw==', row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('blocks favicon upload for a read-only Website actor without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_favicon_permission_test', ['schema', 'data']);
    const reader = { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] };
    const api = createTestApi(repository, reader, `/tmp/core3-website-favicon-permission-${crypto.randomUUID()}`);
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1])], 'blocked.png', { type: 'image/png' }));
    form.set('meta', JSON.stringify({ kind: 'website_favicon', id: 'website-demo-001', expected_row_version: 1 }));
    await expect(api(new Request('http://website.test/api/upload', { method: 'POST', body: form }), new URL('http://website.test/api/upload'))).rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT favicon_file_name, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))[0]).toEqual({ favicon_file_name: null, row_version: 1 });
    database.close();
  });
});
