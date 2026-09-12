import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Product detail parity', () => {
  test('stores an uploaded product image and its metadata through the API', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_image_upload_test', ['schema', 'data']);
    const apiDocument = yaml('api/product-detail.yaml');
    const upload = apiDocument.actions.find((action: any) => action.id === 'upload_ecommerce_product_image');
    const authUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['ecommerce.read', 'ecommerce.write'] };
    const uploadRoot = `/tmp/core3-ecommerce-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return authUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map(), pageSources: new Map(), pages: new Map([['ecommerce-product-detail', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: {}, topics: {}, storage: {
        attachments: { ecommerce_product_image: { download: { route: '/api/ecommerce/product-images', permission: 'ecommerce.read', query: 'SELECT * FROM ecommerce_product_images WHERE id = :attachment_id' } } },
      },
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([137, 80, 78, 71])], 'mug.png', { type: 'image/png' }));
    form.set('meta', JSON.stringify({ kind: 'ecommerce_product_image', product_id: 'ecommerce-product-mug' }));
    const response = await api(new Request('http://core3.test/api/upload', { method: 'POST', body: form }), new URL('http://core3.test/api/upload'));
    expect(response?.status).toBe(200);
    const uploaded = await response?.json() as any;
    expect(uploaded).toMatchObject({ product_id: 'ecommerce-product-mug', file_name: 'mug.png', mime_type: 'image/png', size_bytes: 4 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_images WHERE product_id = ?', ['ecommerce-product-mug']))[0].count).toBe(1);
    const download = await api(new Request(`http://core3.test/api/ecommerce/product-images/${uploaded.id}`, { headers: { Authorization: 'Bearer test-token' } }), new URL(`http://core3.test/api/ecommerce/product-images/${uploaded.id}`));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([137, 80, 78, 71]);
    database.close();
  });

  test('publishes and unpublishes a product through the editor and public catalog', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_catalog_publication_test', ['schema', 'data']);
    const detail = yaml('api/product-detail.yaml');
    const edit = detail.actions.find((candidate: any) => candidate.id === 'edit_ecommerce_product');
    const shop = yaml('api/shop.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_shop_products');
    const product = (await repository.query('SELECT * FROM ecommerce_products WHERE id = ?', ['ecommerce-product-setup']))[0];
    const values = { name: product.name, internal_reference: product.internal_reference, product_type: product.product_type, category: product.category, sales_price: product.sales_price, website_sequence: product.website_sequence, is_published: true };

    const published = await repository.executeMutation(edit.mutation, { id: product.id, expected_row_version: 1, values });
    expect(published).toMatchObject({ id: product.id, is_published: true, row_version: 2 });
    expect((await repository.querySource(shop, { q: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).toContain(product.id);

    const unpublished = await repository.executeMutation(edit.mutation, { id: product.id, expected_row_version: 2, values: { ...values, is_published: false } });
    expect(unpublished).toMatchObject({ id: product.id, is_published: false, row_version: 3 });
    expect((await repository.querySource(shop, { q: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).not.toContain(product.id);
    await expect(repository.executeMutation(edit.mutation, { id: product.id, expected_row_version: 2, values: { ...values, is_published: true } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('preserves product image metadata and bytes across a database restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-image-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_image_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const uploadRoot = `/tmp/core3-ecommerce-image-restart-uploads-${crypto.randomUUID()}`;
    const authUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['ecommerce.read', 'ecommerce.write'] };
    const page = yaml('api/product-detail.yaml');
    const upload = page.actions.find((action: any) => action.id === 'upload_ecommerce_product_image');
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['ecommerce-product-detail', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {},
      storage: yaml('storage.yaml'),
    });
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const form = new FormData();
    form.set('file', new File([new Uint8Array([80, 78, 71, 1])], 'restart.png', { type: 'image/png' }));
    form.set('meta', JSON.stringify({ kind: 'ecommerce_product_image', product_id: 'ecommerce-product-mug' }));
    const uploadedResponse = await createApi(firstRepository)(new Request('http://ecommerce.test/api/upload', { method: 'POST', body: form }), new URL('http://ecommerce.test/api/upload'));
    expect(uploadedResponse?.status).toBe(200);
    const uploaded = await uploadedResponse!.json() as any;
    expect(uploaded).toMatchObject({ product_id: 'ecommerce-product-mug', file_name: 'restart.png', size_bytes: 4 });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT file_name, size_bytes FROM ecommerce_product_images WHERE id = ?', [uploaded.id]))[0]).toEqual({ file_name: 'restart.png', size_bytes: 4 });
    const downloaded = await createApi(secondRepository)(new Request(`http://ecommerce.test/api/ecommerce/product-images/${uploaded.id}`, { headers: { Authorization: 'Bearer test-token' } }), new URL(`http://ecommerce.test/api/ecommerce/product-images/${uploaded.id}`));
    expect(downloaded?.status).toBe(200);
    expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([80, 78, 71, 1]);
    second.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('joins the products list navigation to a page/API-bound detail form', () => {
    const list = yaml('pages/products.yaml');
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');
    expect(list.actions.find((action: any) => action.id === 'view_ecommerce_product')).toMatchObject({ navigate_to: '/ecommerce/products/detail' });
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_detail' });
    expect(page.components[0]).toMatchObject({ attachment_source: 'ecommerce_product_images', attachment_upload_action: 'upload_ecommerce_product_image' });
    expect(api.actions.find((action: any) => action.id === 'edit_ecommerce_product').permission).toBe('ecommerce.write');
    expect(api.actions.find((action: any) => action.id === 'upload_ecommerce_product_image')).toMatchObject({ type: 'upload', kind: 'ecommerce_product_image' });
  });

  test('reads a persisted product and guards stale and duplicate edits', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_detail_test', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const source = api.datasources[0];
    const product = await repository.querySource(source, { id: 'ecommerce-product-mug', fixture_state: null }, 0, 1);
    expect(product.data).toMatchObject({ name: 'Core3 Ceramic Mug', is_published: true, active: true });
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_product');
    const updated = await repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, values: { name: 'Core3 Ceramic Mug Pro', internal_reference: 'ECOM-MUG-001', product_type: 'Goods', category: 'All Products / Accessories', sales_price: 22, website_sequence: 10, is_published: true } });
    expect(updated).toMatchObject({ name: 'Core3 Ceramic Mug Pro', sales_price: 22 });
    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, values: { name: 'Stale Mug' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-product-chair', expected_row_version: 1, values: { name: 'Chair', internal_reference: 'ECOM-MUG-001' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_REFERENCE_EXISTS' });
    const upload = api.actions.find((action: any) => action.id === 'upload_ecommerce_product_image');
    const image = await repository.executeMutation(upload.mutation, { product_id: 'ecommerce-product-mug', attachment_id: 'ecommerce-image-test-001', fileName: 'mug.png', mimeType: 'image/png', sizeBytes: 128, storageKey: 'image-key', current_user_id: 'user-admin' });
    expect(image).toMatchObject({ product_id: 'ecommerce-product-mug', file_name: 'mug.png', mime_type: 'image/png', size_bytes: 128 });
    expect((await repository.querySource(api.datasources[1], { id: 'ecommerce-product-mug' }, 0, 50)).data).toHaveLength(1);
    database.close();
  });
});
