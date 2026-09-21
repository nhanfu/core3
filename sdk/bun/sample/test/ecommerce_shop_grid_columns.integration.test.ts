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

describe('eCommerce shop grid columns parity', () => {
  test('traces Odoo grid-column source and pairs configuration and Shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const optionPlugin = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_list_page_option_plugin.js', 'utf8');
    const optionTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_list_page_option.xml', 'utf8');
    const api = yaml('api/shop-grid-columns-policy.yaml');
    const page = yaml('pages/shop-grid-columns-policy.yaml');
    const shopApi = yaml('api/shop.yaml');
    const shopPage = yaml('pages/shop.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_ppr = fields.Integer');
    expect(websiteModel).toContain('Number of grid columns on the shop');
    expect(optionPlugin).toContain("rpc(\"/shop/config/website\", { shop_ppr: ppr })");
    expect(optionTemplate).toContain('<BuilderSelectItem actionValue="2">2</BuilderSelectItem>');
    expect(optionTemplate).toContain('<BuilderSelectItem actionValue="5">5</BuilderSelectItem>');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop-grid-columns-policy', route: '/ecommerce/shop-grid-columns' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-grid-columns-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_grid_columns_policy' });
    expect(action(api, 'edit_ecommerce_shop_grid_columns_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.grid_columns.update' });
    expect(action(api, 'edit_ecommerce_shop_grid_columns_policy').mutation.concurrency).toEqual({ required: true });
    expect(shopApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_shop_grid_columns', permission: 'ecommerce.read' })]));
    expect(shopPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'OdooFormView', source: 'ecommerce_shop_grid_columns' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-grid-columns', label: 'Shop Grid Columns', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921380000-140-ecommerce-shop-grid-columns.yaml').version).toBe('0.0.140');
    expect(yaml('migrations/20260921381000-141-ecommerce-shop-grid-columns-demo.yaml').version).toBe('0.0.141');
  });

  test('persists grid columns, enforces company/value/stale guards, projects Shop, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_shop_grid_columns_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/shop-grid-columns-policy.yaml');
    const policy = api.datasources[0];
    const options = api.datasources[1];
    const edit = action(api, 'edit_ecommerce_shop_grid_columns_policy');

    expect(await repository.querySource(policy, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({ data: expect.objectContaining({ company_name: 'My Company', grid_columns: 3 }) });
    expect((await repository.querySource(options, {}, 0, 10)).data).toEqual([
      { value: 2, label: '2 columns' }, { value: 3, label: '3 columns' }, { value: 4, label: '4 columns' }, { value: 5, label: '5 columns' },
    ]);
    expect((await repository.querySource(policy, { company_name: 'My Company', fixture_state: 'not_found' }, 0, 10)).data).toEqual({});
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 5 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_GRID_COLUMNS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 6 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_GRID_COLUMNS_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 5 } }) as any;
    expect(updated).toMatchObject({ row_version: 2, grid_columns: 5 });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_GRID_COLUMNS_STALE' });
    const shop = yaml('api/shop.yaml').datasources.find((source: any) => source.id === 'ecommerce_shop_grid_columns');
    expect(await repository.querySource(shop, { company_name: 'My Company' }, 0, 10)).toMatchObject({ data: { grid_columns: 5 } });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-shop-grid-columns-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-grid-columns-my-company', expected_row_version: 1, values: { grid_columns: 4 } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT company_name, grid_columns, row_version FROM ecommerce_shop_grid_columns_policies WHERE id = ?', ['ecommerce-shop-grid-columns-my-company'])).toEqual([{ company_name: 'My Company', grid_columns: 4, row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
