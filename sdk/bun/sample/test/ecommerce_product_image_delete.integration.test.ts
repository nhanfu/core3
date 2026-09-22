import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce Website Sale product image removal parity', () => {
  test('traces the Odoo media removal action through the separate Product Detail page/API pair', () => {
    const imageModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_image.py', 'utf8');
    const productView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const builderPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/product_image_option_plugin.js', 'utf8');
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');
    const form = page.components.find((component: any) => component.source === 'ecommerce_product_detail');

    expect(imageModel).toContain("_name = 'product.image'");
    expect(imageModel).toContain('ondelete=\'cascade\'');
    expect(productView).toContain('name="product_template_image_ids"');
    expect(productView).toContain('add-label="Add Media"');
    expect(builderPlugin).toContain('unlink("product.image"');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(form).toMatchObject({ attachment_source: 'ecommerce_product_images', attachment_upload_action: 'upload_ecommerce_product_image' });
    expect(form.attachment_actions).toContainEqual(expect.objectContaining({ id: 'delete_ecommerce_product_image', label: 'Remove' }));
    expect(action(api, 'delete_ecommerce_product_image')).toMatchObject({
      permission: 'ecommerce.write', action: 'ecommerce.products.images.delete', operation: 'delete',
    });
  });

  test('removes an owned active product image and rejects stale, missing, inactive, and foreign-company rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_image_delete_guards', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_image_delete_guards', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const images = api.datasources.find((source: any) => source.id === 'ecommerce_product_images');
    const remove = action(api, 'delete_ecommerce_product_image');
    const uploaded = await repository.executeMutation(action(api, 'upload_ecommerce_product_image').mutation, {
      product_id: 'ecommerce-product-mug', attachment_id: 'ecommerce-product-image-delete-001', fileName: 'delete-me.png',
      mimeType: 'image/png', sizeBytes: 128, storageKey: 'ecommerce/products/delete-me.png', current_user_id: 'user-admin',
    }) as any;
    expect(uploaded).toMatchObject({ id: 'ecommerce-product-image-delete-001', product_id: 'ecommerce-product-mug' });
    expect((await repository.querySource(images, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data)
      .toContainEqual(expect.objectContaining({ id: uploaded.id, row_version: 1 }));
    const input = { current_company_name: 'My Company', values: { id: uploaded.id, expected_row_version: 1 } };
    await expect(repository.executeMutation(remove.mutation, { ...input, values: { ...input.values, expected_row_version: 2 } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_IMAGE_STALE' });
    await expect(repository.executeMutation(remove.mutation, { ...input, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_IMAGE_STALE' });
    expect(await repository.executeMutation(remove.mutation, input)).toEqual({ deleted: true, id: uploaded.id });
    await expect(repository.executeMutation(remove.mutation, input))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_IMAGE_STALE' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_images WHERE id = ?', [uploaded.id]))[0].count).toBe(0);

    const inactive = await repository.executeMutation(action(api, 'upload_ecommerce_product_image').mutation, {
      product_id: 'ecommerce-product-chair', attachment_id: 'ecommerce-product-image-delete-002', fileName: 'inactive.png',
      mimeType: 'image/png', sizeBytes: 128, storageKey: 'ecommerce/products/inactive.png', current_user_id: 'user-admin',
    }) as any;
    await repository.query("UPDATE ecommerce_products SET active = FALSE WHERE id = 'ecommerce-product-chair'");
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: inactive.id, expected_row_version: 1 } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_IMAGE_STALE' });
    database.close();
  });

  test('preserves row-versioned product image removal state across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-image-delete-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_image_delete_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const upload = action(yaml('api/product-detail.yaml'), 'upload_ecommerce_product_image');
      await repository.executeMutation(upload.mutation, {
        product_id: 'ecommerce-product-mug', attachment_id: 'ecommerce-product-image-delete-restart', fileName: 'restart-delete.png',
        mimeType: 'image/png', sizeBytes: 64, storageKey: 'ecommerce/products/restart-delete.png', current_user_id: 'user-admin',
      });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const remove = action(yaml('api/product-detail.yaml'), 'delete_ecommerce_product_image');
      expect(await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: 'ecommerce-product-image-delete-restart', expected_row_version: 1 } }))
        .toEqual({ deleted: true, id: 'ecommerce-product-image-delete-restart' });
      expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_images WHERE id = ?', ['ecommerce-product-image-delete-restart']))[0].count).toBe(0);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
