import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const makeForm = (bytes: number[], name: string, mimeType: string, meta: Record<string, unknown>) => {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], name, { type: mimeType }));
  form.set('meta', JSON.stringify({ kind: 'ecommerce_product_tag_image', ...meta }));
  return form;
};

const createApi = (repository: YamlRepository, user: any, uploadRoot: string) => {
  const api = yaml('api/product-tag-detail.yaml');
  const upload = api.actions.find((action: any) => action.id === 'upload_ecommerce_product_tag_image');
  const download = api.actions.find((action: any) => action.id === 'download_ecommerce_product_tag_image');
  return createYamlApi({
    repository,
    authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
    sources: new Map(api.datasources.map((source: any) => [source.id, source])),
    pageSources: new Map(), pages: new Map([['ecommerce-product-tag-detail', { actions: [upload, download] }]]),
    catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
    permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
    uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
  });
};

describe('eCommerce Product Tag image parity', () => {
  test('traces Odoo image behavior through separate detail page/API and storage contracts', () => {
    const page = yaml('pages/product-tag-detail.yaml');
    const list = yaml('pages/product-tags.yaml');
    const api = yaml('api/product-tag-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-tag-detail', route: '/ecommerce/product-tags/detail' });
    expect(list.actions).toContainEqual(expect.objectContaining({ id: 'view_ecommerce_product_tag', type: 'navigate', navigate_to: '/ecommerce/product-tags/detail' }));
    expect(form).toMatchObject({ source: 'ecommerce_product_tag_detail', attachment_source: 'ecommerce_product_tag_images', attachment_upload_action: 'upload_ecommerce_product_tag_image', attachment_download_action: 'download_ecommerce_product_tag_image', attachment_accept: 'image/*' });
    expect(api.page).toEqual({ id: 'ecommerce-product-tag-detail' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['ecommerce_product_tag_detail', 'ecommerce_product_tag_images']);
    expect(api.actions.find((action: any) => action.id === 'upload_ecommerce_product_tag_image')).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'ecommerce.write', kind: 'ecommerce_product_tag_image' });
    expect(api.actions.find((action: any) => action.id === 'download_ecommerce_product_tag_image')).toMatchObject({ type: 'download', permission: 'ecommerce.read', kind: 'ecommerce_product_tag_image' });
    expect(yaml('storage.yaml').attachments.ecommerce_product_tag_image.download).toMatchObject({ route: '/api/ecommerce/product-tag-images', permission: 'ecommerce.read' });
  });

  test('enforces write permission, image validation, stale concurrency, and replacement without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `ecommerce_product_tag_image_guards_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const user: any = { sub: 'tag-manager', email: 'manager@core3.local', name: 'Tag Manager', permissions: ['ecommerce.read', 'ecommerce.write'] };
    const uploadRoot = `/tmp/core3-ecommerce-product-tag-image-${crypto.randomUUID()}`;
    const api = createApi(repository, user, uploadRoot);
    const upload = (meta: Record<string, unknown>, bytes = [137, 80, 78, 71], name = 'featured.png', mimeType = 'image/png') => api(new Request('http://ecommerce.test/api/upload', { method: 'POST', body: makeForm(bytes, name, mimeType, meta) }), new URL('http://ecommerce.test/api/upload'));
    const count = async () => (await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_tag_images', []))[0].count;

    user.permissions = ['ecommerce.read'];
    await expect(upload({ tag_id: 'ecommerce-tag-featured', expected_row_version: 1 })).rejects.toMatchObject({ status: 403 });
    expect(await count()).toBe(0);
    user.permissions = ['ecommerce.read', 'ecommerce.write'];
    const invalid = await upload({ tag_id: 'ecommerce-tag-featured', expected_row_version: 1 }, [], 'not-image.txt', 'text/plain');
    expect(invalid?.status).toBe(400);
    expect(await invalid?.json()).toMatchObject({ error: 'Attachment must be between 1 byte and 5 MB' });
    expect(await count()).toBe(0);
    const response = await upload({ tag_id: 'ecommerce-tag-featured', expected_row_version: 1 });
    expect(response?.status).toBe(200);
    const first = await response?.json() as any;
    expect(first).toMatchObject({ tag_id: 'ecommerce-tag-featured', file_name: 'featured.png', mime_type: 'image/png', size_bytes: 4 });
    expect(await repository.query('SELECT row_version FROM ecommerce_product_tags WHERE id = ?', ['ecommerce-tag-featured'])).toEqual([{ row_version: 2 }]);
    const stale = await upload({ tag_id: 'ecommerce-tag-featured', expected_row_version: 1 }, [1, 2, 3, 4], 'stale.png');
    expect(stale?.status).toBe(409);
    expect(await stale?.json()).toMatchObject({ code: 'STALE_RECORD' });
    expect(await count()).toBe(1);
    const replacement = await upload({ tag_id: 'ecommerce-tag-featured', expected_row_version: 2 }, [1, 2, 3, 4, 5], 'replacement.png');
    expect(replacement?.status).toBe(200);
    expect(await repository.query('SELECT file_name, size_bytes FROM ecommerce_product_tag_images WHERE tag_id = ?', ['ecommerce-tag-featured'])).toEqual([{ file_name: 'replacement.png', size_bytes: 5 }]);
    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('downloads the image and preserves tag metadata and bytes across a database restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-tag-image-restart-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-ecommerce-product-tag-image-restart-uploads-${crypto.randomUUID()}`;
    const migrationName = `ecommerce_product_tag_image_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user = { sub: 'tag-manager', email: 'manager@core3.local', name: 'Tag Manager', permissions: ['ecommerce.read', 'ecommerce.write'] };
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const firstApi = createApi(firstRepository, user, uploadRoot);
      const response = await firstApi(new Request('http://ecommerce.test/api/upload', { method: 'POST', body: makeForm([82, 73, 66, 66], 'restart.png', 'image/png', { tag_id: 'ecommerce-tag-featured', expected_row_version: 1 }) }), new URL('http://ecommerce.test/api/upload'));
      expect(response?.status).toBe(200);
      const uploaded = await response!.json() as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT tag_id, file_name, size_bytes FROM ecommerce_product_tag_images WHERE id = ?', [uploaded.id])).toEqual([{ tag_id: 'ecommerce-tag-featured', file_name: 'restart.png', size_bytes: 4 }]);
      const source = yaml('api/product-tag-detail.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_product_tag_images');
      expect((await secondRepository.querySource(source, { id: 'ecommerce-tag-featured' }, 0, 10)).data).toMatchObject([expect.objectContaining({ id: uploaded.id, file_name: 'restart.png', size_bytes: 4 })]);
      const download = await createApi(secondRepository, user, uploadRoot)(new Request(`http://ecommerce.test/api/ecommerce/product-tag-images/${uploaded.id}`), new URL(`http://ecommerce.test/api/ecommerce/product-tag-images/${uploaded.id}`));
      expect(download?.status).toBe(200);
      expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([82, 73, 66, 66]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
      rmSync(uploadRoot, { recursive: true, force: true });
    }
  });
});
