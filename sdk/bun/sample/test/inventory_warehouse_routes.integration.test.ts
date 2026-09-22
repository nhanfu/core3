import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const warehousePage = yaml('pages/warehouse-detail.yaml');
const warehouseApi = yaml('api/warehouse-detail.yaml');
const routesApi = yaml('api/routes.yaml');
const action = (id: string) => warehouseApi.actions.find((candidate: any) => candidate.id === id);
const company = 'My Company (San Francisco)';

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_warehouse_routes_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory warehouse Routes stat action parity', () => {
  test('maps Odoo action_view_all_routes to a page/API-owned, permissioned action', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const viewSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_warehouse_views.xml', 'utf8');
    const modelSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_warehouse.py', 'utf8');
    const routesPage = yaml('pages/routes.yaml');

    expect(warehousePage.page.id).toBe('warehouse-detail');
    expect(warehouseApi.page.id).toBe(warehousePage.page.id);
    expect(warehousePage.datasources).toBeUndefined();
    expect(warehousePage.components[0].stat_buttons).toContainEqual({ id: 'view_inventory_warehouse_routes', label: 'Routes', icon: 'route', value_field: 'route_count', permission: 'inventory.manage' });
    expect(action('view_inventory_warehouse_routes')).toEqual({
      id: 'view_inventory_warehouse_routes',
      type: 'navigate',
      permission: 'inventory.manage',
      navigate_to: '/routes',
      params: {
        warehouse_id: '{state.inventory_warehouse_detail.id}',
        current_company_name: '{state.inventory_warehouse_detail.company_name}',
      },
    });
    expect(routesPage.page.route).toBe('/routes');
    expect(viewSource).toContain('name="action_view_all_routes"');
    expect(modelSource).toContain("routes = self._get_all_routes()");
    expect(modelSource).toContain("default_warehouse_selectable=True");
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/warehouses/detail', page: 'warehouse-detail', module: 'inventory' }),
      expect.objectContaining({ path: '/routes', page: 'routes', module: 'inventory' }),
    ]));
  });

  test('filters direct and rule-linked routes by the selected warehouse', async () => {
    const { database, repository } = await repositoryForTest();
    const source = routesApi.datasources.find((candidate: any) => candidate.id === 'inventory_routes');
    const params = { q: null, active: 'all', current_company_name: company, fixture_state: null };

    expect((await repository.querySource(source, { ...params, warehouse_id: 'warehouse-main' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-buy', 'route-two-step-receipt']);
    expect((await repository.querySource(source, { ...params, active: 'active', warehouse_id: 'warehouse-main' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['route-buy']);
    expect((await repository.querySource(source, { ...params, warehouse_id: 'warehouse-overflow' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company', warehouse_id: 'warehouse-main' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, warehouse_id: 'warehouse-main', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = warehouseApi.datasources.find((candidate: any) => candidate.id === 'inventory_warehouse_detail');
    expect(await repository.querySource(detail, { id: 'warehouse-main', fixture_state: null }, 0, 1)).toMatchObject({ data: { route_count: 2 } });
    database.close();
  });
});
