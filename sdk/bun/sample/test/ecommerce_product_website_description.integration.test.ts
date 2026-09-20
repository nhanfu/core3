import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (document: any, id: string) => document.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product website description parity', () => {
  test('traces Odoo website description rendering and separates page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const productViews = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    expect(model).toContain('website_description = fields.Html');
    expect(controller).toContain("Domain('website_description', 'ilike', srch)");
    expect(templates).toContain("t-field=\"product.website_description\"");
    expect(productViews).toContain('description_ecommerce');

    const api = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const productsPage = yaml('pages/products.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    expect(productsPage.datasources).toBeUndefined();
    expect(shopPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(api.page.id).toBe(productsPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(action(detailApi, 'edit_ecommerce_product')).toMatchObject({ permission: 'ecommerce.write' });
    expect(action(detailApi, 'edit_ecommerce_product').mutation.fields).toContain('website_description');
    expect(productsPage.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'website_description' })]));
    expect(shopPage.components[0].views[0].card.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'website_description' })]));
    expect(detailPage.components[0].groups[2].fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'website_description', type: 'richtext' })]));
  });

  test('persists searchable descriptions with permission, company, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_website_description_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_website_description_test', ['schema', 'data']);

    const productApi = yaml('api/product-detail.yaml');
    const productsApi = yaml('api/products.yaml');
    const productSource = productApi.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_detail');
    const productsSource = productsApi.datasources.find((candidate: any) => candidate.id === 'ecommerce_products');
    const shopSource = yaml('api/shop.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_shop_products');
    expect((await repository.querySource(productSource, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data).toMatchObject({ website_description: '<p>Hand-finished ceramic mug for the Core3 workspace.</p>' });
    expect((await repository.querySource(productsSource, { q: 'workspace', published: true, fixture_state: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).toContain('ecommerce-product-mug');
    expect((await repository.querySource(shopSource, { q: 'workspace', fixture_state: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).toContain('ecommerce-product-mug');

    const editProduct = action(productApi, 'edit_ecommerce_product');
    const validValues = { name: 'Core3 Ceramic Mug', internal_reference: 'CS-MUG-001', product_type: 'Goods', category: 'All / Accessories', sales_price: 18, compare_list_price: 24, website_description: '<p>New <strong>workspace</strong> description.</p>', website_sequence: 10, is_published: true };
    const updated = await repository.executeMutation(editProduct.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company', values: validValues });
    expect(updated).toMatchObject({ website_description: validValues.website_description, row_version: 2 });
    expect((await repository.querySource(productsSource, { q: 'workspace', published: true, fixture_state: null, company_name: 'My Company' }, 0, 50)).data.map((row: any) => row.id)).toContain('ecommerce-product-mug');
    await expect(repository.executeMutation(editProduct.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company', values: { ...validValues, website_description: '<script>alert(1)</script>' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_WEBSITE_DESCRIPTION_INVALID' });
    await expect(repository.executeMutation(editProduct.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company', values: { ...validValues, website_description: 'x'.repeat(10001) } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_WEBSITE_DESCRIPTION_INVALID' });
    await expect(repository.executeMutation(editProduct.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'Other Company', values: validValues })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(editProduct.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company', values: validValues })).rejects.toMatchObject({ status: 409 });
    database.close();
  });

  test('preserves website description across a DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-website-description-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_website_description_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const editProduct = action(yaml('api/product-detail.yaml'), 'edit_ecommerce_product');
    await firstRepository.executeMutation(editProduct.mutation, {
      id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company',
      values: { name: 'Restart Description Mug', internal_reference: 'CS-MUG-001', product_type: 'Goods', category: 'All / Accessories', sales_price: 18, compare_list_price: 24, website_description: '<p>Restart-safe product detail.</p>', website_sequence: 10, is_published: true },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT website_description, row_version FROM ecommerce_products WHERE id = ?', ['ecommerce-product-mug'])).toEqual([{ website_description: '<p>Restart-safe product detail.</p>', row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
