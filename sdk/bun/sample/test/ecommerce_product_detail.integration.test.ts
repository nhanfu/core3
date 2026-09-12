import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Product detail parity', () => {
  test('joins the products list navigation to a page/API-bound detail form', () => {
    const list = yaml('pages/products.yaml');
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');
    expect(list.actions.find((action: any) => action.id === 'view_ecommerce_product')).toMatchObject({ navigate_to: '/ecommerce/products/detail' });
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_detail' });
    expect(api.actions.find((action: any) => action.id === 'edit_ecommerce_product').permission).toBe('ecommerce.write');
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
    database.close();
  });
});
