import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/pos-tax-detail.yaml').actions.find((candidate: any) => candidate.id === id);

describe('POS tax distribution-line parity', () => {
  test('keeps page and API fragments joined and mirrors the Odoo x2many fields', () => {
    const page = yaml('pages/pos-tax-detail.yaml');
    const api = yaml('api/pos-tax-detail.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components.filter((component: any) => component.type === 'LineItemGrid').map((component: any) => component.source)).toEqual(['pos_tax_invoice_distribution_lines', 'pos_tax_refund_distribution_lines']);
    for (const grid of page.components.filter((component: any) => component.type === 'LineItemGrid')) {
      expect(grid.parent_source).toBe('pos_tax_detail');
      expect(grid.children.filter((child: any) => child.type === 'LineItemField').map((field: any) => field.label)).toEqual(['Sequence', '%', 'Based On', 'Account', 'Tax Grids']);
      expect(grid.actions[0].label).toBe('Add a line');
    }
    expect(action('add_pos_tax_invoice_distribution_line')).toMatchObject({ permission: 'pos.manage', handler: 'line_item', domain: 'pos_tax' });
    expect(action('add_pos_tax_refund_distribution_line')).toMatchObject({ permission: 'pos.manage', handler: 'line_item', domain: 'pos_tax' });
    expect(action('edit_pos_tax_distribution_line')).toMatchObject({ permission: 'pos.manage', handler: 'line_item', operation: 'update' });
    expect(action('delete_pos_tax_distribution_line')).toMatchObject({ permission: 'pos.manage', handler: 'line_item', operation: 'delete' });
  });

  test('seeds populated invoice/refund lines and exposes empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_tax_distribution_read_migrations', ['schema', 'data']);
    const api = yaml('api/pos-tax-detail.yaml');
    const invoice = api.datasources.find((source: any) => source.id === 'pos_tax_invoice_distribution_lines');
    const refund = api.datasources.find((source: any) => source.id === 'pos_tax_refund_distribution_lines');
    expect((await repository.querySource(invoice, { id: 'pos-tax-sale-15', fixture_state: null }, 0, 100)).data).toMatchObject([
      { id: 'pos-tax-sale-15-invoice-base', repartition_type: 'Base', factor_percent: 100 },
      { id: 'pos-tax-sale-15-invoice-tax', repartition_type: 'of tax', account: 'Tax Received' },
    ]);
    expect((await repository.querySource(refund, { id: 'pos-tax-sale-15', fixture_state: null }, 0, 100)).data).toHaveLength(2);
    expect((await repository.querySource(invoice, { id: 'pos-tax-sale-15', fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(invoice, { id: 'missing-tax', fixture_state: 'not_found' }, 0, 100)).data).toEqual([]);
    expect(invoice.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_TAX_INVOICE_DISTRIBUTION_UNAVAILABLE' });
    expect(refund.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_TAX_REFUND_DISTRIBUTION_UNAVAILABLE' });
    database.close();
  });

  test('supports bounded line create/update/delete with permission, validation, stale, and invariant guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_tax_distribution_crud_migrations', ['schema', 'data']);
    const create = action('add_pos_tax_invoice_distribution_line');
    const edit = action('edit_pos_tax_distribution_line');
    const remove = action('delete_pos_tax_distribution_line');
    for (const candidate of [create, edit, remove]) expect(candidate.permission).toBe('pos.manage');

    const parent = (await repository.query('SELECT row_version FROM pos_taxes WHERE id = ?', ['pos-tax-sale-15']))[0];
    const created = await repository.executeMutation(create.mutation, { id: 'pos-tax-sale-15', document_type: 'invoice', parent_expected_row_version: parent.row_version, factor_percent: 25, repartition_type: 'of tax', account: 'Tax Paid', tax_grids: 'Output VAT' });
    expect(created).toMatchObject({ id: 'pos-tax-distribution-pos-tax-sale-15-invoice-2', factor_percent: 25, account: 'Tax Paid', row_version: 1 });

    const current = (await repository.query('SELECT row_version FROM pos_taxes WHERE id = ?', ['pos-tax-sale-15']))[0];
    const edited = await repository.executeMutation(edit.mutation, { id: 'pos-tax-sale-15', line_id: created.id, expected_row_version: 1, parent_expected_row_version: current.row_version, factor_percent: 25, repartition_type: 'of tax', account: 'Tax Received', tax_grids: 'Output VAT' });
    expect(edited).toMatchObject({ id: created.id, account: 'Tax Received', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'pos-tax-sale-15', line_id: created.id, expected_row_version: 1, parent_expected_row_version: current.row_version + 1, factor_percent: 25, repartition_type: 'of tax', account: 'Tax Paid', tax_grids: '' })).rejects.toMatchObject({ status: 409, code: 'POS_TAX_DISTRIBUTION_STALE' });
    const afterEdit = (await repository.query('SELECT row_version FROM pos_taxes WHERE id = ?', ['pos-tax-sale-15']))[0];
    await expect(repository.executeMutation(edit.mutation, { id: 'pos-tax-sale-15', line_id: created.id, expected_row_version: 2, parent_expected_row_version: afterEdit.row_version, factor_percent: 101, repartition_type: 'of tax', account: 'Tax Received', tax_grids: '' })).rejects.toMatchObject({ status: 422, code: 'POS_TAX_DISTRIBUTION_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { id: 'pos-tax-sale-15', line_id: created.id, expected_row_version: 2, parent_expected_row_version: afterEdit.row_version, factor_percent: 50, repartition_type: 'Base', account: 'Tax Received', tax_grids: '' })).rejects.toMatchObject({ status: 422, code: 'POS_TAX_DISTRIBUTION_BASE_INVALID' });
    const beforeDelete = (await repository.query('SELECT row_version FROM pos_taxes WHERE id = ?', ['pos-tax-sale-15']))[0];
    const deleted = await repository.executeMutation(remove.mutation, { id: 'pos-tax-sale-15', line_id: created.id, expected_row_version: 2, parent_expected_row_version: beforeDelete.row_version });
    expect(deleted).toMatchObject({ deleted: true, id: created.id });
    const afterDelete = (await repository.query('SELECT row_version FROM pos_taxes WHERE id = ?', ['pos-tax-sale-15']))[0];
    await expect(repository.executeMutation(remove.mutation, { id: 'pos-tax-sale-15', line_id: 'pos-tax-sale-15-invoice-tax', expected_row_version: 1, parent_expected_row_version: afterDelete.row_version })).rejects.toMatchObject({ status: 409, code: 'POS_TAX_DISTRIBUTION_REQUIRED' });
    database.close();
  });
});
