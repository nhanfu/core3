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

describe('POS Product Tags list and form parity', () => {
  test('keeps the installed Odoo menu and page/API joins', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/product-tags', label: 'Product Tags', permission: 'pos.read' }));

    const listPage = yaml('pages/pos-product-tags.yaml');
    const listApi = yaml('api/pos-product-tags.yaml');
    const detailPage = yaml('pages/pos-product-tag-detail.yaml');
    const detailApi = yaml('api/pos-product-tag-detail.yaml');
    const newPage = yaml('pages/pos-product-tag-new.yaml');
    const newApi = yaml('api/pos-product-tag-new.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(detailPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('pos-product-tags')).toContain('pos_product_tags');
    expect(discovered.pageDatasources.get('pos-product-tag-detail')).toContain('pos_product_tag_detail');
    expect(discovered.pageDatasources.get('pos-product-tag-new')).toContain('pos_product_tag_new');
  });

  test('matches Odoo Product Tags list and Tag form labels', () => {
    const list = yaml('pages/pos-product-tags.yaml').components[0];
    expect(list).toMatchObject({
      type: 'ListView',
      source: 'pos_product_tags',
      create_action: 'new_pos_product_tag',
      row_open_action: 'view_pos_product_tag',
      row_double_click_action: 'view_pos_product_tag',
    });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Visible to customers?', 'Product Templates', 'Product Variant']);
    expect(list.empty_state).toEqual({ title: 'Define a new tag', description: 'Tags are used to search product for a given theme.' });

    expect(action('api/pos-product-tags.yaml', 'view_pos_product_tag')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/product-tag-detail', params: { id: '{row.id}' },
    });
    expect(action('api/pos-product-tags.yaml', 'new_pos_product_tag')).toMatchObject({
      permission: 'pos.write', navigate_to: '/point-of-sale/product-tags/new',
    });

    const form = yaml('pages/pos-product-tag-detail.yaml').components[0];
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'pos_product_tag_detail', title_field: 'name', editable: true });
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Tag', 'Visible to customers?', 'Color', 'Description', 'Product Templates', 'Product Variant']);
    expect(form.header_actions.map((header: any) => header.id)).toEqual(['back_to_pos_product_tags', 'edit_pos_product_tag', 'delete_pos_product_tag']);

    const newForm = yaml('pages/pos-product-tag-new.yaml').components[0];
    expect(newForm).toMatchObject({ type: 'OdooFormView', source: 'pos_product_tag_new', initial_editing: true });
    expect(newForm.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Tag', 'Visible to customers?', 'Color', 'Description']);
  });

  test('seeds deterministic rows and supports search, empty, detail, and transport contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_tags_detail_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-product-tags.yaml').datasources.find((source: any) => source.id === 'pos_product_tags');
    const detailSource = yaml('api/pos-product-tag-detail.yaml').datasources[0];
    expect((await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(listSource, { q: 'Best Seller', fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'pos-tag-best-seller', product_templates: 12, product_variants: 12 }]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'pos-tag-new', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'New', visible_to_customers: true, description: 'Recently added products.', row_version: 1 } });
    expect((await repository.querySource(detailSource, { id: 'missing-tag', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_PRODUCT_TAGS_UNAVAILABLE' });
    expect(detailSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_PRODUCT_TAG_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces CRUD, validation, stale, duplicate, missing, and permission guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_tags_crud_migrations', ['schema', 'data']);
    const create = action('api/pos-product-tag-new.yaml', 'create_pos_product_tag');
    const edit = action('api/pos-product-tag-detail.yaml', 'edit_pos_product_tag');
    const remove = action('api/pos-product-tag-detail.yaml', 'delete_pos_product_tag');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.write', operation: 'insert', handler: 'yaml_mutation' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'pos.write', operation: 'update', handler: 'yaml_mutation' });
    expect(remove).toMatchObject({ type: 'server', permission: 'pos.write', operation: 'delete', handler: 'yaml_mutation' });

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Breakfast', visible_to_customers: true, color: 'Yellow', description: 'Morning menu' } });
    expect(created).toMatchObject({ name: 'Breakfast', visible_to_customers: true, color: 'Yellow', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'breakfast' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_TAG_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRODUCT_TAG_NAME_REQUIRED' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Morning Menu', visible_to_customers: false, color: 'Blue', description: 'Updated' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Morning Menu', visible_to_customers: false, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'New' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRODUCT_TAG_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-tag', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'POS_PRODUCT_TAG_NOT_FOUND' });

    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'POS_PRODUCT_TAG_NOT_FOUND' });
    database.close();
  });
});
