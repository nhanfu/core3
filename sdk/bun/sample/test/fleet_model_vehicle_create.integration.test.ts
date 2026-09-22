import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);
const migrate = (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

const createInput = (overrides: Record<string, unknown> = {}) => {
  const {
    default_model_id = 'fleet-model-007',
    expected_model_row_version = 1,
    current_company_name = 'Core3 Demo Company',
    ...valueOverrides
  } = overrides;
  return {
  default_model_id,
  expected_model_row_version,
  current_company_name,
  values: {
    name: 'Ranger Zero 01',
    license_plate: 'RZR-0007',
    odometer: 10,
    fuel_type: 'Diesel',
    acquisition_date: '2026-01-15',
    contract_end_date: '2026-12-31',
    trailer_hook: true,
    company_name: 'Core3 Demo Company',
    ...valueOverrides,
  },
  };
};

describe('Fleet model action_model_vehicle zero-vehicle branch', () => {
  test('maps the Odoo zero-count form branch to the model-detail page/API seam', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py', 'utf8');
    const page = yaml('pages/model-detail.yaml');
    const api = yaml('api/model-detail.yaml');
    const buttons = page.components[0].stat_buttons;
    const listAction = action(api, 'view_fleet_model_vehicles');
    const create = action(api, 'create_fleet_vehicle_for_model');

    expect(source).toContain('name="action_model_vehicle"');
    expect(source).toContain('<span class="o_stat_value">New</span>');
    expect(model).toContain("context = {'default_model_id': self.id}");
    expect(model).toContain("view_mode = 'form'");
    expect(page.page.id).toBe('model-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(buttons).toContainEqual(expect.objectContaining({ id: 'view_fleet_model_vehicles', show_if: 'state.fleet_model_detail.vehicle_count > 0' }));
    expect(buttons).toContainEqual(expect.objectContaining({ id: 'create_fleet_vehicle_for_model', label: 'New Vehicle', show_if: 'state.fleet_model_detail.vehicle_count === 0' }));
    expect(listAction).toMatchObject({ permission: 'fleet.read', navigate_to: '/vehicles', params: { model_id: '{state.fleet_model_detail.id}', default_model_id: '{state.fleet_model_detail.id}' } });
    expect(create).toMatchObject({
      type: 'server_form',
      permission: 'fleet.write',
      action: 'fleet.vehicle.model.action_model_vehicle.create',
      params: { default_model_id: '{state.fleet_model_detail.id}', expected_model_row_version: '{state.fleet_model_detail.row_version}' },
    });
    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'fleet_vehicles' });
    expect(create.mutation.steps.map((step: any) => step.query)).toEqual(expect.arrayContaining([
      expect.stringContaining('INSERT INTO fleet_vehicle_model_rel'),
      expect.stringContaining('UPDATE fleet_vehicle_models SET vehicle_count'),
    ]));
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('model-detail')).toContain('fleet_model_detail');
  });

  test('creates a durable vehicle from the default model and replays migrations', async () => {
    const databasePath = `/tmp/core3-fleet-model-vehicle-create-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'fleet_model_vehicle_create');
    const create = action(yaml('api/model-detail.yaml'), 'create_fleet_vehicle_for_model');

    expect(await firstRepository.query("SELECT id, vehicle_count, row_version FROM fleet_vehicle_models WHERE id = 'fleet-model-007'")).toEqual([
      { id: 'fleet-model-007', vehicle_count: 0, row_version: 1 },
    ]);
    const created = await firstRepository.executeMutation(create.mutation, createInput());
    expect(created).toMatchObject({
      id: 'fleet-model-vehicle-fleet-model-007-1',
      name: 'Ranger Zero 01',
      license_plate: 'RZR-0007',
      vehicle_type: 'Car',
      model: 'Ranger Zero',
      manufacturer: 'Ford',
      model_id: 'fleet-model-007',
    });
    expect(await firstRepository.query("SELECT vehicle_count, row_version FROM fleet_vehicle_models WHERE id = 'fleet-model-007'")).toEqual([{ vehicle_count: 1, row_version: 2 }]);
    expect(await firstRepository.query("SELECT vehicle_id, model_id FROM fleet_vehicle_model_rel WHERE model_id = 'fleet-model-007'")).toEqual([
      { vehicle_id: 'fleet-model-vehicle-fleet-model-007-1', model_id: 'fleet-model-007' },
    ]);
    await first.close();

    const restarted = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restarted);
    await migrate(restartedRepository, 'fleet_model_vehicle_create');
    expect(await restartedRepository.query("SELECT id, model, manufacturer FROM fleet_vehicles WHERE id = 'fleet-model-vehicle-fleet-model-007-1'")).toEqual([
      { id: 'fleet-model-vehicle-fleet-model-007-1', model: 'Ranger Zero', manufacturer: 'Ford' },
    ]);
    expect(await restartedRepository.query("SELECT vehicle_count FROM fleet_vehicle_models WHERE id = 'fleet-model-007'")).toEqual([{ vehicle_count: 1 }]);
    await restarted.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces active zero-count, model-version, company, duplicate, date, and field guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_model_vehicle_create_guards');
    const create = action(yaml('api/model-detail.yaml'), 'create_fleet_vehicle_for_model');

    await expect(repository.executeMutation(create.mutation, createInput({ name: ' ', license_plate: 'BAD-0001' }))).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: ' ', acquisition_date: 'not-a-date' }))).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_LICENSE_PLATE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', odometer: -1 }))).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_ODOMETER_INVALID' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', acquisition_date: '2026-12-31', contract_end_date: '2026-01-01' }))).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_DATES_INVALID' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', current_company_name: 'Core3 Vietnam' }))).rejects.toMatchObject({ status: 403, code: 'FLEET_VEHICLE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', expected_model_row_version: 99 }))).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', default_model_id: 'fleet-model-006' }))).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_NOT_FOUND' });

    await repository.executeMutation(create.mutation, createInput());
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Ranger Zero 02', license_plate: 'RZR-0008', expected_model_row_version: 2 }))).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_VEHICLES_EXIST' });
    await expect(repository.executeMutation(create.mutation, createInput({ name: 'Duplicate name', license_plate: 'RZR-0009', default_model_id: 'fleet-model-007', expected_model_row_version: 1 }))).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_VEHICLES_EXIST' });
    await database.close();
  });
});
