import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/lots.yaml').actions.find((candidate: any) => candidate.id === id);
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((candidate: any) => candidate.id === id);

describe('Inventory Lots / Serial Numbers Odoo action parity', () => {
  test('keeps list/detail layouts presentation-only and joins APIs through page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/lots.yaml');
    const detailPage = yaml('pages/lot-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'lots', route: '/lots', auth: { require: ['inventory.tracking'] } });
    expect(detailPage.page).toMatchObject({ id: 'lot-detail', route: '/lots/detail', auth: { require: ['inventory.tracking'] } });
    expect(yaml('api/lots.yaml').page.id).toBe('lots');
    expect(yaml('api/lot-detail.yaml').page.id).toBe('lot-detail');
    expect(discovered.pages.get('lots')?.config.page.id).toBe('lots');
    expect(discovered.pageDatasources.get('lots')).toEqual(expect.arrayContaining(['inventory_lots']));
    expect(discovered.pageDatasources.get('lot-detail')).toEqual(expect.arrayContaining(['inventory_lot_detail']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/lots', page: 'lots', module: 'inventory' }),
      expect.objectContaining({ path: '/lots/detail', page: 'lot-detail', module: 'inventory' }),
    ]));

    const list = listPage.components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(list.default_group_by).toBe('location_name');
    expect(list.filters[0].options.map((option: any) => option.id)).toEqual(['at_customer', 'on_hand']);
    expect(list.group_by.map((group: any) => group.field)).toEqual(['product_name', 'location_name', 'create_date', 'company_name']);
    expect(list.row_open_action).toBe('view_inventory_lot');
    expect(list.form_view).toEqual({ page: 'apps/services/inventory/pages/lot-detail.yaml', side_panel: false });
    expect(action('view_inventory_lot')).toMatchObject({ type: 'navigate', permission: 'inventory.tracking', navigate_to: '/lots/detail', params: { id: '{row.id}' } });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'products').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/lots', label: 'Lots / Serial Numbers', permission: 'inventory.tracking' }),
    ]));
  });

  test('seeds idempotent lots, search/filter/detail, empty and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_lots_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_lots_test_migrations', ['schema', 'data']);

    const lots = source('lots.yaml', 'inventory_lots');
    expect((await repository.querySource(lots, { q: null, availability: null, fixture_state: null }, 0, 50)).data).toHaveLength(7);
    expect((await repository.querySource(lots, { q: 'CM-BOX-00001', availability: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'CM-BOX-00001', product_qty: 50, location_name: 'Shelf 2', tracking: 'lot' });
    expect((await repository.querySource(lots, { q: null, availability: 'at_customer', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['CUST-LOT-0001']);
    expect((await repository.querySource(lots, { q: null, availability: 'on_hand', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['CUST-LOT-0001', 'CM-BOX-00001', 'CM-BOX-00002', '0000000000029', 'T0001']);
    expect((await repository.querySource(lots, { q: 'does-not-exist', availability: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(lots, { q: null, availability: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(lots, { q: null, availability: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_LOTS_UNAVAILABLE' });

    const detail = source('lot-detail.yaml', 'inventory_lot_detail');
    expect(await repository.querySource(detail, { id: 'lot-drawer-00029', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: '0000000000029', product_qty: 80, location_name: 'Stock' }) });
    expect((await repository.querySource(detail, { id: 'lot-missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'lot-drawer-00029', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_LOT_DETAIL_UNAVAILABLE' });

    database.close();
  });

  test('enforces permission-bound mutations, duplicate/quantity/location guards, safe delete, and row versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'inventory_lots_mutation_test_migrations', ['schema', 'data']);

    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['inventory.read', 'inventory.write', 'inventory.manage', 'inventory.tracking']));
    for (const id of ['create_inventory_lot', 'edit_inventory_lot', 'delete_inventory_lot']) expect(action(id).permission).toBe('inventory.manage');
    expect(action('edit_inventory_lot').mutation.concurrency.required).toBe(true);
    expect(action('delete_inventory_lot').mutation.concurrency.required).toBe(true);

    const created = await repository.executeMutation(action('create_inventory_lot').mutation, { values: { name: 'LOT-NEW-0001', product_id: 'product-new', product_name: 'New Storable Product', location_id: 'location-stock', product_qty: 0, tracking: 'lot', unit_name: 'Units', company_name: 'My Company (San Francisco)' } }) as any;
    expect(created).toMatchObject({ name: 'LOT-NEW-0001', row_version: 1, product_qty: 0 });
    expect(created.id).toEqual(expect.any(String));
    await expect(repository.executeMutation(action('create_inventory_lot').mutation, { values: { name: 'LOT-NEW-0001', product_id: 'product-new', product_name: 'New Storable Product' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOT_EXISTS' });
    await expect(repository.executeMutation(action('create_inventory_lot').mutation, { values: { name: 'SN-BAD', product_id: 'product-new', product_name: 'New Storable Product', tracking: 'serial', product_qty: 2 } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_LOT_QUANTITY_INVALID' });
    await expect(repository.executeMutation(action('create_inventory_lot').mutation, { values: { name: 'LOT-BAD-LOC', product_id: 'product-new', product_name: 'New Storable Product', location_id: 'location-archived' } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_LOT_LOCATION_INVALID' });

    const edited = await repository.executeMutation(action('edit_inventory_lot').mutation, { id: created.id, expected_row_version: 1, values: { name: 'LOT-NEW-0001-UPDATED', product_id: 'product-new', product_name: 'New Storable Product', tracking: 'lot', location_id: 'location-stock' } }) as any;
    expect(edited).toMatchObject({ name: 'LOT-NEW-0001-UPDATED', row_version: 2 });
    await expect(repository.executeMutation(action('edit_inventory_lot').mutation, { id: created.id, expected_row_version: 1, values: { name: 'STALE', product_id: 'product-new', product_name: 'New Storable Product', tracking: 'lot' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(action('edit_inventory_lot').mutation, { id: 'lot-drawer-00029', expected_row_version: 1, values: { name: '0000000000029', product_id: 'product-other', product_name: 'Other Product', tracking: 'lot' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOT_PRODUCT_LOCKED' });
    await expect(repository.executeMutation(action('delete_inventory_lot').mutation, { id: 'lot-drawer-00029', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_LOT_IN_USE' });
    await repository.executeMutation(action('delete_inventory_lot').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(action('delete_inventory_lot').mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_LOT_NOT_FOUND' });

    database.close();
  });
});
