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

describe('eCommerce Shop product-card action style parity', () => {
  test('traces Odoo action style and pairs API/page/Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel_plugin.js', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel.xml', 'utf8');
    const productTileStyles = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/scss/product_tile.scss', 'utf8');
    const api = yaml('api/shop-product-action-style-policy.yaml');
    const page = yaml('pages/shop-product-action-style-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_opt_products_design_classes = fields.Char');
    expect(websiteModel).toContain('o_wsale_products_opt_actions_subtle');
    expect(designPlugin).toContain('product_design_list_to_save');
    expect(designPlugin).toContain('shop_opt_products_design_classes: productOptClasses.join(" ")');
    expect(designPlugin).toContain('rpc("/shop/config/website", updateData)');
    expect(designPanel).toContain('label.translate="Style"');
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_actions_subtle'\"");
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_actions_promote'\"");
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_actions_theme'\"");
    expect(productTileStyles).toContain('.o_wsale_products_opt_actions_subtle');
    expect(productTileStyles).toContain('.o_wsale_products_opt_actions_promote');
    expect(productTileStyles).toContain('.o_wsale_products_opt_actions_theme');

    expect(page.page).toMatchObject({ id: 'ecommerce-shop-product-action-style-policy', route: '/ecommerce/shop-product-action-style' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-product-action-style-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_product_action_style_policy' });
    expect(action(api, 'edit_ecommerce_shop_product_action_style_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.product_action_style.update' });
    expect(action(api, 'edit_ecommerce_shop_product_action_style_policy').mutation.concurrency).toEqual({ required: true });
    expect(api.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_action_style_options', permission: 'ecommerce.read' })]));
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_action_style', permission: 'ecommerce.read', single: true })]));
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('action_style');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_product_action_style' })]));
    expect(shopPage.components[0].views[0].card.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'action_style' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-product-action-style', label: 'Shop Product Action Style', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921460000-156-ecommerce-shop-product-action-style.yaml').version).toBe('0.0.156');
    expect(yaml('migrations/20260921461000-157-ecommerce-shop-product-action-style-demo.yaml').version).toBe('0.0.157');
  });

  test('persists style, enforces options/company/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_product_action_style_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-product-action-style-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_shop_product_action_style_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', action_style: 'subtle' }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([{ value: 'subtle', label: 'Subtle' }, { value: 'promote', label: 'Promote' }, { value: 'theme', label: 'Theme Colors' }]);
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-product-action-style-my-company', expected_row_version: 1, values: { action_style: 'promote' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_ACTION_STYLE_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-action-style-my-company', expected_row_version: 1, values: { action_style: 'outline' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PRODUCT_ACTION_STYLE_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-action-style-my-company', expected_row_version: 1, values: { action_style: 'theme' } }) as any;
    expect(updated).toMatchObject({ row_version: 2, action_style: 'theme' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-action-style-my-company', expected_row_version: 1, values: { action_style: 'subtle' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_ACTION_STYLE_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_product_action_style');
    const products = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_products');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { action_style: 'theme' } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data[0]).toHaveProperty('action_style', 'theme');
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-product-action-style-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-action-style-my-company', expected_row_version: 1, values: { action_style: 'theme' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, action_style, row_version FROM ecommerce_shop_product_action_style_policies WHERE id = ?', ['ecommerce-shop-product-action-style-my-company'])).toEqual([{ company_name: 'My Company', action_style: 'theme', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
