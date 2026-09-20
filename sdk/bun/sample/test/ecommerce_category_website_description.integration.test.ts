import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce category website description parity', () => {
  test('traces the Odoo category menu/form/template and keeps detail page/API YAML separate', () => {
    const categoryModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_public_category.py', 'utf8');
    const categoryView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_public_category_views.xml', 'utf8');
    const menus = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const page = yaml('pages/category-detail.yaml');
    const api = yaml('api/category-detail.yaml');

    expect(categoryModel).toContain("_name = 'product.public.category'");
    expect(categoryModel).toContain('website_description = fields.Html');
    expect(categoryView).toContain('name="website_description"');
    expect(menus).toContain('id="menu_catalog_categories"');
    expect(menus).toContain('action="product_public_category_action"');
    expect(templates).toContain('t-field="category.website_description"');
    expect(page.page).toMatchObject({ id: 'ecommerce-category-detail', route: '/ecommerce/categories/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-category-detail' });
    expect(page.datasources).toBeUndefined();
    expect(api.datasources[0].query).toContain('website_description');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_ecommerce_category_website_description' }));
    expect(page.components[0].groups).toContainEqual(expect.objectContaining({ title: 'Website Content' }));
    expect(action(api, 'update_ecommerce_category_website_description')).toMatchObject({ type: 'server_form', permission: 'ecommerce.write', handler: 'yaml_mutation' });
  });

  test('seeds and updates descriptions with company, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_category_website_description_guards', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_category_website_description_guards', ['schema', 'data']);
    const api = yaml('api/category-detail.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'update_ecommerce_category_website_description');

    expect((await repository.querySource(source, { id: 'ecommerce-category-accessories', company_name: 'My Company' }, 0, 1)).data)
      .toMatchObject({ website_description: '<p>Workspace accessories for a more comfortable, organized desk.</p>', row_version: 1 });
    const values = { website_description: '<p>Organize your desk with durable Core3 accessories.</p>' };
    await expect(repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 1, current_company_name: 'Other Company', values,
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_CATEGORY_DESCRIPTION_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 1, current_company_name: 'My Company',
      values: { website_description: '<script>alert(1)</script>' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CATEGORY_DESCRIPTION_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 1, current_company_name: 'My Company',
      values: { website_description: 'x'.repeat(10001) },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_CATEGORY_DESCRIPTION_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 1, current_company_name: 'My Company', values,
    }) as any;
    expect(updated).toMatchObject({ id: 'ecommerce-category-accessories', website_description: values.website_description, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 1, current_company_name: 'My Company', values,
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_CATEGORY_DESCRIPTION_STALE' });
    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'ecommerce-category-accessories', expected_row_version: 2, current_company_name: 'My Company', values: { website_description: '' },
    }) as any;
    expect(cleared).toMatchObject({ website_description: null, row_version: 3 });
    database.close();
  });

  test('preserves category description and row version across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-category-description-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_category_description_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const api = yaml('api/category-detail.yaml');
    const edit = action(api, 'update_ecommerce_category_website_description');
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(edit.mutation, {
        id: 'ecommerce-category-office', expected_row_version: 1, current_company_name: 'My Company',
        values: { website_description: '<p>Restart-safe category content.</p>' },
      });
      first.close();
      first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT website_description, row_version FROM ecommerce_categories WHERE id = ?', ['ecommerce-category-office']))
        .toEqual([{ website_description: '<p>Restart-safe category content.</p>', row_version: 2 }]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
