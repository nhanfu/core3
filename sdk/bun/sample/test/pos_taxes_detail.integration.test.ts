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

describe('POS Taxes list, form, and permission parity', () => {
  test('joins page and API fragments and preserves the configuration menu contract', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/taxes', label: 'Taxes', permission: 'pos.read' }));

    const listPage = yaml('pages/pos-taxes.yaml');
    const listApi = yaml('api/pos-taxes.yaml');
    const detailPage = yaml('pages/pos-tax-detail.yaml');
    const detailApi = yaml('api/pos-tax-detail.yaml');
    const newPage = yaml('pages/pos-tax-new.yaml');
    const newApi = yaml('api/pos-tax-new.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(detailPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('pos-taxes')).toContain('pos_taxes');
    expect(discovered.pageDatasources.get('pos-tax-detail')).toContain('pos_tax_detail');
    expect(discovered.pageDatasources.get('pos-tax-new')).toContain('pos_tax_new');
  });

  test('matches Odoo Taxes list, kanban, and form labels', () => {
    const list = yaml('pages/pos-taxes.yaml').components[0];
    expect(list).toMatchObject({ type: 'ListView', source: 'pos_taxes', create_action: 'new_pos_tax', row_open_action: 'view_pos_tax', row_double_click_action: 'view_pos_tax', default_filters: { active: 'true' } });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Tax Name', 'Description', 'Tax Type', 'Tax Scope', 'Label on Invoices', 'Company', 'Active']);
    expect(list.empty_state).toEqual({ title: 'Create a new tax', description: 'Define the taxes used on Point of Sale products and orders.' });
    expect(action('api/pos-taxes.yaml', 'view_pos_tax')).toMatchObject({ permission: 'pos.read', navigate_to: '/point-of-sale/tax-detail', params: { id: '{row.id}' } });
    expect(action('api/pos-taxes.yaml', 'new_pos_tax')).toMatchObject({ permission: 'pos.manage', navigate_to: '/point-of-sale/taxes/new' });

    const form = yaml('pages/pos-tax-detail.yaml').components[0];
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'pos_tax_detail', title_field: 'name', editable: true });
    expect(form.header_actions.map((header: any) => header.id)).toEqual(['back_to_pos_taxes', 'edit_pos_tax', 'archive_pos_tax', 'unarchive_pos_tax', 'duplicate_pos_tax', 'delete_pos_tax']);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Definition', 'Advanced Options']);
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(['Tax Name', 'Tax Computation?', 'Active?', 'Tax Type?', 'Tax Scope', 'Amount', 'Fiscal Position', 'Domestic', 'Replaces?']);
    expect(yaml('pages/pos-tax-new.yaml').components[0]).toMatchObject({ type: 'OdooFormView', source: 'pos_tax_new', initial_editing: true });
  });

  test('seeds fixed Odoo-shaped records and covers search, empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_taxes_detail_read_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-taxes.yaml').datasources.find((source: any) => source.id === 'pos_taxes');
    const detailSource = yaml('api/pos-tax-detail.yaml').datasources[0];
    expect((await repository.querySource(listSource, { q: null, tax_scope: null, active: null, fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(listSource, { q: 'Exports', tax_scope: null, active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'pos-tax-export-zero', tax_use: 'Sales', amount: 0 }]);
    expect((await repository.querySource(listSource, { q: null, tax_scope: null, active: false, fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'pos-tax-archived-demo', active: false }]);
    expect((await repository.querySource(listSource, { q: null, tax_scope: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detailSource, { id: 'pos-tax-sale-15', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: '15%', amount: 15, tax_use: 'Sales', row_version: 1 } });
    expect((await repository.querySource(detailSource, { id: 'missing-tax', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_TAXES_UNAVAILABLE' });
    expect(detailSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_TAX_DETAIL_UNAVAILABLE' });
    expect(yaml('api/pos-tax-new.yaml').datasources[0].error_states.transport_error.code).toBe('POS_TAX_NEW_UNAVAILABLE');
    database.close();
  });

  test('enforces manager-only create/update/archive/delete/duplicate with validation and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_taxes_detail_crud_migrations', ['schema', 'data']);
    const create = action('api/pos-tax-new.yaml', 'create_pos_tax');
    const edit = action('api/pos-tax-detail.yaml', 'edit_pos_tax');
    const archive = action('api/pos-tax-detail.yaml', 'archive_pos_tax');
    const duplicate = action('api/pos-tax-detail.yaml', 'duplicate_pos_tax');
    const remove = action('api/pos-tax-detail.yaml', 'delete_pos_tax');
    for (const candidate of [create, edit, archive, duplicate, remove]) expect(candidate.permission).toBe('pos.manage');
    expect(action('api/pos-taxes.yaml', 'view_pos_tax').permission).toBe('pos.read');

    const created = await repository.executeMutation(create.mutation, { id: 'pos-tax-created', values: { name: 'Seasonal 8%', description: 'Seasonal sales tax', tax_type: 'Percentage', tax_scope: 'Sale', amount: 8, invoice_label: '8%' } });
    expect(created).toMatchObject({ id: 'pos-tax-created', name: 'Seasonal 8%', amount: 8, row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { id: 'pos-tax-invalid-name', values: { name: '   ', tax_type: 'Percentage', tax_scope: 'Sale' } })).rejects.toMatchObject({ status: 422, code: 'POS_TAX_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { id: 'pos-tax-duplicate', values: { name: '15%', tax_type: 'Percentage', tax_scope: 'Sale' } })).rejects.toMatchObject({ status: 409, code: 'POS_TAX_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'pos-tax-too-high', values: { name: 'Too high', tax_type: 'Percentage', tax_scope: 'Sale', amount: 101 } })).rejects.toMatchObject({ status: 422, code: 'POS_TAX_AMOUNT_INVALID' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Seasonal 9%', tax_type: 'Percentage', tax_scope: 'Sale', amount: 9 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Seasonal 9%', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', tax_type: 'Percentage', tax_scope: 'Sale', amount: 9 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3, values: { active: false } })).rejects.toMatchObject({ status: 409 });
    const restored = await repository.executeMutation(action('api/pos-tax-detail.yaml', 'unarchive_pos_tax').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });

    const copied = await repository.executeMutation(duplicate.mutation, { source_id: created.id, expected_row_version: 4, values: { name: 'Seasonal 9% Copy', tax_type: 'Percentage', tax_scope: 'Sale', amount: 9 } });
    expect(copied).toMatchObject({ name: 'Seasonal 9% Copy', row_version: 1, active: true });
    await expect(repository.executeMutation(duplicate.mutation, { source_id: created.id, expected_row_version: 3, values: { name: 'Stale copy', tax_type: 'Percentage', tax_scope: 'Sale', amount: 9 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'POS_TAX_NOT_FOUND' });
    database.close();
  });
});
