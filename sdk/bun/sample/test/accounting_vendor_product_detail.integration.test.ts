import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const detailApi = () => yaml('api/vendor-product-detail.yaml');
const action = (id: string) => detailApi().actions.find((candidate: any) => candidate.id === id);
const migrate = async (name: string) => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
};

describe('Accounting Vendor Product detail Odoo parity', () => {
  test('joins detail layout/API by page id and opens from the vendor product action', () => {
    const list = yaml('pages/vendor-products.yaml');
    const page = yaml('pages/vendor-product-detail.yaml');
    const detail = page.components[0];
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'accounting-vendor-product-detail', route: '/accounting/vendor-product-detail' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'accounting_vendor_product_detail', title_field: 'name', subtitle_field: 'default_code', editable: true });
    expect(detail.notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Attributes & Variants', 'Sales', 'Purchase', 'Inventory']);
    expect(detail.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining(['Product Type', 'Sales Price', 'Sales Taxes', 'Cost', 'Purchase Taxes', 'Reference', 'Barcode', 'Company']));
    expect(detail.groups.at(-1).title).toBe('Internal Notes');
    expect(detailApi().page.id).toBe(page.page.id);
    expect(detailApi().datasources[0]).toMatchObject({ id: 'accounting_vendor_product_detail', single: true, permission: 'accounting.read' });
    expect(detailApi().datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_VENDOR_PRODUCT_DETAIL_UNAVAILABLE' });
    expect(list.components[0]).toMatchObject({ row_open_action: 'view_accounting_vendor_product', form_view: { page: 'apps/services/accounting/pages/vendor-product-detail.yaml' } });
    expect(yaml('api/vendor-products.yaml').actions).toContainEqual(expect.objectContaining({ id: 'view_accounting_vendor_product', permission: 'accounting.read', navigate_to: '/accounting/vendor-product-detail', params: { id: '{row.id}' } }));
    expect(discovered.pageDatasources.get(page.page.id)).toContain('accounting_vendor_product_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/vendor-product-detail', page: page.page.id, module: 'accounting' })]));
  });

  test('serves deterministic populated, empty, missing, and transport-error detail states', async () => {
    const source = detailApi().datasources[0];
    const { database, repository } = await migrate('accounting_vendor_product_detail_states');
    const detail = await repository.querySource(source, { id: 'accounting-vendor-product-001', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'accounting-vendor-product-001', name: 'Bolt', default_code: '[CONS_89957]', product_type: 'Goods', invoicing_policy: 'Ordered quantities', track_inventory: true, sales_price: 0.5, sales_price_display: '$ 0.50', cost_display: '$ 0.50', purchase_taxes: 'Tax 15%', barcode: '20133785543124', company: 'My Company (San Francisco)', variant_count: 1 });
    expect((await repository.querySource(source, { id: 'accounting-vendor-product-001', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'missing-vendor-product', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { id: 'accounting-vendor-product-001', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_VENDOR_PRODUCT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps detail mutations permissioned and guards validation, stale, missing, archive, restore, and delete', async () => {
    const { database, repository } = await migrate('accounting_vendor_product_detail_crud');
    for (const id of ['edit_accounting_vendor_product_detail', 'archive_accounting_vendor_product_detail', 'restore_accounting_vendor_product_detail', 'delete_accounting_vendor_product_detail']) {
      expect(action(id).permission, id).toBe('accounting.write');
    }
    const edit = action('edit_accounting_vendor_product_detail');
    const edited = await repository.executeMutation(edit.mutation, { id: 'accounting-vendor-product-001', expected_row_version: 1, values: { name: 'Bolt Detail', sales_price: 0.75, cost: 0.55, internal_notes: 'Updated from detail.' } });
    expect(edited).toMatchObject({ id: 'accounting-vendor-product-001', name: 'Bolt Detail', sales_price: 0.75, cost: 0.55, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'accounting-vendor-product-001', expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'accounting-vendor-product-001', expected_row_version: 2, values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_VENDOR_PRODUCT_NAME_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-vendor-product', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PRODUCT_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { id: 'accounting-vendor-product-001', expected_row_version: 2, values: { name: 'Negative', sales_price: -1 } })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_VENDOR_PRODUCT_PRICE_INVALID' });
    await repository.executeMutation(action('archive_accounting_vendor_product_detail').mutation, { id: 'accounting-vendor-product-001', expected_row_version: 2, values: { active: false } });
    await expect(repository.executeMutation(edit.mutation, { id: 'accounting-vendor-product-001', expected_row_version: 3, values: { name: 'Archived' } })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PRODUCT_NOT_FOUND' });
    await repository.executeMutation(action('restore_accounting_vendor_product_detail').mutation, { id: 'accounting-vendor-product-001', expected_row_version: 3, values: { active: true } });
    await repository.executeMutation(action('delete_accounting_vendor_product_detail').mutation, { id: 'accounting-vendor-product-001', expected_row_version: 4 });
    await expect(repository.executeMutation(action('delete_accounting_vendor_product_detail').mutation, { id: 'accounting-vendor-product-001', expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_VENDOR_PRODUCT_NOT_FOUND' });
    database.close();
  });
});
