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
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce Comparison Price visibility parity', () => {
  test('traces the Odoo group and keeps the policy page/API separate', () => {
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const groups = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/security/res_groups.xml', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const productView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const productTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const api = yaml('api/product-compare-price-policy.yaml');
    const page = yaml('pages/product-compare-price-policy.yaml');
    const productsApi = yaml('api/products.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const shopApi = yaml('api/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(settingsModel).toContain('group_product_price_comparison = fields.Boolean');
    expect(settingsModel).toContain('implied_group="website_sale.group_product_price_comparison"');
    expect(groups).toContain('id="group_product_price_comparison"');
    expect(settingsView).toContain('name="group_product_price_comparison"');
    expect(productView).toContain('groups="website_sale.group_product_price_comparison"');
    expect(productTemplate).toContain("'website_sale.group_product_price_comparison'");
    expect(productTemplate).toContain("combination_info['compare_list_price']");

    expect(page.page).toMatchObject({ id: 'ecommerce-product-compare-price-policy', route: '/ecommerce/product-compare-price' });
    expect(api.page).toEqual({ id: 'ecommerce-product-compare-price-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_compare_price_policy' });
    expect(action(api, 'edit_ecommerce_product_compare_price_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.compare_price_visibility.update' });
    expect(action(api, 'edit_ecommerce_product_compare_price_policy').mutation.concurrency).toEqual({ required: true });
    expect(productsApi.datasources[0].query).toContain('cp.show_compare_price');
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_detail').query).toContain('cp.show_compare_price');
    expect(variantApi.datasources[0].query).toContain('cp.show_compare_price');
    expect(shopApi.datasources[0].query).toContain('cp.show_compare_price');
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-compare-price', label: 'Comparison Price', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260922110000-162-ecommerce-product-compare-price-visibility.yaml').version).toBe('0.0.162');
    expect(yaml('migrations/20260922111000-163-ecommerce-product-compare-price-visibility-demo.yaml').version).toBe('0.0.163');
  });

  test('persists visibility, enforces company/boolean/stale guards, gates projections, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_product_compare_price_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const policyApi = yaml('api/product-compare-price-policy.yaml');
    const policy = policyApi.datasources[0];
    const edit = action(policyApi, 'edit_ecommerce_product_compare_price_policy');
    const productsApi = yaml('api/products.yaml');
    const productSource = productsApi.datasources.find((source: any) => source.id === 'ecommerce_products');
    const detailApi = yaml('api/product-detail.yaml');
    const detailSource = detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_detail');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const variantSource = variantApi.datasources.find((source: any) => source.id === 'ecommerce_product_variant_detail');
    const shopApi = yaml('api/shop.yaml');
    const shopSource = shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products');

    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).data).toMatchObject({ company_name: 'My Company', show_compare_price: false, compare_price_behavior: 'Hide comparison price' });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    expect((await repository.querySource(productSource, { q: null, published: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ compare_list_price: 24, compare_at_price: null, show_compare_price: false });
    expect((await repository.querySource(variantSource, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company', fixture_state: null }, 0, 1)).data).toMatchObject({ compare_list_price: 25.5, compare_at_price: null, show_compare_price: false });

    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_COMPARE_PRICE_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_COMPARE_PRICE_INVALID' });
    const enabled = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: true } }) as any;
    expect(enabled).toMatchObject({ row_version: 2, show_compare_price: true, compare_price_behavior: 'Show comparison price' });
    expect((await repository.querySource(detailSource, { id: 'ecommerce-product-mug', company_name: 'My Company', fixture_state: null }, 0, 1)).data).toMatchObject({ compare_list_price: 24, compare_at_price: 24, show_compare_price: true });
    expect((await repository.querySource(variantSource, { id: 'ecommerce-variant-mug-blue', company_name: 'My Company', fixture_state: null }, 0, 1)).data).toMatchObject({ compare_list_price: 25.5, compare_at_price: 25.5, show_compare_price: true });
    expect((await repository.querySource(shopSource, { q: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ compare_at_price: 24, show_compare_price: true });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_COMPARE_PRICE_STALE' });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-product-compare-price-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-product-compare-price-my-company', expected_row_version: 1, values: { show_compare_price: true } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_compare_price, row_version FROM ecommerce_product_compare_price_policies WHERE id = ?', ['ecommerce-product-compare-price-my-company'])).toEqual([{ company_name: 'My Company', show_compare_price: true, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
