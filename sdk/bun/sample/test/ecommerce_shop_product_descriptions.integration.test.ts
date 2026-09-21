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

describe('eCommerce Shop product-card description visibility parity', () => {
  test('traces Odoo design checkbox and pairs API/page/Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const designPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel_plugin.js', 'utf8');
    const designPanel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_design_panel.xml', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/shop-product-descriptions-policy.yaml');
    const page = yaml('pages/shop-product-descriptions-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_opt_products_design_classes = fields.Char');
    expect(websiteModel).toContain('o_wsale_products_opt_has_description');
    expect(designPlugin).toContain('product_design_list_to_save');
    expect(designPlugin).toContain('shop_opt_products_design_classes: productOptClasses.join(" ")');
    expect(designPlugin).toContain('rpc("/shop/config/website", updateData)');
    expect(designPanel).toContain("classAction=\"'o_wsale_products_opt_has_description'\"");
    expect(templates).toContain('website.shop_opt_products_design_classes');

    expect(page.page).toMatchObject({ id: 'ecommerce-shop-product-descriptions-policy', route: '/ecommerce/shop-product-descriptions' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-product-descriptions-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_product_descriptions_policy' });
    expect(action(api, 'edit_ecommerce_shop_product_descriptions_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.product_descriptions.update' });
    expect(action(api, 'edit_ecommerce_shop_product_descriptions_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_product_descriptions', permission: 'ecommerce.read', single: true })]));
    expect(shopApi.datasources.find((source: any) => source.id === 'ecommerce_shop_products').query).toContain('show_descriptions');
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_product_descriptions' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-product-descriptions', label: 'Shop Product Descriptions', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921430000-150-ecommerce-shop-product-descriptions.yaml').version).toBe('0.0.150');
    expect(yaml('migrations/20260921431000-151-ecommerce-shop-product-descriptions-demo.yaml').version).toBe('0.0.151');
  });

  test('persists visibility, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_product_descriptions_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-product-descriptions-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_product_descriptions_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', show_descriptions: true }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-product-descriptions-my-company', expected_row_version: 1, values: { show_descriptions: false } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_DESCRIPTIONS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-descriptions-my-company', expected_row_version: 1, values: { show_descriptions: 'sometimes' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PRODUCT_DESCRIPTIONS_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-descriptions-my-company', expected_row_version: 1, values: { show_descriptions: false } }) as any;
    expect(updated).toMatchObject({ row_version: 2, show_descriptions: false });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-descriptions-my-company', expected_row_version: 1, values: { show_descriptions: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PRODUCT_DESCRIPTIONS_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_product_descriptions');
    const products = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_products');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { show_descriptions: false } });
    expect((await repository.querySource(products, { company_name: 'My Company', q: null, fixture_state: null }, 0, 50)).data[0]).toHaveProperty('show_descriptions', false);
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-product-descriptions-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-product-descriptions-my-company', expected_row_version: 1, values: { show_descriptions: false } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, show_descriptions, row_version FROM ecommerce_shop_product_description_policies WHERE id = ?', ['ecommerce-shop-product-descriptions-my-company'])).toEqual([{ company_name: 'My Company', show_descriptions: false, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
