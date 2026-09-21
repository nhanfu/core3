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

describe('eCommerce Shop product-card wishlist visibility parity', () => {
  test('traces Odoo Wishlist and pairs API/page/Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/website_builder/products_design_panel.xml', 'utf8');
    const productTile = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/views/website_sale_wishlist_template.xml', 'utf8');
    const wishlistStyles = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale_wishlist/static/src/scss/website_sale_wishlist.options.scss', 'utf8');
    const api = yaml('api/shop-product-wishlist-policy.yaml');
    const page = yaml('pages/shop-product-wishlist-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_opt_products_design_classes = fields.Char');
    expect(websiteModel).toContain('o_wsale_products_opt_has_wishlist');
    expect(designPanel).toContain('label.translate="Wishlist"');
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_has_wishlist'\"");
    expect(productTile).toContain("visible_element_class");
    expect(productTile).toContain("o_wsale_products_opt_has_wishlist");
    expect(wishlistStyles).toContain('display: var(--o-wsale-wishlist-btn-display, none)');
    expect(wishlistStyles).toContain('.o_wsale_products_opt_has_wishlist');

    expect(page.page).toMatchObject({ id: 'ecommerce-shop-product-wishlist-policy', route: '/ecommerce/shop-product-wishlist' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-product-wishlist-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_product_wishlist_policy' });
    expect(action(api, 'edit_ecommerce_shop_product_wishlist_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.product_wishlist.update' });
    expect(action(api, 'edit_ecommerce_shop_product_wishlist_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_wishlist', permission: 'ecommerce.read', single: true })]));
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('show_wishlist');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_product_wishlist' })]));
    expect(shopPage.components[0].views[0].card.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'show_wishlist' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-product-wishlist', label: 'Shop Product Wishlist', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260922120000-164-ecommerce-shop-product-wishlist.yaml').version).toBe('0.0.164');
    expect(yaml('migrations/20260922121000-165-ecommerce-shop-product-wishlist-demo.yaml').version).toBe('0.0.165');
  });

  test('persists wishlist visibility, enforces boolean/company/stale guards, projects Shop state, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_product_wishlist_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-product-wishlist-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_product_wishlist_policy');
    const shopApi = yaml('api/shop.yaml');
    const shop = shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_product_wishlist');
    const products = shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_wishlist: true, wishlist_behavior: 'Show wishlist' }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-product-wishlist-my-company', expected_row_version: 1, values: { show_wishlist: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_WISHLIST_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-wishlist-my-company', expected_row_version: 1, values: { show_wishlist: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PRODUCT_WISHLIST_INVALID' });
    const hidden = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-wishlist-my-company', expected_row_version: 1, values: { show_wishlist: false } }) as any;
    expect(hidden).toMatchObject({ row_version: 2, show_wishlist: false, wishlist_behavior: 'Hide wishlist' });
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { show_wishlist: false } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ show_wishlist: false });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-wishlist-my-company', expected_row_version: 1, values: { show_wishlist: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_WISHLIST_STALE' });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-product-wishlist-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-wishlist-my-company', expected_row_version: 1, values: { show_wishlist: false } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_wishlist, row_version FROM ecommerce_shop_product_wishlist_policies WHERE id = ?', ['ecommerce-shop-product-wishlist-my-company'])).toEqual([{ company_name: 'My Company', show_wishlist: false, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
