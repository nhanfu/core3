import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('POS Product Categories list and form parity', () => {
  test('keeps the Odoo menu and page/API joins separate', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/product-categories', label: 'PoS Product Categories', permission: 'pos.read' }));

    const listPage = yaml('pages/pos-product-categories.yaml');
    const listApi = yaml('api/pos-product-categories.yaml');
    const detailPage = yaml('pages/pos-product-category-detail.yaml');
    const detailApi = yaml('api/pos-product-category-detail.yaml');
    const newPage = yaml('pages/pos-product-category-new.yaml');
    const newApi = yaml('api/pos-product-category-new.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(detailPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('pos-product-categories')).toContain('pos_product_categories');
    expect(discovered.pageDatasources.get('pos-product-category-detail')).toContain('pos_product_category_detail');
    expect(discovered.pageDatasources.get('pos-product-category-new')).toContain('pos_product_category_new');
  });

  test('matches the POS Product Categories list and Odoo form contract', () => {
    const list = yaml('pages/pos-product-categories.yaml').components[0];
    expect(list).toMatchObject({
      type: 'ListView',
      source: 'pos_product_categories',
      responsive_card: true,
      create_action: 'new_pos_product_category',
      row_open_action: 'view_pos_product_category',
      row_double_click_action: 'view_pos_product_category',
    });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Category', 'Parent Category', 'Sequence', 'Color', 'Active']);
    expect(list.empty_state).toEqual({ title: 'Define a new category', description: 'Categories are used to browse your products through the touchscreen interface.' });
    expect(action('api/pos-product-categories.yaml', 'view_pos_product_category')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/product-category-detail', params: { id: '{row.id}' },
    });

    const detail = yaml('pages/pos-product-category-detail.yaml').components[0];
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'pos_product_category_detail', title_field: 'name', editable: true });
    expect(detail.stat_buttons).toEqual([expect.objectContaining({ id: 'open_pos_category_products', label: 'Products', value_field: 'product_count' })]);
    expect(detail.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['PoS Product Category', 'Parent Category', 'Sequence', 'Color', 'Active', 'Products']);
    expect(detail.header_actions.map((header: any) => header.id)).toEqual(['back_to_pos_product_categories', 'new_pos_product_category', 'edit_pos_product_category', 'delete_pos_product_category']);

    const newForm = yaml('pages/pos-product-category-new.yaml').components[0];
    expect(newForm).toMatchObject({ type: 'OdooFormView', source: 'pos_product_category_new', initial_editing: true });
    expect(newForm.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['PoS Product Category', 'Parent Category', 'Sequence', 'Color', 'Active']);
  });

  test('seeds deterministic categories, product counts, search, empty, and missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_categories_detail_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-product-categories.yaml').datasources.find((source: any) => source.id === 'pos_product_categories');
    const detailSource = yaml('api/pos-product-category-detail.yaml').datasources[0];
    expect((await repository.querySource(listSource, { q: null, active: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(listSource, { q: 'Drink', active: null }, 0, 50)).data).toMatchObject([
      { id: 'pos-cat-drinks', product_count: 2 },
      { id: 'pos-cat-coffee', product_count: 0 },
    ]);
    expect((await repository.querySource(listSource, { q: null, active: true }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(detailSource, { id: 'pos-cat-drinks', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Drinks', parent_category: null, product_count: 2, row_version: 1 });
    expect((await repository.querySource(listSource, { q: 'does-not-exist', active: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detailSource, { id: 'missing-category', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(listSource.error_states).toBeUndefined();
    expect(detailSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_PRODUCT_CATEGORY_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces permissioned CRUD, validation, stale, duplicate, in-use, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_categories_crud_migrations', ['schema', 'data']);
    const create = action('api/pos-product-category-new.yaml', 'create_pos_product_category');
    const edit = action('api/pos-product-category-detail.yaml', 'edit_pos_product_category');
    const remove = action('api/pos-product-category-detail.yaml', 'delete_pos_product_category');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'insert', handler: 'yaml_mutation' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(remove).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete', handler: 'yaml_mutation' });

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Breakfast', parent_category: 'Food', sequence: 15, color: 'Yellow', active: true } });
    expect(created).toMatchObject({ name: 'Breakfast', parent_category: 'Food', sequence: 15, color: 'Yellow', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'breakfast' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_CATEGORY_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_CATEGORY_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Self', parent_category: 'Self' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_CATEGORY_SELF_PARENT' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Breakfast Menu', parent_category: 'Food', sequence: 16, color: 'Orange', active: true } });
    expect(edited).toMatchObject({ id: created.id, name: 'Breakfast Menu', sequence: 16, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'drinks' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_CATEGORY_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-category', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'POS_PRODUCT_CATEGORY_NOT_FOUND' });

    await expect(repository.executeMutation(remove.mutation, { id: 'pos-cat-drinks', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_CATEGORY_IN_USE' });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'POS_PRODUCT_CATEGORY_NOT_FOUND' });
    database.close();
  });
});
