import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Fleet vehicle create contract', () => {
  test('exposes every persisted vehicle field in the create form', () => {
    const create = yaml('api/vehicles.yaml').actions.find((entry: any) => entry.id === 'create_fleet_vehicle');
    expect(create.fields.map((field: any) => field.field)).toEqual([
      'name', 'license_plate', 'vehicle_type', 'model', 'manufacturer',
      'driver_name', 'odometer', 'fuel_type', 'acquisition_date',
      'contract_end_date', 'trailer_hook', 'company_name',
    ]);
    expect(create.mutation.fields).toEqual(expect.arrayContaining(['acquisition_date', 'trailer_hook']));
  });

  test('persists a valid vehicle with database defaults and survives a reload query', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_vehicle_create_persistence', ['schema', 'data']);
    const create = yaml('api/vehicles.yaml').actions.find((entry: any) => entry.id === 'create_fleet_vehicle');

    const created = await repository.executeMutation(create.mutation, {
      values: {
        name: 'QA Fleet Shuttle',
        license_plate: 'QA-FLEET-001',
        vehicle_type: 'Car',
        odometer: 12.5,
        acquisition_date: '2026-02-01',
        contract_end_date: '2026-12-31',
        trailer_hook: true,
      },
    });
    expect(created).toMatchObject({
      name: 'QA Fleet Shuttle',
      license_plate: 'QA-FLEET-001',
      vehicle_type: 'Car',
      odometer: 12.5,
      trailer_hook: true,
    });

    const list = yaml('api/vehicles.yaml').datasources.find((entry: any) => entry.id === 'fleet_vehicles');
    const reloaded = await repository.querySource(list, { q: 'QA Fleet Shuttle', state: null, vehicle_type: null, trailer_hook: null, archived: null }, 0, 50);
    expect(reloaded.data).toEqual([expect.objectContaining({ id: created.id, license_plate: 'QA-FLEET-001', contract_end_date: '2026-12-31' })]);
    database.close();
  });

  test('rejects a replayed create after a file-backed restart without duplicating the vehicle', async () => {
    const databasePath = `/tmp/core3-fleet-create-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_create_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/vehicles.yaml').actions.find((entry: any) => entry.id === 'create_fleet_vehicle');
    const values = {
      name: 'Restart Durable Fleet Shuttle',
      license_plate: 'RESTART-CREATE-001',
      vehicle_type: 'Car',
      odometer: 42,
      company_name: 'Core3 Demo Company',
    };

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Demo Company',
      values,
    });
    expect(created).toMatchObject({ name: values.name, license_plate: values.license_plate });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await expect(secondRepository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Demo Company',
      values,
    })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_NAME_EXISTS' });

    const rows = await secondRepository.query<{ id: string; row_version: number }>(
      'SELECT id, row_version FROM fleet_vehicles WHERE name = ? AND license_plate = ?',
      [values.name, values.license_plate],
    );
    expect(rows).toEqual([{ id: created.id, row_version: 1 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('returns stable validation and duplicate errors before insert', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_vehicle_create_guards', ['schema', 'data']);
    const create = yaml('api/vehicles.yaml').actions.find((entry: any) => entry.id === 'create_fleet_vehicle');
    const base = { name: 'Pool Vehicle 01', license_plate: 'NEW-PLATE', vehicle_type: 'Car' };

    await expect(repository.executeMutation(create.mutation, { values: { ...base, name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, license_plate: ' ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_LICENSE_PLATE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, vehicle_type: 'Truck' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, odometer: -1 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_ODOMETER_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, acquisition_date: '2026-12-31', contract_end_date: '2026-01-01' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_DATES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, name: ' pool vehicle 01 ' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...base, name: 'Unique Vehicle', license_plate: '51A-000.01' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_LICENSE_PLATE_EXISTS' });

    const count = await repository.query<{ count: number }>('SELECT COUNT(*) AS count FROM fleet_vehicles');
    expect(Number(count[0].count)).toBe(4);
    database.close();
  });
});
