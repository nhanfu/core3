import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/stock-report.yaml');
const page = yaml('pages/stock-report.yaml');
const source = api.datasources.find((candidate: any) => candidate.id === 'inventory_stock_report');

describe('Inventory Reporting Stock Odoo parity', () => {
  test('keeps the source action, page/API ownership, and read-only visible contract aligned', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components[0];

    expect(reporting.items).toContainEqual({ path: '/stock-report', label: 'Stock', icon: 'boxes', permission: 'inventory.read' });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'stock-report', route: '/stock-report', auth: { require: ['inventory.read'] } });
    expect(api.page).toEqual({ id: 'stock-report' });
    expect(discovered.pageDatasources.get('stock-report')).toContain('inventory_stock_report');
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock-report', page: 'stock-report', module: 'inventory' });
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'inventory_stock_report', selectable: false, row_actions: 'buttons' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ mobile: true, card: { title: 'product_name', subtitle: 'default_code' } });
    expect(list.header_actions).toContainEqual(expect.objectContaining({ id: 'inventory_stock_at_date', label: 'Inventory at Date', permission: 'inventory.read' }));
    expect(list.filters).toContainEqual(expect.objectContaining({ field: 'category_name', label: 'Category', options_source: 'inventory_stock_report_categories' }));
    expect(list.columns.map((column: any) => column.field)).toEqual([
      'product_name', 'unit_cost', 'total_value', 'on_hand', 'free_to_use',
      'incoming_qty', 'outgoing_qty', 'forecasted', 'unit_name', 'actions',
    ]);
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'inventory_stock_at_date', 'view_inventory_stock_history', 'view_inventory_stock_replenishment',
    ]);
    expect(api.actions.slice(1)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'navigate', permission: 'inventory.read', navigate_to: '/moves' }),
      expect.objectContaining({ type: 'navigate', permission: 'inventory.read', navigate_to: '/replenishment' }),
    ]));
  });

  test('returns deterministic storable rows, categories, filters, empty, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_stock_report_fixture_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_stock_report_fixture_test', ['schema', 'data']);

    const params = { q: null, category_name: null, fixture_state: null };
    const initial = await repository.querySource(source, params, 0, 50);
    expect(initial.data).toHaveLength(10);
    expect(initial.data.map((row: any) => row.default_code)).toEqual([
      'DESK0005', 'DESK0006', 'E-COM06', 'E-COM07', 'E-COM08', 'E-COM10', 'E-COM11', 'FURN_1118', 'FURN_2100', 'FURN_6667',
    ]);
    expect(initial.data.find((row: any) => row.default_code === 'E-COM07')).toMatchObject({ on_hand: 500, free_to_use: 270, outgoing_qty: 230, forecasted: 270 });
    expect(initial.data.find((row: any) => row.default_code === 'FURN_1118')).toMatchObject({ on_hand: 2, free_to_use: 0, outgoing_qty: 3, forecasted: -1 });

    const categories = await repository.querySource(api.datasources[0], {}, 0, 50);
    expect(categories.data).toEqual([{ value: 'Furniture', label: 'Furniture' }, { value: 'Office Supplies', label: 'Office Supplies' }]);
    expect((await repository.querySource(source, { ...params, category_name: 'Office Supplies' }, 0, 50)).data.map((row: any) => row.default_code)).toEqual(['E-COM08', 'E-COM10']);
    expect((await repository.querySource(source, { ...params, q: 'FURN_1118' }, 0, 50)).data).toMatchObject([{ product_name: '[FURN_1118] Corner Desk Left Sit' }]);
    expect((await repository.querySource(source, { ...params, q: 'no-such-product' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_STOCK_REPORT_UNAVAILABLE' });
    database.close();
  });

  test('keeps the report read-only and validates the date entry point', () => {
    const migration = yaml('migrations/20260911290000-012-inventory-stock-report.yaml');
    const atDate = api.actions.find((action: any) => action.id === 'inventory_stock_at_date');

    expect(page.page.auth.require).toEqual(['inventory.read']);
    expect(api.datasources.every((candidate: any) => candidate.permission === 'inventory.read')).toBe(true);
    expect(api.actions.every((candidate: any) => candidate.permission === 'inventory.read')).toBe(true);
    expect(JSON.stringify([page, api])).not.toMatch(/operation: (create|update|delete)/);
    expect(migration.type.postgres.up).toContain("DATE '2026-01-15'");
    expect(migration.type.postgres.up).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(atDate).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', operation: 'report' });
    expect(atDate.fields).toEqual([{ field: 'inventory_date', label: 'Inventory Date', type: 'date', required: true, default: '2026-01-15' }]);
    expect(atDate.mutation.guards[0]).toMatchObject({ status: 422, code: 'INVENTORY_STOCK_REPORT_DATE_INVALID' });
    expect(source.error_states).toMatchObject({
      forbidden: { status: 403, code: 'INVENTORY_STOCK_REPORT_FORBIDDEN' },
      transport_error: { status: 503, code: 'INVENTORY_STOCK_REPORT_UNAVAILABLE' },
    });
  });
});
