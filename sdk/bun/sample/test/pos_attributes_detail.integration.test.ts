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

describe('POS Attributes list and form parity', () => {
  test('matches Odoo action 234 modes, menu, and page/API joins', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/attributes', label: 'Attributes', permission: 'pos.read' }));

    const listPage = yaml('pages/pos-attributes.yaml');
    const listApi = yaml('api/pos-attributes.yaml');
    const detailPage = yaml('pages/pos-attribute-detail.yaml');
    const detailApi = yaml('api/pos-attribute-detail.yaml');
    const newPage = yaml('pages/pos-attribute-new.yaml');
    const newApi = yaml('api/pos-attribute-new.yaml');
    expect(listPage.page).toMatchObject({ id: 'pos-attributes', route: '/point-of-sale/attributes', auth: { require: ['pos.read'] } });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(detailPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('pos-attributes')).toContain('pos_attributes');
    expect(discovered.pageDatasources.get('pos-attribute-detail')).toEqual(expect.arrayContaining(['pos_attribute_detail', 'pos_attribute_values']));
    expect(discovered.pageDatasources.get('pos-attribute-new')).toContain('pos_attribute_new');
    expect(action('api/pos-attributes.yaml', 'view_pos_attribute')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/attribute-detail', params: { id: '{row.id}' },
    });
    expect(action('api/pos-attributes.yaml', 'new_pos_attribute')).toMatchObject({ permission: 'pos.manage', navigate_to: '/point-of-sale/attributes/new' });
  });

  test('matches the Odoo list/form labels and x2many contract', () => {
    const list = yaml('pages/pos-attributes.yaml').components[0];
    expect(list).toMatchObject({
      type: 'ListView', source: 'pos_attributes', create_action: 'new_pos_attribute',
      row_open_action: 'view_pos_attribute', row_double_click_action: 'view_pos_attribute', responsive_card: true,
    });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Attribute', 'Display Type', 'Variant Creation']);
    expect(list.empty_state).toEqual({ title: 'No attributes', description: 'Create an attribute to add variants to your products.' });

    const form = yaml('pages/pos-attribute-detail.yaml').components[0];
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'pos_attribute_detail', title_field: 'name', editable: true });
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Attribute Name', 'Display Type?', 'Variant Creation?']);
    expect(form.header_actions.map((header: any) => header.id)).toEqual(['back_to_pos_attributes', 'new_pos_attribute_detail', 'edit_pos_attribute', 'delete_pos_attribute']);

    const values = yaml('pages/pos-attribute-detail.yaml').components[1];
    expect(values).toMatchObject({ type: 'LineItemGrid', source: 'pos_attribute_values', parent_source: 'pos_attribute_detail', variant: 'odoo_x2many' });
    expect(values.actions).toContainEqual(expect.objectContaining({ id: 'add_pos_attribute_value', label: 'Add a line', permission: 'pos.manage' }));
    expect(values.children.filter((child: any) => child.type === 'LineItemField').map((field: any) => field.label)).toEqual(['Value', 'Free text', 'Default Extra Price']);
    expect(yaml('pages/pos-attribute-new.yaml').components[0]).toMatchObject({ type: 'OdooFormView', source: 'pos_attribute_new', initial_editing: true });
    expect(form.groups[0].fields[1].options).toEqual(['Radio', 'Pills', 'Select', 'Color', 'Multi-checkbox', 'Image']);
    expect(form.groups[0].fields[2].options).toEqual(['Instantly', 'Dynamically', 'Never']);
  });

  test('seeds deterministic Odoo-shaped rows and covers default/search/empty/error/missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_attributes_detail_states_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-attributes.yaml').datasources[0];
    const detailSource = yaml('api/pos-attribute-detail.yaml').datasources[0];
    const valuesSource = yaml('api/pos-attribute-detail.yaml').datasources[1];
    const newSource = yaml('api/pos-attribute-new.yaml').datasources[0];
    const rows = (await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50)).data;
    expect(rows).toHaveLength(13);
    expect(rows.map((row: any) => row.name)).toEqual(['Brand', 'Size', 'Shoes size', 'Color', 'Height', 'Length', 'Duration', 'Extras', 'Fabric', 'Legs', 'Sides', 'Options', 'Customization']);
    expect((await repository.querySource(listSource, { q: 'Shoes', fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'pos-attr-shoes-size', name: 'Shoes size' })]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'pos-attr-size', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Size', display_type: 'Pills', variant_creation: 'Instantly', values_count: 9, row_version: 1 } });
    expect((await repository.querySource(valuesSource, { id: 'pos-attr-size', fixture_state: null }, 0, 50)).data).toHaveLength(9);
    expect((await repository.querySource(valuesSource, { id: 'pos-attr-size', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detailSource, { id: 'missing-attribute', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_ATTRIBUTES_UNAVAILABLE' });
    expect(detailSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_ATTRIBUTE_DETAIL_UNAVAILABLE' });
    expect(valuesSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_ATTRIBUTE_VALUES_UNAVAILABLE' });
    expect(await repository.querySource(newSource, {}, 0, 1)).toMatchObject({ data: { id: null, name: '', display_type: 'Radio', variant_creation: 'Instantly', values_count: 0 } });
    database.close();
  });

  test('enforces permissioned attribute/value CRUD, validation, stale, duplicate, in-use, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_attributes_detail_crud_migrations', ['schema', 'data']);
    const create = action('api/pos-attribute-new.yaml', 'create_pos_attribute');
    const edit = action('api/pos-attribute-detail.yaml', 'edit_pos_attribute');
    const remove = action('api/pos-attribute-detail.yaml', 'delete_pos_attribute');
    const addValue = action('api/pos-attribute-detail.yaml', 'add_pos_attribute_value');
    const editValue = action('api/pos-attribute-detail.yaml', 'edit_pos_attribute_value');
    const removeValue = action('api/pos-attribute-detail.yaml', 'delete_pos_attribute_value');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'insert', handler: 'yaml_mutation' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(remove).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete', handler: 'yaml_mutation' });
    expect(addValue).toMatchObject({ type: 'server_form', permission: 'pos.manage', handler: 'line_item' });
    expect(editValue).toMatchObject({ type: 'server_form', permission: 'pos.manage', handler: 'line_item' });
    expect(removeValue).toMatchObject({ type: 'server', permission: 'pos.manage', handler: 'line_item' });

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Temperature', display_type: 'Pills', variant_creation: 'Dynamically' } });
    expect(created).toMatchObject({ name: 'Temperature', display_type: 'Pills', variant_creation: 'Dynamically', row_version: 1, values_count: 0 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'temperature', display_type: 'Radio', variant_creation: 'Never' } })).rejects.toMatchObject({ status: 409, code: 'POS_ATTRIBUTE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ', display_type: 'Radio', variant_creation: 'Never' } })).rejects.toMatchObject({ status: 422, code: 'POS_ATTRIBUTE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Material', display_type: 'Bad', variant_creation: 'Never' } })).rejects.toMatchObject({ status: 422, code: 'POS_ATTRIBUTE_DISPLAY_TYPE_INVALID' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Temperature Scale', display_type: 'Radio', variant_creation: 'Never' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Temperature Scale', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', display_type: 'Radio', variant_creation: 'Never' } })).rejects.toMatchObject({ status: 409 });

    const added = await repository.executeMutation(addValue.mutation, { id: created.id, parent_expected_row_version: 2, values: { name: 'Warm', is_custom: false, default_extra_price: 1.25 } });
    expect(added).toMatchObject({ attribute_id: created.id, name: 'Warm', default_extra_price: 1.25, row_version: 1 });
    await expect(repository.executeMutation(addValue.mutation, { id: created.id, parent_expected_row_version: 3, values: { name: 'warm', is_custom: false, default_extra_price: 0 } })).rejects.toMatchObject({ status: 409, code: 'POS_ATTRIBUTE_VALUE_EXISTS' });
    await expect(repository.executeMutation(addValue.mutation, { id: created.id, parent_expected_row_version: 3, values: { name: '   ', is_custom: false, default_extra_price: 0 } })).rejects.toMatchObject({ status: 422, code: 'POS_ATTRIBUTE_VALUE_INVALID' });
    const editedValue = await repository.executeMutation(editValue.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 3, expected_row_version: 1, values: { name: 'Hot', is_custom: true, default_extra_price: 2.5 } });
    expect(editedValue).toMatchObject({ id: added.id, name: 'Hot', is_custom: true, row_version: 2 });
    await expect(repository.executeMutation(editValue.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 1, values: { name: 'Stale', is_custom: false, default_extra_price: 0 } })).rejects.toMatchObject({ status: 409, code: 'POS_ATTRIBUTE_VALUE_STALE' });
    await repository.executeMutation(removeValue.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 2 });
    await expect(repository.executeMutation(removeValue.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 5, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'POS_ATTRIBUTE_VALUE_STALE' });
    await expect(repository.executeMutation(remove.mutation, { id: 'pos-attr-size', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'POS_ATTRIBUTE_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 })).rejects.toMatchObject({ status: 404, code: 'POS_ATTRIBUTE_NOT_FOUND' });
    database.close();
  });
});
