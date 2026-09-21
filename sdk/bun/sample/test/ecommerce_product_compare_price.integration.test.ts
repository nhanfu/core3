import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (document: any, id: string) => document.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product compare-at price parity', () => {
  test('traces Odoo compare pricing and keeps page/API contracts separate', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const configurator = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/product_configurator.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    expect(model).toContain('compare_list_price = fields.Monetary');
    expect(configurator).toContain('Second, try to use `compare_list_price` as the strikethrough price.');
    expect(configurator).toContain('Only show `compare_list_price` if it\'s greater than the actual price.');
    expect(view).toContain('name="compare_list_price"');
    expect(view).toContain('website_sale.group_product_price_comparison');

    const api = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const productsPage = yaml('pages/products.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    expect(productsPage.datasources).toBeUndefined();
    expect(shopPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(variantPage.datasources).toBeUndefined();
    expect(api.page.id).toBe(productsPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(variantApi.page.id).toBe(variantPage.page.id);
    expect(action(detailApi, 'edit_ecommerce_product').permission).toBe('ecommerce.write');
    expect(action(variantApi, 'update_ecommerce_product_variant_compare_price')).toMatchObject({ permission: 'ecommerce.write' });
    expect(productsPage.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'compare_at_price' })]));
    expect(shopPage.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'compare_at_price' })]));
    expect(detailPage.components[0].groups[1].fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'compare_at_price' })]));
    expect(variantPage.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'update_ecommerce_product_variant_compare_price' })]));
  });

  test('supports durable product and variant CRUD with visibility, company, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_compare_price_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_compare_price_test', ['schema', 'data']);

    const comparePricePolicyApi = yaml('api/product-compare-price-policy.yaml');
    await repository.executeMutation(action(comparePricePolicyApi, 'edit_ecommerce_product_compare_price_policy').mutation, {
      current_company_name: 'My Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: true },
    });
    const productApi = yaml('api/product-detail.yaml');
    const productSource = productApi.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_detail');
    const shopSource = yaml('api/shop.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_shop_products');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const productsApi = yaml('api/products.yaml');
    const product = (await repository.querySource(productSource, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data;
    expect(product).toMatchObject({ compare_list_price: 24, compare_at_price: 24, sales_price: 18 });
    expect((await repository.querySource(shopSource, { q: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ compare_at_price: 24 });
    expect((await repository.querySource(productSource, { id: 'ecommerce-product-setup', fixture_state: null, company_name: 'My Company' }, 0, 1)).data).toMatchObject({ compare_list_price: 0, compare_at_price: null });

    const createProduct = action(productsApi, 'create_ecommerce_product');
    const createdProduct = await repository.executeMutation(createProduct.mutation, {
      current_company_name: 'My Company', values: { name: 'Compare Price Test Product', internal_reference: 'ECOM-COMPARE-001', sales_price: 12, compare_list_price: 18, company_name: 'My Company' },
    });
    expect(createdProduct).toMatchObject({ name: 'Compare Price Test Product', compare_list_price: 18 });
    await expect(repository.executeMutation(createProduct.mutation, {
      current_company_name: 'My Company', values: { name: 'Invalid Compare Price', internal_reference: 'ECOM-COMPARE-002', sales_price: 12, compare_list_price: -1, company_name: 'My Company' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_COMPARE_PRICE_INVALID' });

    const editProduct = action(productApi, 'edit_ecommerce_product');
    const updatedProduct = await repository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company',
      values: { name: 'Core3 Ceramic Mug', internal_reference: 'CS-MUG-001', product_type: 'Goods', category: 'All / Accessories', sales_price: 17, compare_list_price: 23, website_sequence: 10, is_published: true },
    });
    expect(updatedProduct).toMatchObject({ compare_list_price: 23, row_version: 2 });
    await expect(repository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company', values: { compare_list_price: -1 },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_COMPARE_PRICE_INVALID' });
    await expect(repository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'Other Company', values: { name: 'Core3 Ceramic Mug', compare_list_price: 31 },
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company', values: { name: 'Core3 Ceramic Mug', compare_list_price: 31 },
    })).rejects.toMatchObject({ status: 409 });

    const compareVariant = action(variantApi, 'update_ecommerce_product_variant_compare_price');
    const updatedVariant = await repository.executeMutation(compareVariant.mutation, {
      id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', compare_list_price: 30,
    });
    expect(updatedVariant).toMatchObject({ compare_list_price: 30, compare_at_price: 30, row_version: 2 });
    await expect(repository.executeMutation(compareVariant.mutation, {
      id: 'ecommerce-variant-mug-blue', expected_row_version: 2, current_company_name: 'My Company', compare_list_price: -0.01,
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_COMPARE_PRICE_INVALID' });
    await expect(repository.executeMutation(compareVariant.mutation, {
      id: 'ecommerce-variant-mug-blue', expected_row_version: 2, current_company_name: 'Other Company', compare_list_price: 32,
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_VARIANT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(compareVariant.mutation, {
      id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', compare_list_price: 32,
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_COMPARE_PRICE_STALE' });
    database.close();
  });

  test('preserves compare-at prices across a DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-compare-price-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_compare_price_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const productApi = yaml('api/product-detail.yaml');
    const editProduct = action(productApi, 'edit_ecommerce_product');
    await firstRepository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company',
      values: { name: 'Restart Mug', internal_reference: 'CS-MUG-001', product_type: 'Goods', category: 'All / Accessories', sales_price: 18, compare_list_price: 28, website_sequence: 10, is_published: true },
    });
    const compareVariant = action(yaml('api/product-variant-detail.yaml'), 'update_ecommerce_product_variant_compare_price');
    await firstRepository.executeMutation(compareVariant.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', compare_list_price: 35 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT compare_list_price, sales_price FROM ecommerce_products WHERE id = ?', ['ecommerce-product-mug'])).toEqual([{ compare_list_price: 28, sales_price: 18 }]);
    expect(await secondRepository.query('SELECT compare_list_price, sales_price FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-mug-blue'])).toEqual([{ compare_list_price: 35, sales_price: 20.5 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
