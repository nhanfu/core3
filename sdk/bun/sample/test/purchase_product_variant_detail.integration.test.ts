import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/purchase-product-variant-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Purchase product variant detail parity', () => {
  test('binds the installed Product Variants list and detail through page.id', () => {
    const list = yaml('pages/purchase-product-variants.yaml');
    const detail = yaml('pages/purchase-product-variant-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const form = detail.components[0];

    expect(list.components[0]).toMatchObject({ source: 'purchase_product_variants', row_open_action: 'view_purchase_product_variant', row_double_click_action: 'view_purchase_product_variant' });
    expect(yaml('api/purchase-product-variants.yaml').actions).toContainEqual(expect.objectContaining({ id: 'view_purchase_product_variant', navigate_to: '/purchase/product-variants/detail', permission: 'purchase.read' }));
    expect(detail.page).toMatchObject({ id: 'purchase-product-variant-detail', route: '/purchase/product-variants/detail', auth: { require: ['purchase.read'] } });
    expect(api.page.id).toBe(detail.page.id);
    expect(discovered.pageDatasources.get('purchase-product-variant-detail')).toEqual(expect.arrayContaining(['purchase_product_variant_detail', 'purchase_product_variant_messages']));
    expect(form).toMatchObject({ source: 'purchase_product_variant_detail', title_field: 'name', subtitle_field: 'default_code', editable: true, message_source: 'purchase_product_variant_messages' });
    expect(form.stat_buttons.map((button: any) => button.label)).toEqual(['Documents', 'In / Out', 'Reordering Rules', 'Bill of Materials', 'Purchased', 'Sold']);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Sales', 'Point of Sale', 'Purchase', 'Inventory', 'Chatter']);
  });

  test('serves deterministic Odoo-shaped detail, messages, empty, not-found, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_variant_detail_schema_migrations', ['schema', 'data']);
    const detail = api.datasources.find((source: any) => source.id === 'purchase_product_variant_detail');
    const messages = api.datasources.find((source: any) => source.id === 'purchase_product_variant_messages');
    const list = yaml('api/purchase-product-variants.yaml').datasources.find((source: any) => source.id === 'purchase_product_variants');
    const params = { id: 'purchase-variant-purchase-product-acoustic', fixture_state: null };
    expect((await repository.querySource(list, { q: null, active: null, fixture_state: null }, 0, 1)).data[0]).toMatchObject({ name: 'Acoustic Bloc Screens / Standard', default_code: 'FURN-001-V1', variant_values: 'Standard' });
    expect((await repository.querySource(detail, params, 0, 1)).data).toMatchObject({ default_code: 'FURN_6667', name: 'Acoustic Bloc Screens', variant_values: 'Color: Black', on_hand_display: '16.00 Units', forecasted_display: '16.00 Units', purchased_qty: 20, sold_qty: 47 });
    expect((await repository.querySource(messages, { id: params.id }, 0, 10)).data).toHaveLength(3);
    expect((await repository.querySource(detail, { ...params, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail, { id: 'missing-variant', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { ...params, fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_PRODUCT_VARIANT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps variant mutations behind purchase.write with validation and row-version guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_variant_detail_crud_migrations', ['schema', 'data']);
    expect(api.datasources.every((source: any) => source.permission === 'purchase.read')).toBe(true);
    expect(yaml('pages/purchase-product-variant-detail.yaml').page.auth.require).toEqual(['purchase.read']);
    for (const id of ['edit_purchase_product_variant', 'archive_purchase_product_variant', 'send_purchase_product_variant_message', 'log_purchase_product_variant_note']) expect(action(id).permission).toBe('purchase.write');

    const edit = action('edit_purchase_product_variant');
    expect(edit.mutation.table).toBe('purchase_product_variant_detail_overrides');
    const values = { default_code: 'FURN_6667', name: 'Acoustic Bloc Screens', variant_values: 'Color: Black', barcode: '', list_price: 295, cost: 1, uom: 'Units', product_type: 'Goods', invoicing_policy: 'Ordered quantities', track_inventory: true, sales_taxes: '15%', purchase_taxes: '15%', category: 'All', company_name: 'My Company (San Francisco)', internal_notes: 'Updated internal note', sales: true, pos_available: false, expenses: false, purchase: true };
    const updated = await repository.executeMutation(edit.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 1, values });
    expect(updated).toMatchObject({ name: 'Acoustic Bloc Screens', row_version: 2, cost: 1 });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 1, values: { ...values, internal_notes: 'Stale update' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 2, values: { ...values, name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_PRODUCT_VARIANT_NAME_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 2, values: { ...values, list_price: -1 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_PRODUCT_VARIANT_VALUES_INVALID' });
    const message = action('send_purchase_product_variant_message');
    await expect(repository.executeMutation(message.mutation, { id: 'purchase-variant-purchase-product-acoustic', values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_PRODUCT_VARIANT_MESSAGE_REQUIRED' });
    const archive = action('archive_purchase_product_variant');
    await repository.executeMutation(archive.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 2, values: { active: false } });
    await expect(repository.executeMutation(archive.mutation, { id: 'purchase-variant-purchase-product-acoustic', expected_row_version: 3, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_PRODUCT_VARIANT_ALREADY_ARCHIVED' });
    database.close();
  });
});
