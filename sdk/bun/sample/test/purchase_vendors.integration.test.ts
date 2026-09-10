import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Purchase Vendors parity', () => {
  test('binds the inherited Odoo Vendors list/detail action through page-id API fragments', () => {
    const list = yaml('pages/vendors.yaml');
    const detail = yaml('pages/vendor-detail.yaml');
    const listApi = yaml('api/vendors.yaml');
    const detailApi = yaml('api/vendor-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.page).toMatchObject({ id: 'vendors', route: '/purchase/vendors', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'vendor-detail', route: '/purchase/vendors/detail', auth: { require: ['purchase.read'] } });
    expect(listApi.page.id).toBe('vendors');
    expect(detailApi.page.id).toBe('vendor-detail');
    expect(discovered.pageDatasources.get('vendors')).toContain('purchase_vendors');
    expect(discovered.pageDatasources.get('vendor-detail')).toContain('purchase_vendor_detail');

    const listView = list.components[0];
    expect(listView).toMatchObject({ source: 'purchase_vendors', row_open_action: 'view_purchase_vendor', responsive_card: true });
    expect(listView.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(listView.views[1]).toMatchObject({ label: 'Kanban', mobile: true, card: { title: 'name', subtitle: 'email', compact: true, avatar_field: 'name', contact_fields: [{ field: 'phone', icon: 'phone' }], company_field: 'location_display', primary_metric: 'purchase_order_count' } });
    expect(listView.columns.map((column: any) => column.field)).toEqual(['name', 'email', 'phone', 'city', 'country', 'purchase_order_count', 'payment_terms', 'state']);
    expect(detail.components[0]).toMatchObject({ source: 'purchase_vendor_detail', status_field: 'state', editable: true });
    expect(detail.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'vendor_purchase_orders', value_field: 'purchase_order_count' }));
    expect(yaml('manifest.yaml').menu.groups[0].items).toContainEqual(expect.objectContaining({ path: '/purchase/vendors', label: 'Vendors', permission: 'purchase.read' }));
  });

  test('serves deterministic active and archived supplier fixtures with search, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_vendors_test_schema_migrations', ['schema', 'data']);

    const source = yaml('api/vendors.yaml').datasources.find((candidate: any) => candidate.id === 'purchase_vendors');
    const params = { q: null, state: null, fixture_state: null };
    const active = await repository.querySource(source, params, 0, 50);
    expect(active.data.map((row: any) => row.name)).toEqual(['Gemini Furniture', 'Lotus Industrial Supply', 'Northwind Components', 'Ready Mat', 'Saigon Office Goods']);
    expect(active.data.every((row: any) => row.state === 'Active')).toBe(true);
    expect(active.data.find((row: any) => row.name === 'Northwind Components')).toMatchObject({ purchase_order_count: 3, open_purchase_order_count: 3, country: 'United States', location_display: 'Seattle, United States' });

    const onlyActive = await repository.querySource(source, { ...params, state: 'Active' }, 0, 50);
    expect(onlyActive.data).toHaveLength(5);
    expect((await repository.querySource(source, { ...params, state: 'Inactive' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy Office Furnishings']);
    expect((await repository.querySource(source, { ...params, q: 'Tracy' }, 0, 50)).data).toMatchObject([{ name: 'Ready Mat', city: 'Tracy', vat: 'US12345675' }]);
    expect((await repository.querySource(source, { ...params, q: 'not-a-vendor' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_VENDORS_UNAVAILABLE' });

    const detail = yaml('api/vendor-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'vendor-demo-002', fixture_state: null }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ name: 'Northwind Components', purchase_order_count: 3, open_purchase_order_count: 3 }),
    });
    expect((await repository.querySource(detail, { id: 'missing-vendor', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'vendor-demo-002', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_VENDOR_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces permissioned CRUD, lifecycle, duplicate, in-use, stale, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_vendors_crud_test_schema_migrations', ['schema', 'data']);

    const listApi = yaml('api/vendors.yaml');
    const detailApi = yaml('api/vendor-detail.yaml');
    const workflow = yaml('pages/vendor-workflow.yaml').workflow;
    expect(listApi.datasources.every((source: any) => source.permission === 'purchase.read')).toBe(true);
    expect(detailApi.datasources.every((source: any) => source.permission === 'purchase.read')).toBe(true);
    expect(workflow).toMatchObject({ id: 'purchase_vendors', entity: 'purchase_vendors', permission: 'purchase.manage' });
    expect(workflow.states.map((state: any) => state.id)).toEqual(['Active', 'Inactive']);
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['archive', 'restore']);
    expect(workflow.transitions.every((transition: any) => transition.permission === 'purchase.manage' && transition.mutation.guards[0].status === 409)).toBe(true);
    for (const candidate of [...listApi.actions, ...detailApi.actions].filter((candidate: any) => candidate.type !== 'navigate')) {
      expect(candidate.permission, candidate.id).toBe('purchase.manage');
    }

    const create = action('api/vendors.yaml', 'create_purchase_vendor');
    const created = await repository.executeMutation(create.mutation, { values: {
      name: 'Pacific Components', email: 'buy@pacific-components.example', phone: '+1 415 555 0112',
      street: '200 Market Street', city: 'San Francisco', country: 'United States', vat: 'US-PC-2026', payment_terms: 'Net 15',
    } });
    expect(created).toMatchObject({ name: 'Pacific Components', state: 'Active', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'pacific components' } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_VENDOR_NAME_REQUIRED' });

    const edit = action('api/vendor-detail.yaml', 'edit_purchase_vendor');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Pacific Components Updated', payment_terms: 'Net 30' } });
    expect(edited).toMatchObject({ name: 'Pacific Components Updated', payment_terms: 'Net 30', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Vendor' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'Northwind Components' } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-vendor', expected_row_version: 1, values: { name: 'Missing Vendor' } })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_VENDOR_NOT_FOUND' });

    const archive = workflow.transitions.find((transition: any) => transition.id === 'archive');
    const restore = workflow.transitions.find((transition: any) => transition.id === 'restore');
    await expect(repository.executeMutation(archive.mutation, { id: 'vendor-demo-002' })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_HAS_OPEN_ORDERS' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id });
    expect(archived).toMatchObject({ id: created.id, state: 'Inactive', row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_NOT_ACTIVE' });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id });
    expect(restored).toMatchObject({ id: created.id, state: 'Active', row_version: 4 });
    await expect(repository.executeMutation(restore.mutation, { id: created.id })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_NOT_INACTIVE' });

    const remove = action('api/vendor-detail.yaml', 'delete_purchase_vendor_detail');
    await expect(repository.executeMutation(remove.mutation, { id: 'vendor-demo-002', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_VENDOR_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_VENDOR_NOT_FOUND' });
    database.close();
  });
});
