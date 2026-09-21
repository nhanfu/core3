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

describe('eCommerce Shop product-card ratings visibility parity', () => {
  test('traces Odoo Ratings and pairs API/page/Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel_plugin.js', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel.xml', 'utf8');
    const productTile = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_tile_templates.xml', 'utf8');
    const api = yaml('api/shop-product-ratings-policy.yaml');
    const page = yaml('pages/shop-product-ratings-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_opt_products_design_classes = fields.Char');
    expect(designPlugin).toContain('product_design_list_to_save');
    expect(designPlugin).toContain('shop_opt_products_design_classes: productOptClasses.join(" ")');
    expect(designPlugin).toContain('rpc("/shop/config/website", updateData)');
    expect(designPanel).toContain('label.translate="Ratings"');
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_has_rating'\"");
    expect(productTile).toContain("visible_element_class");
    expect(productTile).toContain("o_wsale_products_opt_has_rating");
    expect(productTile).toContain('rating_avg');
    expect(productTile).toContain('rating_count');

    expect(page.page).toMatchObject({ id: 'ecommerce-shop-product-ratings-policy', route: '/ecommerce/shop-product-ratings' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-product-ratings-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_product_ratings_policy' });
    expect(action(api, 'edit_ecommerce_shop_product_ratings_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.product_ratings.update' });
    expect(action(api, 'edit_ecommerce_shop_product_ratings_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_ratings', permission: 'ecommerce.read', single: true })]));
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('show_ratings');
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('rating_average');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_product_ratings' })]));
    expect(shopPage.components[0].views[0].card.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'show_ratings' }), expect.objectContaining({ field: 'rating_average' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-product-ratings', label: 'Shop Product Ratings', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921470000-158-ecommerce-shop-product-ratings.yaml').version).toBe('0.0.158');
    expect(yaml('migrations/20260921471000-159-ecommerce-shop-product-ratings-demo.yaml').version).toBe('0.0.159');
  });

  test('persists ratings visibility, enforces boolean/company/stale guards, projects reviews, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_product_ratings_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-product-ratings-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_product_ratings_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_ratings: false, rating_behavior: 'Hide ratings' }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 1, values: { show_ratings: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_RATINGS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 1, values: { show_ratings: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PRODUCT_RATINGS_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 1, values: { show_ratings: true } }) as any;
    expect(updated).toMatchObject({ row_version: 2, show_ratings: true, rating_behavior: 'Show ratings' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 1, values: { show_ratings: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_RATINGS_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_product_ratings');
    const products = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_products');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { show_ratings: true } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ show_ratings: true, rating_count: 1, rating_average: 5 });
    await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 2, values: { show_ratings: false } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ show_ratings: false, rating_count: 0, rating_average: null });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-product-ratings-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-ratings-my-company', expected_row_version: 1, values: { show_ratings: true } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_ratings, row_version FROM ecommerce_shop_product_rating_policies WHERE id = ?', ['ecommerce-shop-product-ratings-my-company'])).toEqual([{ company_name: 'My Company', show_ratings: true, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
