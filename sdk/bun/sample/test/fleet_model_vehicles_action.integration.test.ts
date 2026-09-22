import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet model Vehicles stat action parity', () => {
  test('maps Odoo action_model_vehicle to a filtered vehicle action', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml', 'utf8');
    const page = yaml('pages/model-detail.yaml');
    const api = yaml('api/model-detail.yaml');
    const vehiclePage = yaml('pages/vehicles.yaml');
    const vehicleApi = yaml('api/vehicles.yaml');
    const action = api.actions.find((entry: any) => entry.id === 'view_fleet_model_vehicles');
    const vehicleSource = vehicleApi.datasources.find((entry: any) => entry.id === 'fleet_vehicles');

    expect(view).toContain('name="action_model_vehicle"');
    expect(source).toContain("context['search_default_model_id'] = self.id");
    expect(page.page.id).toBe('model-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(vehiclePage.page.id).toBe('vehicles');
    expect(action).toMatchObject({
      id: 'view_fleet_model_vehicles',
      type: 'navigate',
      permission: 'fleet.read',
      navigate_to: '/vehicles',
      params: { model_id: '{state.fleet_model_detail.id}' },
    });
    expect(vehicleSource).toMatchObject({ permission: 'fleet.read' });
    expect(vehicleSource.query).toContain(':model_id IS NULL');
    expect(vehicleSource.query).toContain('fleet_vehicle_model_rel');
    expect(vehicleSource.error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_VEHICLES_UNAVAILABLE' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('vehicles')).toContain('fleet_vehicles');
  });

  test('filters only the selected model, preserves company scope, and replays durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_vehicle_action', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_model_vehicle_action', ['schema', 'data']);

    const source = yaml('api/vehicles.yaml').datasources.find((entry: any) => entry.id === 'fleet_vehicles');
    const params = { q: null, model_id: 'fleet-model-001', state: null, vehicle_type: null, trailer_hook: null, archived: null, company_name: 'Core3 Demo Company', fixture_state: null };
    const focusVehicles = await repository.querySource(source, params, 0, 50);
    expect(focusVehicles.data).toMatchObject([{ id: 'fleet-demo-001', name: 'Pool Vehicle 01' }]);
    expect((await repository.querySource(source, { ...params, model_id: 'fleet-model-002' }, 0, 50)).data).toMatchObject([{ id: 'fleet-demo-002' }]);
    expect((await repository.querySource(source, { ...params, model_id: 'fleet-model-missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, company_name: 'Core3 Vietnam' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_VEHICLES_UNAVAILABLE' });

    const relation = await repository.query('SELECT vehicle_id, model_id FROM fleet_vehicle_model_rel ORDER BY vehicle_id');
    expect(relation).toEqual([
      { vehicle_id: 'fleet-demo-001', model_id: 'fleet-model-001' },
      { vehicle_id: 'fleet-demo-002', model_id: 'fleet-model-002' },
      { vehicle_id: 'fleet-demo-003', model_id: 'fleet-model-003' },
    ]);
    database.close();
  });
});
