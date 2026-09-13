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
   test('keeps the Vendors list/detail CRUD seam persisted, guarded, and actionable', async () => {
    const vendorsPage = yaml('pages/vendors.yaml');
    const vendorDetailPage = yaml('pages/vendor-detail.yaml');
    const vendors = apiSource('vendors.yaml', 'purchase_vendors');
    const detail = apiSource('vendor-detail.yaml', 'purchase_vendor_detail');
    const create = yaml('api/vendors.yaml').actions.find((action: any) => action.id === 'create_purchase_vendor');
    const update = yaml('api/vendor-detail.yaml').actions.find((action: any) => action.id === 'update_purchase_vendor');

    expect(vendorsPage.page).toMatchObject({ id: 'vendors', route: '/vendors', auth: { require: ['purchase.read'] } });
    expect(vendorDetailPage.page).toMatchObject({ id: 'vendor-detail', route: '/vendors/detail', auth: { require: ['purchase.read'] } });
    expect(vendorDetailPage.components[0].header_actions).toEqual([
      { id: 'update_purchase_vendor', label: 'Edit', variant: 'secondary', permission: 'purchase.manage' },
    ]);
    expect(create).toMatchObject({ type: 'server_form', permission: 'purchase.manage', operation: 'create', handler: 'yaml_mutation' });
    expect(update).toMatchObject({ type: 'server_form', permission: 'purchase.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 409, code: 'STALE_RECORD' }),
    ]));

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_vendor_crud_test_schema_migrations', ['schema', 'data']);

    const initial = await repository.querySource(detail, { id: 'vendor-demo-002', fixture_state: null }, 0, 1);
    expect(initial.data).toMatchObject({ id: 'vendor-demo-002', name: 'Northwind Components', row_version: 1 });
    await repository.run("UPDATE purchase_vendors SET updated_at = TIMESTAMP '2026-01-01 00:00:00' WHERE id = 'vendor-demo-002'");
    const timestampBeforeUpdate = (await repository.query("SELECT updated_at FROM purchase_vendors WHERE id = 'vendor-demo-002'"))[0].updated_at;
    const timestampedUpdate = await repository.executeMutation(update.mutation, {
      id: 'vendor-demo-002', expected_row_version: 1,
      values: { name: 'Northwind Components', email: 'updated@northwind.example' },
    }) as any;
    expect(timestampedUpdate).toMatchObject({ id: 'vendor-demo-002', row_version: 2 });
    expect(timestampedUpdate.updated_at).not.toBe(timestampBeforeUpdate);
    const created = await repository.executeMutation(create.mutation, { values: {
      name: 'Harbor Safety Supply', email: 'orders@harbor-safety.example', phone: '+1 415 555 0198',
      payment_terms: 'Net 30', street: '88 Pier Avenue', city: 'Oakland', country: 'United States', vat: 'US-HSS-7712',
    } }) as any;
    expect(created).toMatchObject({ name: 'Harbor Safety Supply', state: 'Active', row_version: 1 });
    const updated = await repository.executeMutation(update.mutation, {
      id: created.id, expected_row_version: 1,
      values: { name: 'Harbor Safety Supply West', email: 'west@harbor-safety.example', state: 'Active' },
    }) as any;
    expect(updated).toMatchObject({ id: created.id, name: 'Harbor Safety Supply West', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: created.id, expected_row_version: 1, values: { name: 'Stale vendor edit' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, {
      id: 'missing-vendor', expected_row_version: 1, values: { name: 'Missing vendor' },
    })).rejects.toMatchObject({ status: 404 });

    expect((await repository.querySource(vendors, { q: 'Harbor', state: null, fixture_state: null }, 0, 50)).data)
      .toMatchObject([{ id: created.id, name: 'Harbor Safety Supply West' }]);
    expect((await repository.querySource(vendors, { q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
   });
  test('keeps Purchase Analysis report layout-only with page-id API ownership and Odoo view controls', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = apiSource('analysis.yaml', 'purchase_analysis_report');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'purchase-analysis', route: '/purchase-analysis', auth: { require: ['purchase.read'] } });
    expect(yaml('api/analysis.yaml').page.id).toBe('purchase-analysis');
    expect(discovered.pages.get('purchase-analysis')?.config.page.id).toBe('purchase-analysis');
    expect(discovered.pageDatasources.get('purchase-analysis')).toEqual(expect.arrayContaining(['purchase_analysis_totals', 'purchase_analysis_report']));
    expect(list).toMatchObject({ source: 'purchase_analysis_report', view_navigation: 'tabs', empty_state: { title: 'No purchase analysis data' } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph']);
    expect(list.views.find((view: any) => view.id === 'pivot')?.pivot.default).toMatchObject({ rows: ['vendor_name'], columns: ['order_month'] });
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'vendor_name', measure_field: 'total_amount' });
    expect(source.permission).toBe('purchase.read');
    expect(source.pivot.fields.map((field: any) => typeof field === 'string' ? field : field.field)).toEqual([
      'vendor_name', 'buyer_name', 'product_name', 'order_month', 'state', 'order_date',
      'ordered_quantity', 'received_quantity', 'billed_quantity', 'untaxed_total', 'total_amount',
    ]);
  });

  test('returns deterministic Purchase Analysis rows, totals, search, and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_analysis_test_schema_migrations', ['schema', 'data']);

    const report = apiSource('analysis.yaml', 'purchase_analysis_report');
    const defaultReport = await repository.querySource(report, { q: null, fixture_state: null }, 0, 50);
    expect(defaultReport.data).toHaveLength(8);
    expect(defaultReport.data.slice(0, 3).map((row: any) => row.order_reference)).toEqual(['PO/2026/0008', 'PO/2026/0002', 'PO/2026/0001']);
    expect(defaultReport.data[0]).toMatchObject({ vendor_name: 'Northwind Components', product_name: 'Industrial label printers', ordered_quantity: 6, received_quantity: 0, billed_quantity: 0, total_amount: 1560 });
    expect(defaultReport.data.every((row: any) => row.company_name === 'Main Company (San Francisco)' && row.order_month.startsWith('2026-'))).toBe(true);

    const totals = apiSource('analysis.yaml', 'purchase_analysis_totals');
    expect(await repository.querySource(totals, { q: null, fixture_state: null }, 0, 1)).toMatchObject({ data: { order_count: 8, ordered_units: 678, received_units: 26, committed_value: 13126 } });
    expect((await repository.querySource(report, { q: 'Northwind', fixture_state: null }, 0, 50)).data.map((row: any) => row.order_reference)).toEqual(['PO/2026/0008', 'PO/2026/0002', 'PO/2026/0005']);
    expect((await repository.querySource(totals, { q: 'Northwind', fixture_state: null }, 0, 1)).data).toMatchObject({ order_count: 3, ordered_units: 48, received_units: 6, committed_value: 6006 });
    expect((await repository.querySource(report, { q: 'No matching purchase', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(report, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(totals, { q: null, fixture_state: 'empty' }, 0, 1)).data).toMatchObject({ order_count: 0, ordered_units: 0, received_units: 0, committed_value: 0 });
  });

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

  test('exposes Odoo Lock and manager-only Unlock with guarded row versions', async () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const actions = api.actions.filter((action: any) => ['lock_purchase_order_detail', 'unlock_purchase_order_detail'].includes(action.id));
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lock_purchase_order_detail', label: 'Lock', permission: 'purchase.write' }),
      expect.objectContaining({ id: 'unlock_purchase_order_detail', label: 'Unlock', permission: 'purchase.manage' }),
    ]));
    expect(actions.map((action: any) => [action.id, action.action, action.permission])).toEqual([
      ['lock_purchase_order_detail', 'purchase.orders.lock', 'purchase.write'],
      ['unlock_purchase_order_detail', 'purchase.orders.unlock', 'purchase.manage'],
    ]);
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_lock_test_schema_migrations', ['schema', 'data']);
    const before = (await repository.query("SELECT row_version, locked FROM purchase_orders WHERE id = 'po-demo-005'"))[0];
    expect(before).toEqual({ row_version: 1, locked: false });
    await repository.executeMutation(actions[0].mutation, { id: 'po-demo-005', expected_row_version: 1 });
    expect((await repository.query("SELECT row_version, locked FROM purchase_orders WHERE id = 'po-demo-005'"))[0]).toEqual({ row_version: 2, locked: true });
    await expect(repository.executeMutation(actions[0].mutation, { id: 'po-demo-005', expected_row_version: 2 })).rejects.toThrow('Only unchanged confirmed purchase orders can be locked');
    await repository.executeMutation(actions[1].mutation, { id: 'po-demo-005', expected_row_version: 2 });
    expect((await repository.query("SELECT row_version, locked FROM purchase_orders WHERE id = 'po-demo-005'"))[0]).toEqual({ row_version: 3, locked: false });
    await expect(repository.executeMutation(actions[1].mutation, { id: 'po-demo-005', expected_row_version: 3 })).rejects.toThrow('Only unchanged locked purchase orders can be unlocked');
  });

  test('exposes manager-only Odoo Approve Order for To Approve orders', async () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const approve = api.actions.find((action: any) => action.id === 'approve_purchase_order_detail');
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'approve_purchase_order_detail', label: 'Approve Order', permission: 'purchase.manage', show_if: "state.purchase_order_detail.state === 'To Approve'" }),
    ]));
    expect(approve).toMatchObject({ action: 'purchase.orders.approve', permission: 'purchase.manage', operation: 'update' });
    expect(approve.mutation.guards[0].status).toBe(409);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_approve_test_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT state, approval_status, row_version FROM purchase_orders WHERE id = 'po-demo-008'"))[0]).toEqual({ state: 'To Approve', approval_status: 'pending', row_version: 1 });
    await repository.executeMutation(approve.mutation, { id: 'po-demo-008', expected_row_version: 1 });
    expect((await repository.query("SELECT state, approval_status, row_version FROM purchase_orders WHERE id = 'po-demo-008'"))[0]).toEqual({ state: 'Confirmed', approval_status: 'approved', row_version: 2 });
    await expect(repository.executeMutation(approve.mutation, { id: 'po-demo-008', expected_row_version: 2 })).rejects.toThrow('Only unchanged purchase orders waiting for approval can be approved');
  });

  test('exposes Odoo Set to Draft for cancelled orders with a row-version guard', async () => {
    const page = yaml('pages/purchase-detail.yaml');
    const api = yaml('api/purchase-detail.yaml');
    const reset = api.actions.find((action: any) => action.id === 'reset_purchase_order_detail');
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reset_purchase_order_detail', label: 'Set to Draft', permission: 'purchase.write', show_if: "state.purchase_order_detail.state === 'Cancelled'" }),
    ]));
    expect(reset).toMatchObject({ action: 'purchase.orders.reset_to_draft', permission: 'purchase.write', operation: 'update' });
    expect(reset.mutation.guards[0].status).toBe(409);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_reset_test_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-004'"))[0]).toEqual({ state: 'Cancelled', row_version: 1 });
    await repository.executeMutation(reset.mutation, { id: 'po-demo-004', expected_row_version: 1 });
    expect((await repository.query("SELECT state, row_version FROM purchase_orders WHERE id = 'po-demo-004'"))[0]).toEqual({ state: 'Draft', row_version: 2 });
    await expect(repository.executeMutation(reset.mutation, { id: 'po-demo-004', expected_row_version: 2 })).rejects.toThrow('Only unchanged cancelled purchase orders can be set back to draft');
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
    expect(defaultRfqs.data.map((row: any) => row.id)).toEqual(['po-demo-008', 'po-demo-002', 'po-demo-009', 'po-demo-001', 'po-demo-004']);
    expect(defaultRfqs.data.map((row: any) => row.state)).toEqual(['To Approve', 'Sent', 'Draft', 'Draft', 'Cancelled']);
    expect(defaultRfqs.data.map((row: any) => row.total_amount)).toEqual([1560, 3096, 1548, 625, 360]);
    expect(defaultRfqs.data.every((row: any) => row.company_name === 'Main Company (San Francisco)' && row.activity_count === 1)).toBe(true);

    const searched = await repository.querySource(rfqs, { q: 'Industrial label', state: null, vendor_id: null, fixture_state: null }, 0, 50);
    expect(searched.data.map((row: any) => row.id)).toEqual(['po-demo-008']);
    const approval = await repository.querySource(rfqs, { q: null, state: 'To Approve', vendor_id: null, fixture_state: null }, 0, 50);
    expect(approval.data).toMatchObject([{ id: 'po-demo-008', total_amount: 1560, activity_type: 'todo' }]);
    const empty = await repository.querySource(rfqs, { q: null, state: null, vendor_id: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);

    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['purchase.read', 'purchase.write', 'purchase.manage']));
    expect(yaml('pages/purchase-rfqs.yaml').page.auth.require).toEqual(['purchase.read']);
    expect(yaml('api/purchase-rfqs.yaml').actions.find((entry: any) => entry.id === 'create_purchase_order')).toMatchObject({ permission: 'purchase.write' });
  });

  test('merges same-vendor RFQs into the oldest survivor and cancels duplicates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_rfq_merge_test_schema_migrations', ['schema', 'data']);

    const page = yaml('api/purchase-rfqs.yaml');
    const merge = page.actions.find((entry: any) => entry.id === 'merge_purchase_rfqs');
    expect(merge).toMatchObject({ permission: 'accounting.write', action: 'purchase.rfqs.merge', operation: 'merge' });
    expect(yaml('pages/purchase-rfqs.yaml').components[0].bulk_actions).toEqual([{ id: 'merge_purchase_rfqs', label: 'Merge RFQs', permission: 'accounting.write' }]);

    const merged = await repository.executeMutation(merge.mutation, { selectedIds: ['po-demo-002', 'po-demo-009'] });
    expect(merged).toMatchObject({ id: 'po-demo-009', state: 'Draft', reference: 'Docking station top-up, IT equipment refresh' });
    expect(await repository.query("SELECT id, state FROM purchase_orders WHERE id IN ('po-demo-002', 'po-demo-009') ORDER BY id")).toEqual([
      { id: 'po-demo-002', state: 'Cancelled' },
      { id: 'po-demo-009', state: 'Draft' },
    ]);
    expect((await repository.query("SELECT quantity, total_amount, row_version FROM purchase_orders WHERE id = 'po-demo-009'"))[0]).toMatchObject({ quantity: 36, total_amount: 4644, row_version: 2 });
    expect(await repository.query("SELECT order_id, quantity, unit_price, line_total FROM purchase_order_lines WHERE order_id = 'po-demo-009' ORDER BY id")).toEqual([
      { order_id: 'po-demo-009', quantity: 36, unit_price: 129, line_total: 4644 },
    ]);

    await expect(repository.executeMutation(merge.mutation, { selectedIds: ['po-demo-003', 'po-demo-006'] })).rejects.toThrow('Please select at least two unlocked RFQs');
    await expect(repository.executeMutation(merge.mutation, { selectedIds: ['po-demo-001', 'po-demo-009'] })).rejects.toThrow('Selected RFQs must have the same vendor');
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
