import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Purchase Orders list and detail parity', () => {
  test('keeps the list/detail pages layout-only and owned by page-id API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['pages/purchase-orders.yaml', 'purchase-orders', 'purchase-orders.yaml', 'purchase_orders'],
      ['pages/purchase-detail.yaml', 'purchase-detail', 'purchase-detail.yaml', 'purchase_order_detail'],
    ] as const;

    for (const [pageFile, pageId, apiFile, sourceId] of screens) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['purchase.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      expect(yaml(`api/${apiFile}`).page.id, apiFile).toBe(pageId);
    }

    const list = yaml('pages/purchase-orders.yaml').components.find((component: any) => component.type === 'ListView');
    expect(list).toMatchObject({ source: 'purchase_orders', row_open_action: 'view_purchase_order', empty_state: { title: 'No purchase orders' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'calendar', 'pivot', 'graph', 'activity']);
    expect(list.views.filter((view: any) => view.mobile === false).map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar', 'pivot', 'graph', 'activity']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, card: { title: 'name', subtitle: 'vendor_name' } });
    expect(apiSource('purchase-orders.yaml', 'purchase_orders').pivot.fields).toEqual(['vendor_name', 'state', 'expected_arrival', 'quantity', 'qty_received', 'total_amount']);
    expect(yaml('pages/purchase-orders.yaml').actions.find((action: any) => action.id === 'view_purchase_order')).toMatchObject({ navigate_to: '/purchase/detail', permission: 'purchase.read' });
  });

  test('returns deterministic purchase-order search, empty, and detail fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_parity_test_schema_migrations', ['schema', 'data']);

    const orders = apiSource('purchase-orders.yaml', 'purchase_orders');
    const defaultOrders = await repository.querySource(orders, { q: null, state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(defaultOrders.data.map((row: any) => row.id)).toEqual(['po-demo-005', 'po-demo-006', 'po-demo-007', 'po-demo-003']);
    expect(defaultOrders.data.every((row: any) => row.order_type === undefined || row.order_type === 'purchase')).toBe(true);
    expect(defaultOrders.data.map((row: any) => row.total_amount)).toEqual([1350, 3360, 555, 2220]);

    const searched = await repository.querySource(orders, { q: 'Warehouse', state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['po-demo-005']);
    const received = await repository.querySource(orders, { q: null, state: 'Received', vendor_id: null, fixture_state: null }, 0, 50);
    expect(received.data.map((row: any) => row.id)).toEqual(['po-demo-006']);
    const empty = await repository.querySource(orders, { q: null, state: null, vendor_id: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);

    const detail = apiSource('purchase-detail.yaml', 'purchase_order_detail');
    const detailRow = await repository.querySource(detail, { id: 'po-demo-005', fixture_state: null }, 0, 1);
    expect(detailRow.data).toMatchObject({ id: 'po-demo-005', name: 'PO/2026/0005', state: 'Confirmed', vendor_name: 'Northwind Components', expected_arrival: '2026-09-16' });
    const missing = await repository.querySource(detail, { id: 'does-not-exist', fixture_state: 'not_found' }, 0, 1);
    expect(missing.data).toEqual({});
  });

  test('keeps Purchase read/write/manage permission boundaries explicit', () => {
    for (const file of ['api/purchase-orders.yaml', 'api/purchase-detail.yaml']) {
      for (const source of yaml(file).datasources) expect(source.permission, file).toBe('purchase.read');
    }
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
    const workflow = yaml('pages/purchase-workflow.yaml').workflow;
    expect(workflow.permission).toBe('purchase.write');
    expect(workflow.transitions.every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);
    expect(yaml('pages/purchase-orders.yaml').page.auth.require).toEqual(['purchase.read']);
    expect(yaml('pages/purchase-detail.yaml').page.auth.require).toEqual(['purchase.read']);
  });

  test('keeps RFQs aligned with the Odoo action view family and page/API boundary', () => {
    const page = yaml('pages/purchase-rfqs.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = apiSource('purchase-rfqs.yaml', 'purchase_rfqs');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-rfqs', route: '/purchase', auth: { require: ['purchase.read'] } });
    expect(yaml('api/purchase-rfqs.yaml').page.id).toBe('purchase-rfqs');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-rfqs')).toContain('purchase_rfqs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban', 'calendar', 'pivot', 'graph', 'activity']);
    expect(list.views.filter((view: any) => view.mobile === false).map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar', 'pivot', 'graph', 'activity']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, card: { title: 'name', subtitle: 'vendor_name' } });
    expect(list.views.find((view: any) => view.id === 'pivot')?.pivot.default).toMatchObject({ rows: ['vendor_name'], columns: ['state'] });
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'vendor_name', measure_field: 'total_amount' });
    expect(list.views.find((view: any) => view.id === 'activity')).toMatchObject({ title_field: 'name', record_date_field: 'activity_date' });
    expect(source.permission).toBe('purchase.read');
    expect(source.pivot.fields).toEqual(['vendor_name', 'state', 'expected_date', 'quantity', 'qty_received', 'total_amount']);
    expect(list.columns.map((column: any) => column.field)).toEqual(['name', 'vendor_name', 'company_name', 'buyer_name', 'expected_date', 'activity_count', 'total_amount_display', 'state']);
  });

  test('returns deterministic RFQ status, search, empty, and permission fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_rfq_views_test_schema_migrations', ['schema', 'data']);

    const rfqs = apiSource('purchase-rfqs.yaml', 'purchase_rfqs');
    const defaultRfqs = await repository.querySource(rfqs, { q: null, state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(defaultRfqs.data.map((row: any) => row.id)).toEqual(['po-demo-008', 'po-demo-002', 'po-demo-001', 'po-demo-004']);
    expect(defaultRfqs.data.map((row: any) => row.state)).toEqual(['To Approve', 'Sent', 'Draft', 'Cancelled']);
    expect(defaultRfqs.data.map((row: any) => row.total_amount)).toEqual([1560, 3096, 625, 360]);
    expect(defaultRfqs.data.every((row: any) => row.company_name === 'Main Company (San Francisco)' && row.activity_count === 1)).toBe(true);

    const searched = await repository.querySource(rfqs, { q: 'Industrial label', state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['po-demo-008']);
    const approval = await repository.querySource(rfqs, { q: null, state: 'To Approve', vendor_id: null, fixture_state: null }, 0, 50);
    expect(approval.data).toMatchObject([{ id: 'po-demo-008', total_amount: 1560, activity_type: 'todo' }]);
    const empty = await repository.querySource(rfqs, { q: null, state: null, vendor_id: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);

    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
    expect(yaml('pages/purchase-rfqs.yaml').page.auth.require).toEqual(['purchase.read']);
    expect(yaml('api/purchase-rfqs.yaml').actions[0]).toMatchObject({ id: 'create_purchase_order', permission: 'purchase.write' });
  });

  test('keeps Purchase Products aligned with the Odoo action view family and page/API boundary', () => {
    const page = yaml('pages/purchase-products.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = apiSource('purchase-products.yaml', 'purchase_products');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-products', route: '/purchase/products', auth: { require: ['purchase.read'] } });
    expect(yaml('api/purchase-products.yaml').page.id).toBe('purchase-products');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-products')).toContain('purchase_products');
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'list', 'activity']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', card: { title: 'name', subtitle: 'default_code', fields: [{ field: 'list_price_display', label: 'Price' }, { field: 'on_hand_display', label: 'On hand' }] } });
    expect(list.views.find((view: any) => view.id === 'activity')).toMatchObject({ title_field: 'name', record_date_field: 'created_at' });
    expect(source.permission).toBe('purchase.read');
    expect(list.columns.map((column: any) => column.field)).toEqual(['name', 'default_code', 'product_tags', 'barcode', 'company_name', 'cost_price_display', 'category', 'product_type', 'uom', 'active']);
    const productsMenu = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'products');
    expect(productsMenu.items).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/purchase/products', label: 'Products' })]));
  });

  test('returns 105 deterministic Purchase Products with search, empty, and write boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_products_test_schema_migrations', ['schema', 'data']);

    const products = apiSource('purchase-products.yaml', 'purchase_products');
    const productParams = { q: null, purchase_ok: null, active: null, fixture_state: null };
    const firstPage = await repository.querySource(products, productParams, 0, 80);
    const secondPage = await repository.querySource(products, productParams, 80, 80);
    expect([...firstPage.data, ...secondPage.data]).toHaveLength(105);
    expect(firstPage.data.slice(0, 5).map((row: any) => row.name)).toEqual(['Acoustic Bloc Screens', 'Apple Pie', 'Bagel', 'Black embroidered t-shirt', 'Blue Denim Jeans']);

    const searched = await repository.querySource(products, { q: 'Acoustic', purchase_ok: true, active: true, fixture_state: null }, 0, 50);
    expect(searched.data).toMatchObject([{ id: 'purchase-product-acoustic', default_code: 'FURN-001', purchase_ok: true }]);
    expect(firstPage.data[0]).toMatchObject({ list_price_display: '$ 295.00', on_hand_display: '16.00 Units' });
    const empty = await repository.querySource(products, { q: null, purchase_ok: null, active: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
    expect(yaml('api/purchase-products.yaml').actions.find((action: any) => action.id === 'create_purchase_product')).toMatchObject({ permission: 'purchase.write' });
    expect(yaml('pages/purchase-products.yaml').page.auth.require).toEqual(['purchase.read']);
  });

  test('keeps Product Variants aligned with the source action and deterministic catalog fixtures', async () => {
    const page = yaml('pages/purchase-product-variants.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const variants = apiSource('purchase-product-variants.yaml', 'purchase_product_variants');
    expect(page.page).toMatchObject({ id: 'purchase-product-variants', route: '/purchase/product-variants', auth: { require: ['purchase.read'] } });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-product-variants')).toContain('purchase_product_variants');
    expect(list.views.map((view: any) => view.id)).toEqual(['card', 'list', 'activity']);
    expect(list.views[0]).toMatchObject({ label: 'Kanban', card: { title: 'name', subtitle: 'default_code' } });
    expect(variants.permission).toBe('purchase.read');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_product_variants_test_schema_migrations', ['schema', 'data']);
    const params = { q: null, active: null, fixture_state: null };
    const firstPage = await repository.querySource(variants, params, 0, 80);
    const secondPage = await repository.querySource(variants, params, 80, 80);
    expect([...firstPage.data, ...secondPage.data]).toHaveLength(105);
    expect(firstPage.data[0]).toMatchObject({ name: 'Acoustic Bloc Screens / Standard', default_code: 'FURN-001-V1', variant_values: 'Standard' });
    expect(firstPage.data[0].list_price_display).toBe('$ 295.00');
    const searched = await repository.querySource(variants, { q: 'Acoustic', active: true, fixture_state: null }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect((await repository.querySource(variants, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });
});
