import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/unbuild-orders.yaml');
const detailApi = () => yaml('api/unbuild-order-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_unbuild_orders_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_unbuild_orders_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Unbuild Orders Odoo action parity', () => {
  test('keeps presentation pages separate from page-id-bound API fragments', () => {
    const listPage = yaml('pages/unbuild-orders.yaml');
    const detailPage = yaml('pages/unbuild-order-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'manufacturing-unbuild-orders', route: '/unbuild-orders' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-unbuild-order-detail', route: '/unbuild-orders/detail' });
    expect(listApi().page.id).toBe('manufacturing-unbuild-orders');
    expect(detailApi().page.id).toBe('manufacturing-unbuild-order-detail');
    expect(discovered.pageDatasources.get('manufacturing-unbuild-orders')).toEqual(expect.arrayContaining(['mrp_unbuild_orders']));
    expect(discovered.pageDatasources.get('manufacturing-unbuild-order-detail')).toEqual(['mrp_unbuild_order_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/unbuild-orders', page: 'manufacturing-unbuild-orders', module: 'manufacturing' }),
      expect.objectContaining({ path: '/unbuild-orders/detail', page: 'manufacturing-unbuild-order-detail', module: 'manufacturing' }),
    ]));
  });

  test('matches the installed action, menu, modes, fields, and visible Odoo labels', () => {
    const manifest = yaml('manifest.yaml');
    const operations = manifest.menu.groups.find((group: any) => group.id === 'operations');
    expect(operations.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/unbuild-orders', label: 'Unbuild Orders', permission: 'manufacturing.read' }),
    ]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));

    const list = yaml('pages/unbuild-orders.yaml').components[0];
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'mrp_unbuild_orders', create_action: 'create_mrp_unbuild', row_open_action: 'view_mrp_unbuild', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'activity']);
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ label: 'Kanban', group_by: 'state' });
    expect(list.views.find((view: any) => view.id === 'activity')).toMatchObject({ label: 'Activity', title_field: 'name', record_date_field: 'activity_date' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Reference', 'Product', 'Bill of Material', 'Manufacturing Order', 'Lot/Serial Number', 'Quantity', 'Unit', 'Company', 'Status', ' ']);
    expect(list.form_view.page).toBe('apps/services/manufacturing/pages/unbuild-order-detail.yaml');

    const detail = yaml('pages/unbuild-order-detail.yaml').components[0];
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'mrp_unbuild_order_detail', editable: true, title_field: 'name', status_field: 'state' });
    expect(detail.statusbar.map((state: any) => state.label)).toEqual(['Draft', 'Done']);
    expect(detail.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining([
      'Reference', 'Product', 'Bill of Material', 'Quantity', 'Unit', 'Manufacturing Order',
      'Lot/Serial Number', 'Source Location', 'Destination Location', 'Company', 'Product Moves',
    ]));
    expect(listApi().datasources.find((source: any) => source.id === 'mrp_unbuild_orders').error_states).toMatchObject({
      unauthorized: { status: 401, code: 'MRP_UNBUILD_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'MRP_UNBUILD_FORBIDDEN' },
      transport_error: { status: 503, code: 'MRP_UNBUILD_UNAVAILABLE' },
    });
    expect(detailApi().datasources[0].error_states).toMatchObject({ missing_record: { status: 404, code: 'MRP_UNBUILD_NOT_FOUND' } });
    expect(action('unbuild_mrp_order')).toMatchObject({ permission: 'manufacturing.write', action: 'manufacturing.unbuild_orders.validate' });
    expect(action('unbuild_mrp_order').mutation.guards[1].query).toContain('row_version = :expected_row_version');
    expect(action('unbuild_mrp_order').mutation.steps[0]).toMatchObject({ expect_changed: true, code: 'STALE_RECORD' });
  });

  test('serves deterministic default/search/filter/empty/detail/error fixtures', async () => {
    const { database, repository } = await repositoryForTest();
    const list = listApi().datasources.find((source: any) => source.id === 'mrp_unbuild_orders');
    const params = { q: null, state: null, company_name: null, fixture_state: null };

    const defaultRows = (await repository.querySource(list, params, 0, 50)).data;
    expect(defaultRows).toHaveLength(6);
    expect(defaultRows.map((row: any) => row.state)).toEqual(expect.arrayContaining(['Draft', 'Done']));
    expect((await repository.querySource(list, { ...params, q: 'Drawer' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['UB/2026/0002', 'UB/2026/0006']);
    expect((await repository.querySource(list, { ...params, state: 'Done' }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(list, { ...params, company_name: 'Core3 Vietnam' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['UB/2026/0006']);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_UNBUILD_UNAVAILABLE' });

    const detail = detailApi().datasources[0];
    expect((await repository.querySource(detail, { id: 'unbuild-table-draft', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'UB/2026/0001', product_qty: 1, state: 'Draft', move_count: 0 });
    expect((await repository.querySource(detail, { id: 'missing-unbuild', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'unbuild-table-draft', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_UNBUILD_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports create, edit, unbuild, validation, stale, and done-delete guards', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_mrp_unbuild');
    const edit = action('edit_mrp_unbuild');
    const unbuild = action('unbuild_mrp_order');
    const remove = action('delete_mrp_unbuild');
    const values = {
      name: 'UB/2026/0099', product_id: 'product-furn-9666', product_name: '[FURN_9666] Table',
      bom_id: 'bom-table-odoo', bom_name: '[FURN_9666] Table BoM', mo_id: 'mo-done-001', mo_name: 'MO/2026/0005',
      lot_id: 'lot-table-001', lot_name: 'LOT-TABLE-001', product_qty: 1, product_uom: 'Units',
      source_location: 'WH/Stock', destination_location: 'WH/Stock', company_name: 'My Company (San Francisco)',
      state: 'Draft', activity_state: 'planned', activity_date: '2026-01-20', activity_user: 'Mitchell Admin', move_count: 0, note: 'QA fixture',
    };

    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'unbuild-ub-2026-0099', name: 'UB/2026/0099', row_version: 1, state: 'Draft' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'ub/2026/0099' } })).rejects.toMatchObject({ status: 409, code: 'MRP_UNBUILD_REFERENCE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'UB/2026/0100', product_qty: 0 } })).rejects.toMatchObject({ status: 422, code: 'MRP_UNBUILD_REQUIRED_FIELDS' });

    const updated = await repository.executeMutation(edit.mutation, { id: 'unbuild-ub-2026-0099', expected_row_version: 1, values: { ...values, name: 'UB/2026/0099-EDITED', product_qty: 2 } });
    expect(updated).toMatchObject({ name: 'UB/2026/0099-EDITED', row_version: 2, product_qty: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'unbuild-ub-2026-0099', expected_row_version: 1, values: { ...values, name: 'Stale Unbuild' } })).rejects.toMatchObject({ status: 409 });

    const completed = await repository.executeMutation(unbuild.mutation, { id: 'unbuild-table-draft', expected_row_version: 1, values: { state: 'Done', activity_state: 'done', move_count: 2 } });
    expect(completed).toMatchObject({ id: 'unbuild-table-draft', state: 'Done', row_version: 2, move_count: 2 });
    await expect(repository.executeMutation(unbuild.mutation, { id: 'unbuild-table-draft', expected_row_version: 1, values: { state: 'Done', activity_state: 'done', move_count: 2 } })).rejects.toMatchObject({ status: 409, code: 'MRP_UNBUILD_NOT_DRAFT' });
    await expect(repository.executeMutation(edit.mutation, { id: 'unbuild-drawer-done', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'MRP_UNBUILD_DONE_EDIT' });
    await expect(repository.executeMutation(remove.mutation, { id: 'unbuild-drawer-done', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_UNBUILD_DONE_DELETE' });

    await repository.executeMutation(remove.mutation, { id: 'unbuild-ub-2026-0099', expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: 'unbuild-ub-2026-0099', expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'MRP_UNBUILD_NOT_FOUND' });
    database.close();
  });
});
