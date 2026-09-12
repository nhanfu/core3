import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website page assets parity', () => {
  test('uploads and downloads a private page asset through the YAML contract', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_asset_upload_test', ['schema', 'data']);
    const apiDocument = yaml('api/pages.yaml');
    const upload = apiDocument.actions.find((action: any) => action.id === 'upload_website_page_asset');
    const authUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['website.read', 'website.write'] };
    const uploadRoot = `/tmp/core3-website-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['website-pages', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['website.read', 'website.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([83, 86, 71, 1])], 'hero.svg', { type: 'image/svg+xml' }));
    form.set('meta', JSON.stringify({ kind: 'website_page_asset', page_id: 'website-page-demo-001' }));
    const response = await api(new Request('http://website.test/api/upload', { method: 'POST', body: form }), new URL('http://website.test/api/upload'));
    expect(response?.status).toBe(200);
    const uploaded = await response?.json() as any;
    expect(uploaded).toMatchObject({ page_id: 'website-page-demo-001', file_name: 'hero.svg', mime_type: 'image/svg+xml', size_bytes: 4, is_public: false });
    expect((await repository.query('SELECT file_name, is_public FROM website_page_assets WHERE id = ?', [uploaded.id]))[0]).toEqual({ file_name: 'hero.svg', is_public: false });
    const download = await api(new Request(`http://website.test/api/website/page-assets/${uploaded.id}`, { headers: { Authorization: 'Bearer test-token' } }), new URL(`http://website.test/api/website/page-assets/${uploaded.id}`));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([83, 86, 71, 1]);
    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });
});
