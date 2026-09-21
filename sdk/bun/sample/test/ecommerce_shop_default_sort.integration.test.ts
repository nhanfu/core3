import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce shop default sort parity', () => {
  test('traces Odoo shop sort source/menu/controller and pairs page/API contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const data = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/data/data.xml', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const builder = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/static/src/website_builder/products_list_page_option_plugin.js', 'utf8');
    const api = yaml('api/shop-default-sort.yaml');
    const page = yaml('pages/shop-default-sort.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_default_sort = fields.Selection');
    expect(websiteModel).toContain("('website_sequence asc', _(\"Featured\"))");
    expect(websiteModel).toContain("('publish_date desc', _(\"Newest Arrivals\"))");
    expect(websiteModel).toContain("('list_price desc', _(\"Price - High to Low\"))");
    expect(controller).toContain("post.get('order') or request.env['website'].get_current_website().shop_default_sort");
    expect(controller).toContain("return 'is_published desc, %s, id desc' % order");
    expect(data).toContain('id="menu_shop"');
    expect(data).toContain('id="action_open_website"');
    expect(templates).toContain('t-att-data-default-sort="website.shop_default_sort"');
    expect(builder).toContain('/shop/config/website');
    expect(page.page).toMatchObject({ id: 'ecommerce-shop-default-sort', route: '/ecommerce/shop-default-sort' });
    expect(api.page).toEqual({ id: 'ecommerce-shop-default-sort' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_shop_default_sort' });
    expect(action(api, 'edit_ecommerce_shop_default_sort')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.default_sort.update' });
    expect(action(api, 'edit_ecommerce_shop_default_sort').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/shop-default-sort', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921200000-104-ecommerce-shop-default-sort.yaml').version).toBe('0.0.104');
    expect(yaml('migrations/20260921201000-105-ecommerce-shop-default-sort-demo.yaml').version).toBe('0.0.105');
  });

  test('changes the company sort with validation, concurrency, and public shop ordering', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_shop_default_sort_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_shop_default_sort_test', ['schema', 'data']);
    const api = yaml('api/shop-default-sort.yaml');
    const shopApi = yaml('api/shop.yaml');
    const sortSource = api.datasources[0];
    const edit = action(api, 'edit_ecommerce_shop_default_sort');
    const shopSource = shopApi.datasources[0];
    const publicShop = yaml('operations.yaml').operations['ecommerce.public.shop'];

    expect(await repository.querySource(sortSource, { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject(
      expect.objectContaining({ company_name: 'My Company', default_sort: 'website_sequence asc', sort_label: 'Featured' }),
    );
    expect((await repository.querySource(shopSource, { q: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Core3 Ceramic Mug', 'Ergonomic Office Chair', 'Desk Lamp']);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-shop-default-sort-my-company', expected_row_version: 1, values: { default_sort: 'name asc' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_SORT_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-default-sort-my-company', expected_row_version: 1, values: { default_sort: 'unsupported' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_SHOP_SORT_INVALID' });
    const changed = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-default-sort-my-company', expected_row_version: 1, values: { default_sort: 'list_price desc' } }) as any;
    expect(changed).toMatchObject({ row_version: 2, default_sort: 'list_price desc', sort_label: 'Price - High to Low' });
    expect((await repository.querySource(shopSource, { q: null, company_name: 'My Company', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Ergonomic Office Chair', 'Desk Lamp', 'Core3 Ceramic Mug']);
    const bound = bindNamedParams(publicShop.query, { q: null });
    expect((await repository.query(bound.statement, bound.values)).map((row: any) => row.name)).toEqual(['Ergonomic Office Chair', 'Desk Lamp', 'Core3 Ceramic Mug']);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-default-sort-my-company', expected_row_version: 1, values: { default_sort: 'name asc' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_SHOP_SORT_STALE' });
    database.close();
  });

  test('preserves the company sort policy across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-shop-default-sort-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_shop_default_sort_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/shop-default-sort.yaml');
      const edit = action(api, 'edit_ecommerce_shop_default_sort');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-shop-default-sort-my-company', expected_row_version: 1, values: { default_sort: 'publish_date desc' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await repository.query('SELECT company_name, default_sort, row_version FROM ecommerce_shop_default_sort_policies WHERE id = ?', ['ecommerce-shop-default-sort-my-company'])).toEqual([
        { company_name: 'My Company', default_sort: 'publish_date desc', row_version: 2 },
      ]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
