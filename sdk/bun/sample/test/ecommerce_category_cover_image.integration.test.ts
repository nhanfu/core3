import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce category cover image parity', () => {
  test('traces Odoo category cover-image behavior and keeps list/detail page/API contracts separate', () => {
    const categoryModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_public_category.py', 'utf8');
    const categoryView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_public_category_views.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const page = yaml('pages/category-detail.yaml');
    const api = yaml('api/category-detail.yaml');
    const list = yaml('pages/categories.yaml');
    const listApi = yaml('api/categories.yaml');

    expect(categoryModel).toContain("_name = 'product.public.category'");
    expect(categoryModel).toContain('cover_image = fields.Image');
    expect(categoryView).toContain('name="cover_image"');
    expect(categoryView).toContain('product_public_category_action');
    expect(controller).toContain("def set_category_image(self, category_id, attachment_id)");
    expect(controller).toContain('category.cover_image = image_data');
    expect(page.page).toMatchObject({ id: 'ecommerce-category-detail', route: '/ecommerce/categories/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-category-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_category_detail', attachment_source: 'ecommerce_category_cover_image', attachment_upload_action: 'upload_ecommerce_category_cover_image', attachment_accept: 'image/*' });
    expect(list.components[0].actions).toContainEqual(expect.objectContaining({ id: 'view_ecommerce_category' }));
    expect(listApi.actions).toContainEqual(expect.objectContaining({ id: 'view_ecommerce_category', permission: 'ecommerce.read', navigate_to: '/ecommerce/categories/detail' }));
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_category_cover_image')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'upload_ecommerce_category_cover_image')).toMatchObject({ type: 'upload', permission: 'ecommerce.write', kind: 'ecommerce_category_cover_image' });
    expect(action(api, 'download_ecommerce_category_cover_image')).toMatchObject({ type: 'download', permission: 'ecommerce.read', kind: 'ecommerce_category_cover_image' });
    expect(action(api, 'remove_ecommerce_category_cover_image').permission).toBe('ecommerce.write');
    expect(yaml('storage.yaml').attachments.ecommerce_category_cover_image.download).toMatchObject({ route: '/api/ecommerce/category-cover-images', permission: 'ecommerce.read' });
  });

  test('seeds cover metadata, enforces image/company/stale guards, and supports replacement/removal', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_category_cover_image_guards', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_category_cover_image_guards', ['schema', 'data']);
    const listApi = yaml('api/categories.yaml');
    const detailApi = yaml('api/category-detail.yaml');
    const categories = listApi.datasources.find((source: any) => source.id === 'ecommerce_categories');
    expect((await repository.querySource(categories, { q: null, active: true, fixture_state: null, company_name: 'My Company' }, 0, 20)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce-category-accessories', cover_image_file_name: 'accessories-cover.png' })]));

    const upload = action(detailApi, 'upload_ecommerce_category_cover_image');
    const valid = { id: 'ecommerce-category-office', expected_row_version: 1, current_company_name: 'My Company', fileName: 'office-cover.png', mimeType: 'image/png', sizeBytes: 128, storageKey: 'office-cover.png', current_user_id: 'category-manager' };
    await expect(repository.executeMutation(upload.mutation, { ...valid, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_CATEGORY_NOT_FOUND' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, fileName: 'invalid.txt', mimeType: 'text/plain' }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CATEGORY_COVER_IMAGE_INVALID' });
    expect(await repository.executeMutation(upload.mutation, valid)).toMatchObject({ id: valid.id, category_id: valid.id, file_name: valid.fileName, mime_type: valid.mimeType, size_bytes: valid.sizeBytes });
    expect((await repository.query('SELECT row_version, cover_image_file_name FROM ecommerce_categories WHERE id = ?', [valid.id]))[0]).toEqual({ row_version: 2, cover_image_file_name: 'office-cover.png' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, fileName: 'stale.png' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CATEGORY_COVER_IMAGE_STALE' });

    const remove = action(detailApi, 'remove_ecommerce_category_cover_image');
    await expect(repository.executeMutation(remove.mutation, { id: valid.id, expected_row_version: 2, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CATEGORY_COVER_IMAGE_STALE' });
    expect(await repository.executeMutation(remove.mutation, { id: valid.id, expected_row_version: 2, current_company_name: 'My Company' })).toEqual({ removed: true, id: valid.id });
    expect((await repository.query('SELECT cover_image_file_name, cover_image_storage_key FROM ecommerce_categories WHERE id = ?', [valid.id]))[0]).toEqual({ cover_image_file_name: null, cover_image_storage_key: null });
    database.close();
  });

  test('uploads, downloads, and preserves category cover bytes across restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-category-cover-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-ecommerce-category-cover-uploads-${crypto.randomUUID()}`;
    const migrationName = `ecommerce_category_cover_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user: any = { sub: 'category-manager', email: 'category@core3.local', name: 'Category Manager', permissions: ['ecommerce.read', 'ecommerce.write'] };
    const detailApi = yaml('api/category-detail.yaml');
    const upload = action(detailApi, 'upload_ecommerce_category_cover_image');
    const download = action(detailApi, 'download_ecommerce_category_cover_image');
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(detailApi.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map(), pages: new Map([['ecommerce-category-detail', { actions: [upload, download] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const form = new FormData();
      form.set('file', new File([new Uint8Array([67, 65, 84, 49])], 'restart-cover.png', { type: 'image/png' }));
      form.set('meta', JSON.stringify({ kind: 'ecommerce_category_cover_image', id: 'ecommerce-category-office', expected_row_version: 1 }));
      const uploadedResponse = await createApi(firstRepository)(new Request('http://ecommerce.test/api/upload', { method: 'POST', body: form }), new URL('http://ecommerce.test/api/upload'));
      expect(uploadedResponse?.status).toBe(200);
      expect(await uploadedResponse!.json()).toMatchObject({ id: 'ecommerce-category-office', category_id: 'ecommerce-category-office', file_name: 'restart-cover.png', size_bytes: 4 });
      first.close();
      first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT cover_image_file_name, cover_image_mime_type, cover_image_size_bytes FROM ecommerce_categories WHERE id = ?', ['ecommerce-category-office']))
        .toEqual([{ cover_image_file_name: 'restart-cover.png', cover_image_mime_type: 'image/png', cover_image_size_bytes: 4 }]);
      const downloaded = await createApi(secondRepository)(new Request('http://ecommerce.test/api/ecommerce/category-cover-images/ecommerce-category-office'), new URL('http://ecommerce.test/api/ecommerce/category-cover-images/ecommerce-category-office'));
      expect(downloaded?.status).toBe(200);
      expect(downloaded?.headers.get('content-type')).toBe('image/png');
      expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([67, 65, 84, 49]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
      rmSync(uploadRoot, { recursive: true, force: true });
    }
  });
});
