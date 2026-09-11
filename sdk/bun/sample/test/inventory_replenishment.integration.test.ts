import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/replenishment.yaml');
const page = yaml('pages/replenishment.yaml');
const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_replenishment_orderpoints');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository: result };
}

describe('Inventory replenishment Odoo parity', () => {
  test('keeps the stock manager menu, page/API ownership, and responsive Odoo view modes aligned', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const manifest = yaml('manifest.yaml');
    const procurement = manifest.menu.groups.find((group: any) => group.id === 'procurement');
    const list = page.components[0];

    expect(procurement.items).toEqual([{ path: '/replenishment', label: 'Replenishment', icon: 'refresh', permission: 'inventory.manage' }]);
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'replenishment', route: '/replenishment', auth: { require: ['inventory.manage'] } });
    expect(api.page).toEqual({ id: 'replenishment' });
    expect(discovered.pageDatasources.get('replenishment')).toContain('inventory_replenishment_orderpoints');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/replenishment', page: 'replenishment', module: 'inventory' });
    expect(list).toMatchObject({ source: 'inventory_replenishment_orderpoints', default_filters: { trigger: 'manual', status: 'to_reorder', snooze_status: 'not_snoozed', horizon_days: '365' }, row_actions: 'buttons', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ mobile: true });
    expect(list.columns.map((column: any) => column.field)).toEqual(['product_name', 'on_hand', 'forecast', 'route', 'min_qty', 'max_qty', 'to_order', 'unit_name', 'actions']);
    expect(list.columns.at(-1).actions.map((item: any) => item.id)).toEqual([
      'order_inventory_replenishment', 'automate_inventory_replenishment', 'snooze_inventory_replenishment',
    ]);
    expect(api.datasources.every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
    expect(api.actions.every((candidate: any) => candidate.permission === 'inventory.manage')).toBe(true);
  });

  test('returns deterministic default/manual, automatic, category, horizon, empty, and unavailable states', async () => {
    const { database, repository } = await openRepository('inventory_replenishment_fixture_test');
    const params = { q: null, trigger: 'manual', category_name: null, status: 'to_reorder', snooze_status: 'not_snoozed', horizon_days: '365', fixture_state: null };

    const initial = await repository.querySource(source, params, 0, 50);
    expect(initial.data).toHaveLength(3);
    expect(initial.data.map((row: any) => row.id)).toEqual([
      'orderpoint-desk-left', 'orderpoint-desk-right', 'orderpoint-drawer-black',
    ]);
    expect(initial.data[0]).toMatchObject({ product_name: '[FURN_1118] Corner Desk Left Sit', trigger: 'Manual', to_order: 1 });

    const automatic = await repository.querySource(source, { ...params, trigger: 'auto' }, 0, 50);
    expect(automatic.data).toMatchObject([{ id: 'orderpoint-storage-box-auto', trigger: 'Automatic', category_name: 'Office Supplies' }]);
    expect((await repository.querySource(source, { ...params, category_name: 'Office Supplies', trigger: null, status: 'all' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-storage-box-auto']);
    expect((await repository.querySource(source, { ...params, horizon_days: '3' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-desk-left']);
    expect((await repository.querySource(source, { ...params, q: 'E-COM06' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-desk-right']);
    expect((await repository.querySource(source, { ...params, q: 'not-a-product' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_REPLENISHMENT_UNAVAILABLE' });
    database.close();
  });

  test('guards and applies create, order, automate, and snooze mutations with row versions', async () => {
    const { database, repository } = await openRepository('inventory_replenishment_mutation_test');

    await expect(repository.executeMutation(action('order_inventory_replenishment').mutation, { id: 'orderpoint-drawer-black', expected_row_version: 9 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_REPLENISHMENT_STALE' });
    await repository.executeMutation(action('order_inventory_replenishment').mutation, { id: 'orderpoint-drawer-black', expected_row_version: 1 });
    expect(await repository.query('SELECT state, to_order, order_reference, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-drawer-black'])).toMatchObject([{ state: 'Ordered', to_order: 0, order_reference: 'PO/REPL/orderpoint-drawer-black', row_version: 2 }]);

    await repository.executeMutation(action('automate_inventory_replenishment').mutation, { id: 'orderpoint-desk-right', expected_row_version: 1 });
    expect(await repository.query('SELECT trigger, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-right'])).toMatchObject([{ trigger: 'auto', row_version: 2 }]);
    await repository.executeMutation(action('snooze_inventory_replenishment').mutation, { id: 'orderpoint-desk-left', expected_row_version: 1, snoozed_until: '2026-01-22' });
    expect(await repository.query('SELECT snoozed_until, row_version FROM inventory_orderpoints WHERE id = ?', ['orderpoint-desk-left'])).toMatchObject([{ snoozed_until: expect.anything(), row_version: 2 }]);

    await expect(repository.executeMutation(action('snooze_inventory_replenishment').mutation, { id: 'orderpoint-desk-left', expected_row_version: 2, snoozed_until: '2026-01-15' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_REPLENISHMENT_SNOOZE_DATE_INVALID' });
    await expect(repository.executeMutation(action('create_inventory_replenishment_rule').mutation, { product_name: 'New Cabinet', location_name: 'WH/Stock', min_qty: 5, max_qty: 2 })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_REPLENISHMENT_RANGE_INVALID' });
    await repository.executeMutation(action('create_inventory_replenishment_rule').mutation, { product_name: 'New Cabinet', location_name: 'WH/Stock', min_qty: 5, max_qty: 10 });
    expect(await repository.query('SELECT product_name, min_qty, max_qty, trigger, state FROM inventory_orderpoints WHERE id = ?', ['orderpoint-new-cabinet-wh-stock'])).toMatchObject([{ product_name: 'New Cabinet', min_qty: 5, max_qty: 10, trigger: 'manual', state: 'Open' }]);
    database.close();
  });
});
