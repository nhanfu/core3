import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet planned-for-change search filter', () => {
  test('maps Odoo filter planned through the vehicles page/API seam', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicles.yaml');
    const api = yaml('api/vehicles.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const planned = list.filters.find((filter: any) => filter.field === 'planned');
    const vehicles = api.datasources.find((candidate: any) => candidate.id === 'fleet_vehicles');
    const accept = yaml('api/vehicle-detail.yaml').actions.find((candidate: any) => candidate.id === 'action_accept_driver_change');

    expect(source).toContain('name="planned" string="Planned for Change"');
    expect(source).toContain("('vehicle_type', '=', 'bike'), ('plan_to_change_bike', '=', True)");
    expect(page.page).toMatchObject({ id: 'vehicles', route: '/vehicles', auth: { require: ['fleet.read'] } });
    expect(api.page).toEqual({ id: 'vehicles' });
    expect(page.datasources).toBeUndefined();
    expect(planned).toEqual({ field: 'planned', label: 'Planned for Change', options: [{ id: 'true', label: 'Planned for Change' }] });
    expect(String(vehicles.query)).toContain('plan_to_change_bike');
    expect(String(vehicles.query)).toContain('plan_to_change_car');
    expect(accept.permission).toBe('fleet.write');
    expect(String(accept.mutation.steps[0].query)).toContain('plan_to_change_bike = FALSE');
  });

  test('seeds the planned fixture idempotently and filters by vehicle type flags', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_planned_filter', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_planned_filter', ['schema', 'data']);
    const source = yaml('api/vehicles.yaml').datasources.find((candidate: any) => candidate.id === 'fleet_vehicles');
    const params = { q: null, state: null, vehicle_type: null, trailer_hook: null, archived: false, planned: true, company_name: null };
    const planned = await repository.querySource(source, params, 0, 50);
    expect(planned.data.map((row: any) => row.id)).toEqual(['fleet-demo-002']);
    expect(planned.data[0]).toMatchObject({ vehicle_type: 'Bike' });
    expect((await repository.querySource(source, { ...params, vehicle_type: 'Car' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(await repository.query('SELECT plan_to_change_bike, plan_to_change_car FROM fleet_vehicles WHERE id = ?', ['fleet-demo-002'])).toEqual([{ plan_to_change_bike: true, plan_to_change_car: false }]);
    database.close();
  });

  test('Apply New Driver clears the planned flag and preserves the row-version workflow', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_planned_filter_workflow', ['schema', 'data']);
    const accept = yaml('api/vehicle-detail.yaml').actions.find((candidate: any) => candidate.id === 'action_accept_driver_change');
    const updated = await repository.executeMutation(accept.mutation, { id: 'fleet-demo-002', expected_row_version: 1 });
    expect(updated).toMatchObject({ row_version: 2, future_driver_name: null, plan_to_change_bike: false });
    const source = yaml('api/vehicles.yaml').datasources.find((candidate: any) => candidate.id === 'fleet_vehicles');
    expect((await repository.querySource(source, { q: null, state: null, vehicle_type: null, trailer_hook: null, archived: false, planned: true, company_name: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(accept.mutation, { id: 'fleet-demo-002', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'FLEET_DRIVER_CHANGE_NOT_PLANNED' });
    database.close();
  });
});
