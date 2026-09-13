import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet vehicle company scope and restart durability', () => {
  test('keeps foreign-company vehicles out of list/detail and blocks edits', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_scope', ['schema', 'data']);
    await repository.query("INSERT INTO fleet_vehicles (id, name, license_plate, vehicle_type, company_name) VALUES ('fleet-other-001', 'Other Company Van', 'OTHER-001', 'Car', 'Other Company')");
    const list = yaml('api/vehicles.yaml').datasources.find((source: any) => source.id === 'fleet_vehicles');
    const detail = yaml('api/vehicle-detail.yaml').datasources[0];
    expect((await repository.querySource(list, { q: null, state: null, vehicle_type: null, trailer_hook: null, archived: null, company_name: 'Core3 Demo Company' }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ id: 'fleet-other-001' }));
    expect((await repository.querySource(detail, { id: 'fleet-other-001', company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});
    const edit = yaml('api/vehicle-detail.yaml').actions.find((action: any) => action.id === 'edit_fleet_vehicle');
    await expect(repository.executeMutation(edit.mutation, { id: 'fleet-other-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { name: 'Leaked Edit', license_plate: 'OTHER-001', vehicle_type: 'Car' } })).rejects.toMatchObject({ status: 403, code: 'FLEET_VEHICLE_COMPANY_SCOPE_REQUIRED' });
    expect((await repository.query('SELECT name FROM fleet_vehicles WHERE id = ?', ['fleet-other-001']))[0].name).toBe('Other Company Van');
    const create = yaml('api/vehicles.yaml').actions.find((action: any) => action.id === 'create_fleet_vehicle');
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'Core3 Demo Company', values: { name: 'Scoped New Vehicle', license_plate: 'SCOPED-001', vehicle_type: 'Car' } });
    expect(created).toMatchObject({ name: 'Scoped New Vehicle' });
    expect((await repository.query('SELECT company_name FROM fleet_vehicles WHERE id = ?', [created.id]))[0].company_name).toBe('Core3 Demo Company');
    database.close();
  });

  test('preserves a scoped vehicle edit across file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-fleet-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const edit = yaml('api/vehicle-detail.yaml').actions.find((action: any) => action.id === 'edit_fleet_vehicle');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(edit.mutation, { id: 'fleet-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { name: 'Restart Durable Fleet Vehicle', license_plate: 'RESTART-001', vehicle_type: 'Car', company_name: 'Core3 Demo Company', odometer: 13001 } });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, license_plate, company_name, row_version FROM fleet_vehicles WHERE id = ?', ['fleet-demo-001']))[0]).toMatchObject({ name: 'Restart Durable Fleet Vehicle', license_plate: 'RESTART-001', company_name: 'Core3 Demo Company', row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
