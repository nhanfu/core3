import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product display dimensions parity', () => {
  test('traces Odoo and pairs Products, Shop, and Product Detail page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    expect(model).toContain('website_size_x = fields.Integer(string="Size X", default=1)');
    expect(model).toContain('website_size_y = fields.Integer(string="Size Y", default=1)');
    expect(controller).toContain('x = min(max(p.website_size_x, 1), ppr)');
    expect(controller).toContain('y = min(max(p.website_size_y, 1), ppr)');
    expect(controller).toContain("product.write({'website_size_x': options[\"x\"], 'website_size_y': options[\"y\"]})");

    const productsApi = yaml('api/products.yaml');
    const productsPage = yaml('pages/products.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    expect(productsApi.page.id).toBe(productsPage.page.id);
    expect(shopApi.page.id).toBe(shopPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(productsApi.datasources[0].query).toContain('website_size_x, website_size_y');
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('website_size_x, website_size_y');
    expect(detailApi.datasources[0].query).toContain('website_size_x, website_size_y');
    expect(productsPage.components[0].columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'website_size_x', label: 'Display Width' }),
      expect.objectContaining({ field: 'website_size_y', label: 'Display Height' }),
    ]));
    expect(shopPage.components[0].columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'website_size_x', label: 'Display Width' }),
      expect.objectContaining({ field: 'website_size_y', label: 'Display Height' }),
    ]));
    expect(detailPage.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'edit_ecommerce_product', permission: 'ecommerce.write' }),
    ]));
    expect(detailPage.components[0].groups.find((group: any) => group.title === 'Website').fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'website_size_x', label: 'Display Width' }),
      expect.objectContaining({ field: 'website_size_y', label: 'Display Height' }),
    ]));
    expect(action(productsApi, 'create_ecommerce_product')).toMatchObject({ permission: 'ecommerce.write' });
    expect(action(productsApi, 'create_ecommerce_product').mutation.fields).toEqual(expect.arrayContaining(['website_size_x', 'website_size_y']));
    expect(action(detailApi, 'edit_ecommerce_product').mutation.concurrency).toMatchObject({ required: true });
    expect(action(detailApi, 'edit_ecommerce_product').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_DISPLAY_DIMENSIONS_INVALID', status: 422 }),
    ]));
    for (const [page, api] of [[productsPage, productsApi], [shopPage, shopApi], [detailPage, detailApi]]) {
      expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
      expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    }
  });

  test('seeds, validates, scopes, updates, and reads durable dimensions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_display_dimensions_test', ['schema', 'data']);
    const productsApi = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_products');
    const mug = (await repository.querySource(productsApi.datasources[0], { q: 'Core3 Ceramic Mug', published: null, company_name: 'My Company', fixture_state: null }, 0, 10)).data[0];
    const chair = (await repository.querySource(productsApi.datasources[0], { q: 'Ergonomic Office Chair', published: null, company_name: 'My Company', fixture_state: null }, 0, 10)).data[0];
    expect(mug).toMatchObject({ website_size_x: 2, website_size_y: 1 });
    expect(chair).toMatchObject({ website_size_x: 1, website_size_y: 2 });
    expect((await repository.querySource(shop, { q: 'Core3 Ceramic Mug', company_name: 'My Company' }, 0, 10)).data[0]).toMatchObject({ website_size_x: 2, website_size_y: 1 });

    const create = action(productsApi, 'create_ecommerce_product');
    const values = { name: 'Dimension QA Product', internal_reference: 'ECOM-DIM-001', product_type: 'Goods', category: 'All Products', sales_price: 15, compare_list_price: 0, website_description: '', website_size_x: 3, website_size_y: 2, website_sequence: 10, is_published: false, company_name: 'My Company' };
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { ...values, website_size_x: 0, website_size_y: 13 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_DISPLAY_DIMENSIONS_INVALID' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ name: values.name, website_size_x: 3, website_size_y: 2, row_version: 1 });

    const edit = action(detailApi, 'edit_ecommerce_product');
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company', values: { ...values, website_size_x: 4, website_size_y: 3 } }) as any;
    expect(updated).toMatchObject({ id: created.id, website_size_x: 4, website_size_y: 3, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'My Company', values: { ...values, website_size_x: 5, website_size_y: 5 } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Other Company', values: { ...values, website_size_x: 5, website_size_y: 5 } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company', values: { ...values, website_size_x: 13, website_size_y: 1 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_DISPLAY_DIMENSIONS_INVALID' });
    expect((await repository.query('SELECT website_size_x, website_size_y, row_version FROM ecommerce_products WHERE id = ?', [created.id]))[0]).toEqual({ website_size_x: 4, website_size_y: 3, row_version: 2 });
    database.close();
  });

  test('preserves product dimensions across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-display-dimensions-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_display_dimensions_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const edit = action(yaml('api/product-detail.yaml'), 'edit_ecommerce_product');
      const product = (await firstRepository.query('SELECT * FROM ecommerce_products WHERE id = ?', ['ecommerce-product-mug']))[0];
      await firstRepository.executeMutation(edit.mutation, { id: product.id, expected_row_version: product.row_version, current_company_name: 'My Company', values: { name: product.name, internal_reference: product.internal_reference, product_type: product.product_type, category: product.category, sales_price: product.sales_price, compare_list_price: product.compare_list_price, website_description: product.website_description, website_size_x: 6, website_size_y: 4, website_sequence: product.website_sequence, is_published: product.is_published } });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT website_size_x, website_size_y FROM ecommerce_products WHERE id = ?', ['ecommerce-product-mug'])).toEqual([{ website_size_x: 6, website_size_y: 4 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
