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

describe('eCommerce product website category assignment parity', () => {
  test('traces Odoo public_categ_ids and pairs the Product Detail page/API contract', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const productView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    expect(model).toContain("public_categ_ids = fields.Many2many");
    expect(model).toContain("relation='product_public_category_product_template_rel'");
    expect(productView).toContain('name="public_categ_ids" widget="many2many_tags"');
    expect(menu).toContain('action="product_template_action_website"');
    expect(controller).toContain("('public_categ_ids', 'child_of'");

    const api = yaml('api/product-detail.yaml');
    const page = yaml('pages/product-detail.yaml');
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.page.id).toBe(api.page.id);
    expect(page.components.find((component: any) => component.source === 'ecommerce_product_categories')).toMatchObject({
      type: 'ListView', create_action: 'create_ecommerce_product_category',
    });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_categories')).toMatchObject({ permission: 'ecommerce.read' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_category_options')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'create_ecommerce_product_category')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.categories.assign' });
    expect(action(api, 'edit_ecommerce_product_category')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.categories.update' });
    expect(action(api, 'delete_ecommerce_product_category')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.categories.remove' });
    expect(action(api, 'edit_ecommerce_product_category').mutation.concurrency).toMatchObject({ required: true });
    expect(action(api, 'create_ecommerce_product_category').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_CATEGORY_EXISTS', status: 409 }),
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_CATEGORY_CATEGORY_INVALID', status: 422 }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('seeds, creates, edits, scopes, removes, and replays product categories', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_category_assignments_test', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const assignments = api.datasources.find((source: any) => source.id === 'ecommerce_product_categories');
    const options = api.datasources.find((source: any) => source.id === 'ecommerce_product_category_options');
    const mug = (await repository.querySource(assignments, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data;
    expect(mug.map((row: any) => row.category_name)).toEqual(['Accessories', 'Office']);
    expect((await repository.querySource(assignments, { id: 'ecommerce-product-mug', company_name: 'Other Company' }, 0, 20)).data).toEqual([]);
    expect((await repository.querySource(options, { product_id: 'ecommerce-product-mug' }, 0, 20)).data.map((row: any) => row.label)).toEqual(['All']);

    const create = action(api, 'create_ecommerce_product_category');
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values: { product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-office', sequence: 10 } }))
      .rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_CATEGORY_PRODUCT_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-legacy', sequence: 10 } }))
      .rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_CATEGORY_CATEGORY_INVALID' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { product_id: 'ecommerce-product-mug', category_id: 'ecommerce-category-accessories', sequence: 10 } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_CATEGORY_EXISTS' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-office', sequence: 30 } }) as any;
    expect(created).toMatchObject({ product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-office', sequence: 30, row_version: 1 });

    const edit = action(api, 'edit_ecommerce_product_category');
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 1, current_company_name: 'My Company', values: { sequence: 5 } }) as any;
    expect(updated).toMatchObject({ id: created.id, sequence: 5, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 1, current_company_name: 'My Company', values: { sequence: 4 } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 2, current_company_name: 'Other Company', values: { sequence: 4 } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_CATEGORY_PRODUCT_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 2, current_company_name: 'My Company', values: { sequence: -1 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_CATEGORY_SEQUENCE_INVALID' });

    const remove = action(api, 'delete_ecommerce_product_category');
    await expect(repository.executeMutation(remove.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 1, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, product_id: created.product_id, expected_row_version: 2, current_company_name: 'My Company' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_category_assignments WHERE id = ?', [created.id])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('preserves product category assignments across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-category-assignments-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_category_assignments_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const create = action(yaml('api/product-detail.yaml'), 'create_ecommerce_product_category');
      const created = await firstRepository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-accessories', sequence: 12 } }) as any;
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT product_id, category_id, sequence, row_version FROM ecommerce_product_category_assignments WHERE id = ?', [created.id]))
        .toEqual([{ product_id: 'ecommerce-product-setup', category_id: 'ecommerce-category-accessories', sequence: 12, row_version: 1 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
