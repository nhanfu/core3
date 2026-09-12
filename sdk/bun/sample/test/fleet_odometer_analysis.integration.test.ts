import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (id: string) => yaml('api/odometer-analysis.yaml').datasources.find((item: any) => item.id === id);

describe('Fleet Odometer Analysis parity', () => {
  test('maps the vehicle-form Odometer Report action to the scoped analysis route', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const vehiclePage = yaml('pages/vehicle-detail.yaml');
    const vehicleApi = yaml('api/vehicle-detail.yaml');
    const reportPage = yaml('pages/odometer-analysis.yaml');
    const reportApi = yaml('api/odometer-analysis.yaml');
    const stat = vehiclePage.components[0].stat_buttons.find((entry: any) => entry.id === 'open_fleet_vehicle_odometer_report');
    const action = vehicleApi.actions.find((entry: any) => entry.id === 'open_fleet_vehicle_odometer_report');

    expect(view).toContain('name="action_open_odometer_report"');
    expect(view).toContain('context="{\'xml_id\':\'fleet_vehicle_odometer_action\'}"');
    expect(source).toContain("def action_open_odometer_report(self):");
    expect(source).toContain("'domain': [('vehicle_id', '=', self.id)]");
    expect(source).toContain("'search_default_groupby_date': True");
    expect(stat).toMatchObject({ label: 'Odometer Report', hide_value: true, permission: 'fleet.manage' });
    expect(stat.show_if).toBe("state.vehicle_type === 'car'");
    expect(action).toMatchObject({ type: 'navigate', permission: 'fleet.manage', navigate_to: '/fleet/reporting/odometers' });
    expect(action.params).toEqual({ vehicle_id: '{state.id}', default_group_by: 'recorded_month' });
    expect(reportPage.page).toMatchObject({ id: 'fleet-odometer-analysis', route: '/fleet/reporting/odometers', auth: { require: ['fleet.manage'] } });
    expect(reportApi.page.id).toBe(reportPage.page.id);
    expect(reportApi.datasources.find((entry: any) => entry.id === 'fleet_odometer_analysis').permission).toBe('fleet.manage');
  });

  test('keeps the Reporting page layout-only and binds its page-owned API', () => {
    const page = yaml('pages/odometer-analysis.yaml');
    const api = yaml('api/odometer-analysis.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.page.id).toBe('fleet-odometer-analysis');
    expect(page.page.route).toBe('/fleet/reporting/odometers');
    expect(page.page.auth.require).toEqual(['fleet.manage']);
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('fleet_odometer_analysis');
    expect(readdirSync(join(serviceRoot, 'api'))).toContain('odometer-analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph']);
    expect(list.views[0]).toMatchObject({ label: 'Graph', measure_field: 'mileage_delta', category_field: 'recorded_month' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Vehicle', 'Category', 'Model', 'Fuel Type', 'Odometer Value', 'Mileage Delta']);
  });

  test('seeds deterministic report rows and supports filters, search, empty, and rerun', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_analysis_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_analysis_migrations', ['schema', 'data']);
    const report = source('fleet_odometer_analysis');
    const params = { q: null, vehicle_id: null, category_name: null, fuel_type: null, model_name: null, fixture_state: null };
    const defaults = await repository.querySource(report, params, 0, 100);
    expect(defaults.data).toHaveLength(23);
    expect(defaults.data[0]).toMatchObject({ id: 'fleet-odometer-report-001', recorded_month: '2025-10', vehicle_name: 'City Bike 02' });
    expect(defaults.data.every((row: any) => Number(row.mileage_delta) >= 0)).toBe(true);
    expect((await repository.querySource(report, { ...params, q: 'Model S' }, 0, 100)).data).toHaveLength(10);
    expect((await repository.querySource(report, { ...params, fuel_type: 'Electric' }, 0, 100)).data).toHaveLength(13);
    expect((await repository.querySource(report, { ...params, vehicle_id: 'fleet-demo-001' }, 0, 100)).data).toHaveLength(10);
    expect((await repository.querySource(report, { ...params, fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(report, { ...params, fixture_state: 'not_found' }, 0, 100)).data).toEqual([]);
    database.close();
  });

  test('keeps report read permission and transport failure explicit', () => {
    const report = source('fleet_odometer_analysis');
    expect(report.permission).toBe('fleet.manage');
    expect(report.single).toBe(false);
    expect(report.error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_ODOMETER_ANALYSIS_UNAVAILABLE' });
  });
});
