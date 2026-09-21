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

describe('eCommerce variant base-unit pricing parity', () => {
  test('traces Odoo base-unit pricing and keeps Product Detail/Variant page APIs separate', () => {
    const productModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_product.py', 'utf8');
    const templateModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const productPage = yaml('pages/product-detail.yaml');
    const productApi = yaml('api/product-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');

    expect(productModel).toContain('base_unit_count = fields.Float');
    expect(productModel).toContain('base_unit_price = fields.Monetary');
    expect(productModel).toContain('base_unit_name = fields.Char');
    expect(productModel).toContain('return self.base_unit_count and price / self.base_unit_count');
    expect(templateModel).toContain("combination_info.update({");
    expect(templateModel).toContain("'base_unit_price': product_or_template._get_base_unit_price");
    expect(view).toContain('name="base_unit_price"');
    expect(view).toContain('groups="website_sale.group_show_uom_price"');
    expect(productPage.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(productApi.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(variantPage.page).toMatchObject({ id: 'ecommerce-product-variant-detail', route: '/ecommerce/products/variants/detail' });
    expect(variantApi.page).toEqual({ id: 'ecommerce-product-variant-detail' });
    expect(productApi.datasources.find((source: any) => source.id === 'ecommerce_product_variants').permission).toBe('ecommerce.read');
    expect(variantApi.datasources.find((source: any) => source.id === 'ecommerce_product_variant_detail').query).toContain('base_unit_price');
    expect(action(variantApi, 'update_ecommerce_product_variant_base_unit')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.product_variants.base_unit.update' });
    expect(variantPage.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'update_ecommerce_product_variant_base_unit', permission: 'ecommerce.write' })]));
    expect(productPage.components.find((component: any) => component.source === 'ecommerce_product_variants').columns)
      .toEqual(expect.arrayContaining([expect.objectContaining({ field: 'base_unit_price' })]));
  });

  test('seeds unit pricing, enforces company/validation/concurrency guards, and hides zero-count pricing', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_variant_base_units_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_variant_base_units_test', ['schema', 'data']);
    const referencePriceApi = yaml('api/product-reference-price-policy.yaml');
    await repository.executeMutation(action(referencePriceApi, 'edit_ecommerce_product_reference_price_policy').mutation, { current_company_name: 'My Company', id: 'ecommerce-product-reference-price-my-company', expected_row_version: 1, values: { show_reference_price: true } });
    const api = yaml('api/product-variant-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'ecommerce_product_variant_detail');
    expect((await repository.querySource(detail, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company' }, 0, 1)).data)
      .toMatchObject({ base_unit_count: 2, base_unit_name: 'piece', base_unit_price: 10.25 });
    expect((await repository.querySource(detail, { id: 'ecommerce-variant-mug-blue', company_name: 'Other Company' }, 0, 1)).data).toEqual({});

    const update = action(api, 'update_ecommerce_product_variant_base_unit');
    const values = { base_unit_count: 4, base_unit_name: 'kg' };
    await expect(repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_BASE_UNIT_STALE' });
    await expect(repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', values: { base_unit_count: -1, base_unit_name: 'kg' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_BASE_UNIT_COUNT_INVALID' });
    await expect(repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', values: { base_unit_count: 4, base_unit_name: 'x'.repeat(81) } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_BASE_UNIT_NAME_INVALID' });
    const changed = await repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', values }) as any;
    expect(changed).toMatchObject({ id: 'ecommerce-variant-mug-blue', base_unit_count: 4, base_unit_name: 'kg', base_unit_price: 5.125, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 1, current_company_name: 'My Company', values: { base_unit_count: 5, base_unit_name: 'box' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_BASE_UNIT_STALE' });
    const hidden = await repository.executeMutation(update.mutation, { id: 'ecommerce-variant-mug-blue', expected_row_version: 2, current_company_name: 'My Company', values: { base_unit_count: 0, base_unit_name: '' } }) as any;
    expect(hidden).toMatchObject({ base_unit_count: 0, base_unit_name: null, base_unit_price: null, row_version: 3 });
    database.close();
  });

  test('preserves base-unit metadata and derived price across DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-variant-base-units-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_variant_base_units_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const update = action(yaml('api/product-variant-detail.yaml'), 'update_ecommerce_product_variant_base_unit');
      await repository.executeMutation(update.mutation, { id: 'ecommerce-variant-chair-black', expected_row_version: 1, current_company_name: 'My Company', values: { base_unit_count: 5, base_unit_name: 'box' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT base_unit_count, base_unit_name, sales_price, row_version FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-chair-black']))
        .toEqual([{ base_unit_count: 5, base_unit_name: 'box', sales_price: 259, row_version: 2 }]);
      expect((await restarted.query('SELECT CAST(sales_price / base_unit_count AS DECIMAL(20,8)) AS base_unit_price FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-chair-black']))[0].base_unit_price).toBe(51.8);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
