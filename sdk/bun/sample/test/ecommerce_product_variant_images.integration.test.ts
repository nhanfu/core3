import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const migrations = join(root, 'migrations');
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product variant extra media parity', () => {
  test('traces Odoo variant media and keeps the variant page/API split', () => {
    const imageModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_image.py', 'utf8');
    const variantModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_product.py', 'utf8');
    const variantView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/variant.py', 'utf8');
    const page = yaml('pages/product-variant-detail.yaml');
    const api = yaml('api/product-variant-detail.yaml');
    const productPage = yaml('pages/product-detail.yaml');
    const productApi = yaml('api/product-detail.yaml');

    expect(imageModel).toContain("_name = 'product.image'");
    expect(imageModel).toContain("product_variant_id = fields.Many2one");
    expect(variantModel).toContain('product_variant_image_ids = fields.One2many');
    expect(variantModel).toContain('Extra Variant Images');
    expect(variantModel).toContain('variant_images = list(self.product_variant_image_ids)');
    expect(variantView).toContain('string="Extra Variant Media"');
    expect(variantView).toContain('name="product_variant_image_ids"');
    expect(controller).toContain("'carousel'");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-variant-detail', route: '/ecommerce/products/variants/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-variant-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_variant_detail', attachment_source: 'ecommerce_product_variant_images', attachment_upload_action: 'upload_ecommerce_product_variant_image' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_variant_images')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'upload_ecommerce_product_variant_image')).toMatchObject({ type: 'upload', permission: 'ecommerce.write', action: 'ecommerce.product_variants.images.upload' });
    expect(action(api, 'remove_ecommerce_product_variant_image')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.product_variants.images.remove' });
    expect(action(productApi, 'view_ecommerce_product_variant_detail')).toMatchObject({ permission: 'ecommerce.read', navigate_to: '/ecommerce/products/variants/detail' });
    expect(productPage.components.find((component: any) => component.source === 'ecommerce_product_variants').columns.find((column: any) => column.field === 'actions').actions)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'view_ecommerce_product_variant_detail' })]));
  });

  test('seeds variant media, enforces company/file/concurrency guards, and supports CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_variant_images_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_variant_images_test', ['schema', 'data']);
    const api = yaml('api/product-variant-detail.yaml');
    const images = api.datasources.find((source: any) => source.id === 'ecommerce_product_variant_images');
    expect((await repository.querySource(images, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company' }, 0, 20)).data)
      .toMatchObject([{ id: 'ecommerce-variant-image-mug-blue', file_name: 'mug-blue-variant.png', sequence: 10 }]);
    expect((await repository.querySource(images, { id: 'ecommerce-variant-mug-blue', company_name: 'Other Company' }, 0, 20)).data).toEqual([]);

    const upload = action(api, 'upload_ecommerce_product_variant_image');
    const valid = { attachment_id: 'ecommerce-variant-image-mug-blue-new', variant_id: 'ecommerce-variant-mug-blue', expected_row_version: 1, fileName: 'blue-side.png', mimeType: 'image/png', sizeBytes: 256, storageKey: 'ecommerce/variant-images/blue-side.png', current_company_name: 'My Company', current_user_id: 'user-admin' };
    await expect(repository.executeMutation(upload.mutation, { ...valid, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_VARIANT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, variant_id: 'ecommerce-variant-does-not-exist' })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_PRODUCT_VARIANT_NOT_FOUND' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, fileName: '', sizeBytes: 0 })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_IMAGE_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, fileName: 'oversized.png', sizeBytes: 5242881 })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_IMAGE_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, mimeType: 'text/plain' })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_IMAGE_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...valid, fileName: 'mug-blue-variant.png' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_IMAGE_DUPLICATE' });
    expect(await repository.executeMutation(upload.mutation, valid)).toMatchObject({ id: valid.attachment_id, variant_id: valid.variant_id, file_name: valid.fileName, mime_type: valid.mimeType });
    await expect(repository.executeMutation(upload.mutation, { ...valid, attachment_id: 'ecommerce-variant-image-mug-blue-stale', fileName: 'stale.png' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_STALE' });
    expect((await repository.query('SELECT row_version FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-mug-blue']))[0].row_version).toBe(2);

    const remove = action(api, 'remove_ecommerce_product_variant_image');
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: valid.attachment_id, expected_row_version: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_IMAGE_STALE' });
    expect(await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: valid.attachment_id, expected_row_version: 1 } })).toEqual({ deleted: true, id: valid.attachment_id });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_variant_images WHERE id = ?', [valid.attachment_id]))[0].count).toBe(0);
    database.close();
  });

  test('preserves variant media across DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-variant-images-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_variant_images_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const upload = action(yaml('api/product-variant-detail.yaml'), 'upload_ecommerce_product_variant_image');
      const created = await repository.executeMutation(upload.mutation, { attachment_id: 'ecommerce-variant-image-chair-black', variant_id: 'ecommerce-variant-chair-black', expected_row_version: 1, fileName: 'chair-black.png', mimeType: 'image/png', sizeBytes: 512, storageKey: 'ecommerce/variant-images/chair-black.png', current_company_name: 'My Company', current_user_id: 'user-admin' }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT variant_id, product_id, file_name, size_bytes, row_version FROM ecommerce_product_variant_images WHERE id = ?', [created.id]))
        .toEqual([{ variant_id: 'ecommerce-variant-chair-black', product_id: 'ecommerce-product-chair', file_name: 'chair-black.png', size_bytes: 512, row_version: 1 }]);
      expect((await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_product_variant_images'))[0].count).toBe(2);
      expect((await restarted.query('SELECT row_version FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-chair-black']))[0].row_version).toBe(2);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
