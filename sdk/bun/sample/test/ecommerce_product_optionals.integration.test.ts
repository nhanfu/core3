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

describe('eCommerce product optional parity', () => {
  test('traces Odoo optional products and keeps the configurator page/API split', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/sale/models/product_template.py', 'utf8');
    const configurator = readFileSync('/home/nhanjs/projects/odoo/addons/sale/controllers/product_configurator.py', 'utf8');
    const websiteConfigurator = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/product_configurator.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/sale/views/product_template_views.xml', 'utf8');
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');

    expect(model).toContain('optional_product_ids = fields.Many2many');
    expect(model).toContain('Optional Products are suggested');
    expect(configurator).toContain("route='/sale/product_configurator/get_optional_products'");
    expect(configurator).toContain("'optional_products':");
    expect(websiteConfigurator).toContain("route='/website_sale/product_configurator/get_optional_products'");
    expect(view).toContain('optional_product_ids');
    expect(view).toContain("Recommend when 'Adding to Cart' or quotation");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components.find((component: any) => component.source === 'ecommerce_product_optionals'))
      .toMatchObject({ type: 'ListView', create_action: 'create_ecommerce_product_optional' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_optionals')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'create_ecommerce_product_optional')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.optionals.add' });
    expect(action(api, 'remove_ecommerce_product_optional')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.optionals.remove' });
    expect(action(api, 'add_ecommerce_product_optional_to_cart')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.cart.add_optional' });
  });

  test('seeds optional products, enforces company/publication/duplicate guards, and adds idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_optionals_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_optionals_test', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const optionals = api.datasources.find((source: any) => source.id === 'ecommerce_product_optionals');
    expect((await repository.querySource(optionals, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data)
      .toMatchObject([{ optional_product_id: 'ecommerce-product-lamp', name: 'Desk Lamp', sequence: 10 }]);
    expect((await repository.querySource(optionals, { id: 'ecommerce-product-mug', company_name: 'Other Company' }, 0, 20)).data).toEqual([]);

    const create = action(api, 'create_ecommerce_product_optional');
    const values = { optional_product_id: 'ecommerce-product-lamp', sequence: 5 };
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', source_product_id: 'ecommerce-product-chair', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_OPTIONAL_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', values: { optional_product_id: 'ecommerce-product-setup', sequence: 5 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_OPTIONAL_TARGET_INVALID' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', values })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_OPTIONAL_EXISTS' });

    const add = action(api, 'add_ecommerce_product_optional_to_cart');
    const added = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', product_id: 'ecommerce-product-lamp' }) as any;
    expect(added).toMatchObject({ cart_id: 'ecommerce-cart-open-001', product_id: 'ecommerce-product-lamp', quantity: 1 });
    const repeated = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', product_id: 'ecommerce-product-lamp' }) as any;
    expect(repeated).toMatchObject({ product_id: 'ecommerce-product-lamp', quantity: 2, row_version: 2 });

    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values }) as any;
    const remove = action(api, 'remove_ecommerce_product_optional');
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_OPTIONAL_STALE' });
    expect(await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 1 } })).toEqual({ deleted: true, id: created.id });
    database.close();
  });

  test('preserves optional assignments across DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-optionals-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_optionals_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const create = action(yaml('api/product-detail.yaml'), 'create_ecommerce_product_optional');
      const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values: { optional_product_id: 'ecommerce-product-lamp', sequence: 7 } }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT source_product_id, optional_product_id, sequence, row_version FROM ecommerce_product_optionals WHERE id = ?', [created.id]))
        .toEqual([{ source_product_id: 'ecommerce-product-chair', optional_product_id: 'ecommerce-product-lamp', sequence: 7, row_version: 1 }]);
      expect((await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_product_optionals WHERE source_product_id = ?', ['ecommerce-product-mug']))[0].count).toBe(1);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
