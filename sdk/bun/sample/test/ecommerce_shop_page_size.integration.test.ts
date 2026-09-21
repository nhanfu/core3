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

describe('eCommerce shop page size parity', () => {
  test('traces Odoo page-size action and pairs configuration and Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const optionPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_list_page_option_plugin.js', 'utf8');
    const optionTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_list_page_option.xml', 'utf8');
    const api = yaml('api/shop-page-size-policy.yaml');
    const page = yaml('pages/shop-page-size-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_ppg = fields.Integer');
    expect(websiteModel).toContain('Number of products in the grid on the shop');
    expect(optionPlugin).toContain('const PPG_LIMIT = 10000');
    expect(optionPlugin).toContain('rpc("/shop/config/website", { shop_ppg: ppg })');
    expect(optionTemplate).toContain('<BuilderNumberInput action="\'setPpg\'" step="1"/>');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop-page-size-policy', route: '/ecommerce/shop-page-size' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-page-size-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_page_size_policy' });
    expect(action(api, 'edit_ecommerce_shop_page_size_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.page_size.update' });
    expect(action(api, 'edit_ecommerce_shop_page_size_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_page_size', permission: 'ecommerce.read' })]));
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_page_size' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-page-size', label: 'Shop Page Size', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921390000-142-ecommerce-shop-page-size.yaml').version).toBe('0.0.142');
    expect(yaml('migrations/20260921391000-143-ecommerce-shop-page-size-demo.yaml').version).toBe('0.0.143');
  });

  test('persists page size, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_page_size_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-page-size-policy.yaml');
    const policy = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_page_size_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', page_size: 21 }) });
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 48 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PAGE_SIZE_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 0 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PAGE_SIZE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 10001 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_PAGE_SIZE_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 48 } }) as any;
    expect(updated).toMatchObject({ row_version: 2, page_size: 48 });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 12 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_PAGE_SIZE_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_page_size');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { page_size: 48 } });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-page-size-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-page-size-my-company', expected_row_version: 1, values: { page_size: 36 } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, page_size, row_version FROM ecommerce_shop_page_size_policies WHERE id = ?', ['ecommerce-shop-page-size-my-company'])).toEqual([{ company_name: 'My Company', page_size: 36, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
