import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Purchase Vendor Pricelist detail parity', () => {
  test('binds the installed list, form, and mobile kanban action by page id', () => {
    const list = yaml('pages/vendor-pricelists.yaml');
    const detail = yaml('pages/vendor-pricelist-detail.yaml');
    const listApi = yaml('api/vendor-pricelists.yaml');
    const detailApi = yaml('api/vendor-pricelist-detail.yaml');
    const listView = list.components.find((component: any) => component.type === 'ListView');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(list.page).toMatchObject({ id: 'purchase-vendor-pricelists', route: '/purchase/vendor-pricelists', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'purchase-vendor-pricelist-detail', route: '/purchase/vendor-pricelists/detail', auth: { require: ['purchase.read'] } });
    expect(listApi.page.id).toBe('purchase-vendor-pricelists');
    expect(detailApi.page.id).toBe('purchase-vendor-pricelist-detail');
    expect(discovered.pageDatasources.get('purchase-vendor-pricelists')).toContain('purchase_vendor_pricelists');
    expect(discovered.pageDatasources.get('purchase-vendor-pricelist-detail')).toContain('purchase_vendor_pricelist_detail');
    expect(listView.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(listView).toMatchObject({ row_open_action: 'view_purchase_vendor_pricelist', row_double_click_action: 'view_purchase_vendor_pricelist' });
    expect(list.actions.find((action: any) => action.id === 'view_purchase_vendor_pricelist')).toMatchObject({ navigate_to: '/purchase/vendor-pricelists/detail', permission: 'purchase.read' });
    expect(form).toMatchObject({ source: 'purchase_vendor_pricelist_detail', editable: true });
    expect(form.groups.map((group: any) => group.title)).toEqual(['VENDOR', 'PRICELIST']);
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual([
      'Vendor', 'Vendor Product Name?', 'Vendor Product Code?', 'Lead Time?',
      'Product', 'Product Variant?', 'Quantity?', 'Unit Price', 'Currency',
      'Validity', 'To', 'Discount (%)', 'Company',
    ]);
    expect(detailApi.datasources[0]).toMatchObject({ id: 'purchase_vendor_pricelist_detail', single: true, permission: 'purchase.read' });
    expect(detailApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'PURCHASE_VENDOR_PRICELIST_DETAIL_UNAVAILABLE' });
    expect(detailApi.actions.map((action: any) => action.id)).toEqual([
      'back_to_purchase_vendor_pricelists',
      'edit_purchase_vendor_pricelist',
      'duplicate_purchase_vendor_pricelist',
      'delete_purchase_vendor_pricelist',
    ]);
    for (const action of detailApi.actions.filter((candidate: any) => candidate.id !== 'back_to_purchase_vendor_pricelists')) {
      expect(action.permission, action.id).toBe('purchase.write');
    }
  });

  test('returns deterministic supplier detail states and guarded CRUD contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_vendor_pricelist_detail_test_schema_migrations', ['schema', 'data']);

    const listSource = yaml('api/vendor-pricelists.yaml').datasources.find((source: any) => source.id === 'purchase_vendor_pricelists');
    const detailSource = yaml('api/vendor-pricelist-detail.yaml').datasources.find((source: any) => source.id === 'purchase_vendor_pricelist_detail');
    const detailParams = { id: 'supplierinfo-demo-016', fixture_state: null };
    const row = await repository.querySource(detailSource, detailParams, 0, 1);
    expect(row.data).toMatchObject({
      id: 'supplierinfo-demo-016',
      vendor_name: 'Wood Corner',
      product_name: 'Acoustic Bloc Screens',
      product_variant_name: '',
      currency: 'USD',
      unit_price: 287,
      min_qty: 1,
      lead_time_days: 8,
      discount: 0,
    });
    expect((await repository.querySource(detailSource, { ...detailParams, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detailSource, { ...detailParams, id: 'missing-supplierinfo' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(listSource, { q: 'Acoustic', active: null, fixture_state: null }, 0, 50)).data).toHaveLength(2);
    await expect(repository.querySource(listSource, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_VENDOR_PRICELISTS_UNAVAILABLE' });
    await expect(repository.querySource(detailSource, { ...detailParams, fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_VENDOR_PRICELIST_DETAIL_UNAVAILABLE' });

    const edit = yaml('api/vendor-pricelist-detail.yaml').actions.find((action: any) => action.id === 'edit_purchase_vendor_pricelist');
    const duplicate = yaml('api/vendor-pricelist-detail.yaml').actions.find((action: any) => action.id === 'duplicate_purchase_vendor_pricelist');
    const remove = yaml('api/vendor-pricelist-detail.yaml').actions.find((action: any) => action.id === 'delete_purchase_vendor_pricelist');
    expect(edit).toMatchObject({ permission: 'purchase.write', operation: 'update', prefill: 'state.purchase_vendor_pricelist_detail' });
    expect(edit.mutation).toMatchObject({ operation: 'update', table: 'purchase_vendor_pricelists', concurrency: { required: true } });
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'PURCHASE_VENDOR_PRICELIST_NOT_FOUND' }),
      expect.objectContaining({ status: 422, code: 'SUPPLIER_INFO_NAMES_REQUIRED' }),
      expect.objectContaining({ status: 422, code: 'SUPPLIER_INFO_VALUES_INVALID' }),
    ]));
    expect(duplicate.mutation).toMatchObject({ operation: 'insert', table: 'purchase_vendor_pricelists', generated: ['id'] });
    expect(remove.mutation).toMatchObject({ operation: 'delete', table: 'purchase_vendor_pricelists', concurrency: { required: true } });
    expect(remove.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404, code: 'PURCHASE_VENDOR_PRICELIST_NOT_FOUND' })]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
  });
});
