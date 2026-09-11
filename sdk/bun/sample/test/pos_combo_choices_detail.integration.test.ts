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

describe('POS Combo Choices detail and form parity', () => {
  test('keeps list/detail/new page and API contracts joined by page id', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/combo-choices', label: 'Combo Choices', permission: 'pos.read' }));
    const listPage = yaml('pages/pos-combo-choices.yaml');
    const listApi = yaml('api/pos-combo-choices.yaml');
    const detailPage = yaml('pages/pos-combo-choice-detail.yaml');
    const detailApi = yaml('api/pos-combo-choice-detail.yaml');
    const newPage = yaml('pages/pos-combo-choice-new.yaml');
    const newApi = yaml('api/pos-combo-choice-new.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(detailPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('pos-combo-choices')).toContain('pos_combo_choices');
    expect(discovered.pageDatasources.get('pos-combo-choice-detail')).toEqual(expect.arrayContaining(['pos_combo_choice_detail', 'pos_combo_choice_items']));
    expect(discovered.pageDatasources.get('pos-combo-choice-new')).toContain('pos_combo_choice_new');
  });

  test('matches the Odoo list, detail fields, options grid, and New form', () => {
    const list = yaml('pages/pos-combo-choices.yaml').components[0];
    expect(list).toMatchObject({ type: 'ListView', source: 'pos_combo_choices', create_action: 'new_pos_combo_choice', row_open_action: 'view_pos_combo_choice', row_double_click_action: 'view_pos_combo_choice' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Combo Price', 'Product Count']);
    expect(action('api/pos-combo-choices.yaml', 'view_pos_combo_choice')).toMatchObject({ permission: 'pos.read', navigate_to: '/point-of-sale/combo-choice-detail', params: { id: '{row.id}' } });
    const detail = yaml('pages/pos-combo-choice-detail.yaml');
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'pos_combo_choice_detail', title_field: 'name', editable: true });
    expect(detail.components[0].groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Combo Choice', 'Maximum items?', 'Includes items?', 'Combo Price?', 'Company']);
    expect(detail.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'pos_combo_choice_items', parent_source: 'pos_combo_choice_detail' });
    expect(detail.components[1].columns.map((column: any) => column.label)).toEqual(['Options', 'Original Price', 'Extra Price', '']);
    const newForm = yaml('pages/pos-combo-choice-new.yaml').components[0];
    expect(newForm).toMatchObject({ type: 'OdooFormView', source: 'pos_combo_choice_new', initial_editing: true });
    expect(newForm.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Combo Choice', 'Maximum items?', 'Includes items?', 'Combo Price?', 'Company']);
  });

  test('seeds the Odoo-shaped catalog, detail projection, options, and states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_combo_choice_detail_states', ['schema', 'data']);
    const listSource = yaml('api/pos-combo-choices.yaml').datasources[0];
    const detailSource = yaml('api/pos-combo-choice-detail.yaml').datasources[0];
    const itemSource = yaml('api/pos-combo-choice-detail.yaml').datasources[1];
    expect((await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50)).data).toHaveLength(8);
    expect((await repository.querySource(listSource, { q: 'Desk Accessories', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Desk Accessories Combo', combo_price: 1.98, combo_item_count: 3 }]);
    expect((await repository.querySource(listSource, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detailSource, { id: 'pos-combo-oat-milk', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Desk Accessories Combo', maximum_items: 1, included_items: 1, combo_price: 1.98, company: 'Visible to all', row_version: 1 });
    expect((await repository.querySource(itemSource, { id: 'pos-combo-oat-milk', fixture_state: null }, 0, 50)).data).toMatchObject([{ product: '[FURN_0001] Desk Organizer', original_price: 5.1, extra_price: 0 }, { product: '[FURN_0002] Desk Pad' }, { product: '[FURN_0006] Monitor Stand', extra_price: 2 }]);
    expect((await repository.querySource(detailSource, { id: 'missing-combo', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(detailSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_COMBO_CHOICE_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces permissioned parent and option CRUD, validation, duplicate, in-use, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_combo_choice_detail_mutations', ['schema', 'data']);
    const create = action('api/pos-combo-choice-new.yaml', 'create_pos_combo_choice');
    const edit = action('api/pos-combo-choice-detail.yaml', 'edit_pos_combo_choice');
    const remove = action('api/pos-combo-choice-detail.yaml', 'delete_pos_combo_choice');
    const add = action('api/pos-combo-choice-detail.yaml', 'add_pos_combo_choice_item');
    const editItem = action('api/pos-combo-choice-detail.yaml', 'edit_pos_combo_choice_item');
    const removeItem = action('api/pos-combo-choice-detail.yaml', 'delete_pos_combo_choice_item');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'insert', handler: 'yaml_mutation' });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(add).toMatchObject({ type: 'server_form', permission: 'pos.manage', handler: 'line_item' });
    expect(removeItem).toMatchObject({ type: 'server', permission: 'pos.manage', handler: 'line_item' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Breakfast Combo', maximum_items: 2, included_items: 1, combo_price: 12.5, company: 'Visible to all', active: true } });
    expect(created).toMatchObject({ name: 'Breakfast Combo', maximum_items: 2, included_items: 1, combo_price: 12.5, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'breakfast combo', maximum_items: 2, included_items: 1, combo_price: 12.5 } })).rejects.toMatchObject({ status: 409, code: 'POS_COMBO_CHOICE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_COMBO_CHOICE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Combo', maximum_items: 1, included_items: 2, combo_price: 1 } })).rejects.toMatchObject({ status: 422, code: 'POS_COMBO_CHOICE_VALUES_INVALID' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Breakfast Menu', maximum_items: 3, included_items: 2, combo_price: 15, company: 'Visible to all', active: true } });
    expect(edited).toMatchObject({ id: created.id, name: 'Breakfast Menu', maximum_items: 3, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', maximum_items: 2, included_items: 1, combo_price: 12.5 } })).rejects.toMatchObject({ status: 409 });
    const added = await repository.executeMutation(add.mutation, { id: created.id, parent_expected_row_version: 2, values: { product: '[FURN_0001] Desk Organizer', original_price: 5.1, extra_price: 0 } });
    expect(added).toMatchObject({ combo_choice_id: created.id, product: '[FURN_0001] Desk Organizer', row_version: 1 });
    await expect(repository.executeMutation(add.mutation, { id: created.id, parent_expected_row_version: 3, values: { product: '[FURN_0001] Desk Organizer', original_price: 5, extra_price: 1 } })).rejects.toMatchObject({ status: 409, code: 'POS_COMBO_CHOICE_ITEM_EXISTS' });
    const updatedItem = await repository.executeMutation(editItem.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 3, expected_row_version: 1, values: { product: '[FURN_0001] Desk Organizer', original_price: 5.25, extra_price: 0.5 } });
    expect(updatedItem).toMatchObject({ id: added.id, original_price: 5.25, extra_price: 0.5, row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'POS_COMBO_CHOICE_IN_USE' });
    await expect(repository.executeMutation(removeItem.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'POS_COMBO_CHOICE_ITEM_STALE' });
    await repository.executeMutation(removeItem.mutation, { id: created.id, line_id: added.id, parent_expected_row_version: 4, expected_row_version: 2 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 })).rejects.toMatchObject({ status: 404, code: 'POS_COMBO_CHOICE_NOT_FOUND' });
    database.close();
  });
});
