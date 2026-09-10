import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Purchase product categories parity', () => {
  test('binds the Odoo Configuration > Categories list/detail seam by page id', () => {
    const list = yaml('pages/purchase-product-categories.yaml');
    const detail = yaml('pages/purchase-product-category-detail.yaml');
    const listApi = yaml('api/purchase-product-categories.yaml');
    const detailApi = yaml('api/purchase-product-category-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.page).toMatchObject({ id: 'purchase-product-categories', route: '/purchase/product-categories', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'purchase-product-category-detail', route: '/purchase/product-categories/detail', auth: { require: ['purchase.read'] } });
    expect(listApi.page.id).toBe('purchase-product-categories');
    expect(detailApi.page.id).toBe('purchase-product-category-detail');
    expect(discovered.pageDatasources.get('purchase-product-categories')).toContain('purchase_product_categories');
    expect(discovered.pageDatasources.get('purchase-product-category-detail')).toEqual(expect.arrayContaining(['purchase_product_category_detail', 'purchase_product_category_messages']));
    expect(list.components[0].columns).toEqual([{ field: 'name', label: 'Product Category', type: 'PrimaryEntityCell' }]);
    expect(list.components[0].selectable).toBe(true);
    expect(detail.components[0].groups.map((group: any) => group.title)).toEqual(['Category', 'LOGISTICS', 'INVENTORY VALUATION']);
    expect(detail.components[0].groups[0].wide).toBe(true);
    expect(detail.components[0].groups[1].fields[1]).toMatchObject({ field: 'packaging_reserve_method', type: 'radio' });
  });

  test('records the Odoo menu order and permissions', () => {
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.map((group: any) => group.label)).toEqual(['Orders', 'Products', 'Reporting', 'Configuration']);
    expect(manifest.menu.groups[3].items.map((item: any) => item.label)).toEqual(['Settings', 'Vendor Pricelists', 'Attributes', 'Categories', 'Units & Packagings']);
    expect(manifest.menu.groups[3].items.find((item: any) => item.label === 'Categories')).toMatchObject({ path: '/purchase/product-categories', permission: 'purchase.read' });
    const listActions = yaml('api/purchase-product-categories.yaml').actions;
    const detailActions = yaml('api/purchase-product-category-detail.yaml').actions;
    expect(listActions.find((action: any) => action.id === 'create_purchase_product_category')).toMatchObject({ permission: 'purchase.write', operation: 'create' });
    expect(detailActions.find((action: any) => action.id === 'edit_purchase_product_category')).toMatchObject({ permission: 'purchase.write', operation: 'update' });
    expect(detailActions.find((action: any) => action.id === 'purchase_product_category_products')).toMatchObject({ permission: 'purchase.read', navigate_to: '/purchase/products' });
  });

  test('serves deterministic Odoo-shaped categories, details, chatter, search, and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_categories_test_schema_migrations', ['schema', 'data']);

    const listSource = yaml('api/purchase-product-categories.yaml').datasources.find((source: any) => source.id === 'purchase_product_categories');
    const detailSource = yaml('api/purchase-product-category-detail.yaml').datasources.find((source: any) => source.id === 'purchase_product_category_detail');
    const messagesSource = yaml('api/purchase-product-category-detail.yaml').datasources.find((source: any) => source.id === 'purchase_product_category_messages');
    const params = { q: null, fixture_state: null };
    const rows = await repository.querySource(listSource, params, 0, 50);
    expect(rows.data).toHaveLength(10);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Clothes', 'Expenses', 'Food', 'Furniture', 'Furniture / Office', 'Furniture / Outdoor', 'Goods', 'Home Construction', 'Services', 'Services / Events']);
    expect((await repository.querySource(listSource, { ...params, q: 'Furniture' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Furniture', 'Furniture / Office', 'Furniture / Outdoor']);
    expect((await repository.querySource(listSource, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = await repository.querySource(detailSource, { id: 'purchase-category-furniture', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Furniture', product_count: 30, costing_method: 'Standard Price', inventory_valuation: 'Periodic (at closing)' });
    const messages = await repository.querySource(messagesSource, { id: 'purchase-category-furniture' }, 0, 50);
    expect(messages.data).toHaveLength(1);
    expect(messages.data[0]).toMatchObject({ actor_name: 'OdooBot', action_label: 'Product Category created' });
    expect((await repository.querySource(detailSource, { id: 'missing-category', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
  });
});
