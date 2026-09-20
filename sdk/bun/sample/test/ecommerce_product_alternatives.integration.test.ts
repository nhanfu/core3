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

describe('eCommerce product alternative parity', () => {
  test('traces Odoo alternative products and keeps the Product Detail page/API split', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');

    expect(source).toContain('alternative_product_ids = fields.Many2many');
    expect(source).toContain('def _get_website_alternative_product');
    expect(template).toContain('id="oe_structure_website_sale_recommended_products"');
    expect(template).toContain('Alternative Products');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components.find((component: any) => component.source === 'ecommerce_product_alternatives')).toMatchObject({ type: 'ListView', create_action: 'create_ecommerce_product_alternative' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_alternatives')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'create_ecommerce_product_alternative')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.alternatives.add' });
    expect(action(api, 'remove_ecommerce_product_alternative')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.alternatives.remove' });
  });

  test('seeds published recommendations, enforces company/publication/duplicate guards, and removes with concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_alternatives_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_alternatives_test', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const alternatives = api.datasources.find((source: any) => source.id === 'ecommerce_product_alternatives');
    const seeded = (await repository.querySource(alternatives, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data;
    expect(seeded).toMatchObject([
      { id: 'ecommerce-alternative-mug-chair', destination_product_id: 'ecommerce-product-chair', name: 'Ergonomic Office Chair', sequence: 10 },
      { id: 'ecommerce-alternative-mug-lamp', destination_product_id: 'ecommerce-product-lamp', name: 'Desk Lamp', sequence: 20 },
    ]);
    expect((await repository.querySource(alternatives, { id: 'ecommerce-product-mug', company_name: 'Other Company' }, 0, 20)).data).toEqual([]);

    const add = action(api, 'create_ecommerce_product_alternative');
    const values = { destination_product_id: 'ecommerce-product-lamp', sequence: 5 };
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'Other Company', source_product_id: 'ecommerce-product-chair', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values: { destination_product_id: 'ecommerce-product-setup', sequence: 5 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_TARGET_INVALID' });
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-mug', values: { destination_product_id: 'ecommerce-product-chair', sequence: 5 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_EXISTS' });

    const created = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values }) as any;
    expect(created).toMatchObject({ source_product_id: 'ecommerce-product-chair', destination_product_id: 'ecommerce-product-lamp', destination_name: 'Desk Lamp', sequence: 5, row_version: 1 });
    await expect(repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_EXISTS' });

    const remove = action(api, 'remove_ecommerce_product_alternative');
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 2 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_STALE' });
    const deleted = await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 1 } });
    expect(deleted).toEqual({ deleted: true, id: created.id });
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'My Company', values: { id: created.id, expected_row_version: 1 } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_ALTERNATIVE_STALE' });
    database.close();
  });

  test('preserves alternative assignments across DuckDB restart and migration replay', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-alternatives-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_alternatives_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
      const add = action(yaml('api/product-detail.yaml'), 'create_ecommerce_product_alternative');
      const created = await repository.executeMutation(add.mutation, { current_company_name: 'My Company', source_product_id: 'ecommerce-product-chair', values: { destination_product_id: 'ecommerce-product-lamp', sequence: 7 } }) as any;
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      const restarted = new YamlRepository(database);
      await migrateDatabase(restarted, migrations, undefined, migrationName, ['schema', 'data']);
      expect(await restarted.query('SELECT source_product_id, destination_product_id, sequence, row_version FROM ecommerce_product_alternatives WHERE id = ?', [created.id]))
        .toEqual([{ source_product_id: 'ecommerce-product-chair', destination_product_id: 'ecommerce-product-lamp', sequence: 7, row_version: 1 }]);
      expect((await restarted.query('SELECT COUNT(*) AS count FROM ecommerce_product_alternatives WHERE source_product_id = ?', ['ecommerce-product-mug']))[0].count).toBe(2);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
