import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS product variants parity', () => {
  test('joins the visible menu list and detail pages through page.id', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/product-variants', label: 'Product Variants' }));
    const listPage = yaml('pages/pos-product-variants.yaml');
    const listApi = yaml('api/pos-product-variants.yaml');
    const detailPage = yaml('pages/pos-product-variant-detail.yaml');
    const detailApi = yaml('api/pos-product-variant-detail.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-product-variant-detail')).toContain('pos_product_variant_detail');
  });

  test('matches the Odoo list contract and opens a read-only detail route', () => {
    const page = yaml('pages/pos-product-variants.yaml');
    const list = page.components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, card: { title: 'name', subtitle: 'internal_reference' } });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Internal Reference', 'Name', 'Attributes', 'Sales Price', 'Cost', 'On Hand', 'Forecasted', 'Unit']);
    expect(list).toMatchObject({ row_open_action: 'view_pos_product_variant', row_double_click_action: 'view_pos_product_variant' });
    const action = yaml('api/pos-product-variants.yaml').actions.find((candidate: any) => candidate.id === 'view_pos_product_variant');
    expect(action).toMatchObject({ permission: 'pos.read', navigate_to: '/point-of-sale/product-variant-detail', params: { id: '{row.id}' } });
    const detail = yaml('pages/pos-product-variant-detail.yaml');
    const form = detail.components[0];
    expect(form).toMatchObject({ source: 'pos_product_variant_detail', title_field: 'name', message_source: 'pos_product_variant_messages' });
    expect(form.editable).toBeUndefined();
    expect(form.stat_buttons.map((button: any) => button.label)).toEqual(['Documents', 'In / Out', 'Purchased', 'Sold']);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Sales', 'Point of Sale', 'Purchase', 'Inventory']);
    expect(form.notebook.tabs[0].groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining(['Product Type ?', 'Sales Price ?', 'Internal Reference', 'Company', 'Note']));
    expect(form.message_action).toBe('send_pos_product_variant_message');
    expect(form.note_action).toBe('log_pos_product_variant_note');
    expect(form.activity_action).toBe('schedule_pos_product_variant_activity');
  });

  test('seeds deterministic variants, detail fields, and a chatter event', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_product_variant_detail_migrations', ['schema', 'data']);
    const api = yaml('api/pos-product-variant-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'pos_product_variant_detail');
    const messages = api.datasources.find((source: any) => source.id === 'pos_product_variant_messages');
    expect((await repository.querySource(detail, { id: 'pos-variant-coffee-small', fixture_state: null }, 0, 1)).data).toMatchObject({
      name: 'House coffee / Small', internal_reference: 'COFFEE-S', product_type: 'Goods', sales_taxes: '15%', company: 'My Company (San Francisco)',
    });
    expect((await repository.querySource(messages, { id: 'pos-variant-coffee-small' }, 0, 10)).data[0]).toMatchObject({ actor_name: 'OdooBot', action_label: 'Product Variant created' });
    expect((await repository.querySource(detail, { id: 'missing-variant', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('keeps chatter writes behind POS write permission and validates content', () => {
    const actions = yaml('api/pos-product-variant-detail.yaml').actions;
    for (const id of ['send_pos_product_variant_message', 'log_pos_product_variant_note', 'schedule_pos_product_variant_activity']) {
      const action = actions.find((candidate: any) => candidate.id === id);
      expect(action).toMatchObject({ type: 'server_form', permission: 'pos.write', handler: 'yaml_mutation' });
      expect(action.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 422 }), expect.objectContaining({ status: 404 })]));
    }
  });
});
