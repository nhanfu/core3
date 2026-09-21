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

describe('eCommerce Shop product-card Add to Cart CTA parity', () => {
  test('traces Odoo CTA visibility and pairs API/page/Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel_plugin.js', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel.xml', 'utf8');
    const productTile = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_tile_templates.xml', 'utf8');
    const productTileStyles = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/scss/product_tile.scss', 'utf8');
    const api = yaml('api/shop-product-cta-policy.yaml');
    const page = yaml('pages/shop-product-cta-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_opt_products_design_classes = fields.Char');
    expect(websiteModel).toContain('o_wsale_products_opt_has_cta');
    expect(designPlugin).toContain('product_design_list_to_save');
    expect(designPlugin).toContain('shop_opt_products_design_classes: productOptClasses.join(" ")');
    expect(designPlugin).toContain('rpc("/shop/config/website", updateData)');
    expect(designPanel).toContain('title.translate="Add to Cart"');
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_has_cta'\"");
    expect(productTile).toContain("t-if=\"product._website_show_quick_add()\"");
    expect(productTile).toContain("visible_element_class\" t-value=\"'o_wsale_products_opt_has_cta'\"");
    expect(productTileStyles).toContain('.o_wsale_products_opt_has_cta');
    expect(productTileStyles).toContain('--o-wsale-card-btn-submit-display: inline-flex');

    expect(page.page).toMatchObject({ id: 'ecommerce-shop-product-cta-policy', route: '/ecommerce/shop-product-cta' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-product-cta-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_product_cta_policy' });
    expect(action(api, 'edit_ecommerce_shop_product_cta_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.product_cta.update' });
    expect(action(api, 'edit_ecommerce_shop_product_cta_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_cta', permission: 'ecommerce.read', single: true })]));
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('show_cta');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_product_cta' })]));
    expect(shopPage.components[0].views[0].card.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'show_cta' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-product-cta', label: 'Shop Add to Cart', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921440000-152-ecommerce-shop-product-cta.yaml').version).toBe('0.0.152');
    expect(yaml('migrations/20260921441000-153-ecommerce-shop-product-cta-demo.yaml').version).toBe('0.0.153');
  });

  test('persists CTA visibility, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_product_cta_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-product-cta-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_product_cta_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_cta: true }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-product-cta-my-company', expected_row_version: 1, values: { show_cta: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_CTA_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-cta-my-company', expected_row_version: 1, values: { show_cta: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PRODUCT_CTA_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-cta-my-company', expected_row_version: 1, values: { show_cta: false } }) as any;
    expect(updated).toMatchObject({ row_version: 2, show_cta: false });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-cta-my-company', expected_row_version: 1, values: { show_cta: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_CTA_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_product_cta');
    const products = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_products');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { show_cta: false } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data[0]).toHaveProperty('show_cta', false);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-product-cta-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-cta-my-company', expected_row_version: 1, values: { show_cta: false } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_cta, row_version FROM ecommerce_shop_product_cta_policies WHERE id = ?', ['ecommerce-shop-product-cta-my-company'])).toEqual([{ company_name: 'My Company', show_cta: false, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
