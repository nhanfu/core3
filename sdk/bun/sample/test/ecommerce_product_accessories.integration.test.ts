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

describe('eCommerce product accessory parity', () => {
  test('traces Odoo cart accessories and keeps page/API contracts separate', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const saleOrder = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/sale_order.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const page = yaml('pages/cart.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const api = yaml('api/cart.yaml');
    const detailApi = yaml('api/product-detail.yaml');

    expect(source).toContain('accessory_product_ids = fields.Many2many');
    expect(source).toContain('def _get_website_accessory_product');
    expect(saleOrder).toContain('def _cart_accessories');
    expect(saleOrder).toContain('accessory_products');
    expect(views).toContain('Suggested accessories in the eCommerce cart');
    expect(page.page).toMatchObject({ id: 'ecommerce-cart', route: '/ecommerce/cart' });
    expect(api.page).toEqual({ id: 'ecommerce-cart' });
    expect(page.components[0].notebook.tabs.find((tab: any) => tab.id === 'cart_accessories').component)
      .toMatchObject({ type: 'ListView', source: 'ecommerce_cart_accessories' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_cart_accessories')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'add_ecommerce_cart_accessory')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.cart.add_accessory' });
    expect(detailPage.components.find((component: any) => component.source === 'ecommerce_product_accessories')).toMatchObject({ type: 'ListView', create_action: 'create_ecommerce_product_accessory' });
    expect(detailApi.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(detailApi.datasources.find((source: any) => source.id === 'ecommerce_product_accessories')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(detailApi, 'create_ecommerce_product_accessory')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.accessories.add' });
    expect(action(detailApi, 'remove_ecommerce_product_accessory')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.accessories.remove' });
  });

  test('seeds cart recommendations, enforces company/publication/duplicate guards, and adds idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_accessories_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_accessories_test', ['schema', 'data']);
    const cartApi = yaml('api/cart.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const accessories = cartApi.datasources.find((source: any) => source.id === 'ecommerce_cart_accessories');
    expect((await repository.querySource(accessories, { cart_id: 'ecommerce-cart-open-001', company_name: 'My Company' }, 0, 20)).data)
      .toMatchObject([{ product_id: 'ecommerce-product-lamp', name: 'Desk Lamp', sequence: 10 }]);
    expect((await repository.querySource(accessories, { cart_id: 'ecommerce-cart-open-001', company_name: 'Other Company' }, 0, 20)).data).toEqual([]);

    const create = action(detailApi, 'create_ecommerce_product_accessory');
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', source_product_id: 'ecommerce-product-chair', values: { accessory_product_id: 'ecommerce-product-lamp', sequence: 5 } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_ACCESSORY_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', values: { accessory_product_id: 'ecommerce-product-setup', sequence: 5 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_ACCESSORY_TARGET_INVALID' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', values: { accessory_product_id: 'ecommerce-product-lamp', sequence: 5 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ACCESSORY_EXISTS' });

    const add = action(cartApi, 'add_ecommerce_cart_accessory');
    const added = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', product_id: 'ecommerce-product-lamp', cart_id: 'ecommerce-cart-open-001' }) as any;
    expect(added).toMatchObject({ cart_id: 'ecommerce-cart-open-001', product_id: 'ecommerce-product-lamp', quantity: 1 });
    const repeated = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', product_id: 'ecommerce-product-lamp', cart_id: 'ecommerce-cart-open-001' }) as any;
    expect(repeated).toMatchObject({ product_id: 'ecommerce-product-lamp', quantity: 2, row_version: 2 });
    expect((await repository.querySource(accessories, { cart_id: 'ecommerce-cart-open-001', company_name: 'My Company' }, 0, 20)).data).toEqual([]);

    const remove = action(detailApi, 'remove_ecommerce_product_accessory');
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values: { accessory_product_id: 'ecommerce-product-lamp', sequence: 5 } }) as any;
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ACCESSORY_STALE' });
    expect(await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 1 } })).toEqual({ deleted: true, id: created.id });
    database.close();
  });

  test('preserves accessory assignments across DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-accessories-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_accessories_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const create = action(yaml('api/product-detail.yaml'), 'create_ecommerce_product_accessory');
      const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values: { accessory_product_id: 'ecommerce-product-lamp', sequence: 7 } }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT source_product_id, accessory_product_id, sequence, row_version FROM ecommerce_product_accessories WHERE id = ?', [created.id]))
        .toEqual([{ source_product_id: 'ecommerce-product-chair', accessory_product_id: 'ecommerce-product-lamp', sequence: 7, row_version: 1 }]);
      expect((await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_product_accessories WHERE source_product_id = ?', ['ecommerce-product-mug']))[0].count).toBe(1);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
