import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('Fleet vehicle archive action parity', () => {
  test('maps the Odoo Fleet action and keeps page/API ownership explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    expect(source).toContain("<record id='fleet_vehicle_action'");
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    expect(page.page).toMatchObject({ id: 'vehicle-detail', route: '/vehicles/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'archive_fleet_vehicle', label: 'Archive', permission: 'fleet.write' }),
      expect.objectContaining({ id: 'unarchive_fleet_vehicle', label: 'Restore', permission: 'fleet.write' }),
    ]));
    expect(action(api, 'archive_fleet_vehicle')).toMatchObject({ permission: 'fleet.write', action: 'fleet.vehicles.archive' });
    expect(action(api, 'unarchive_fleet_vehicle')).toMatchObject({ permission: 'fleet.write', action: 'fleet.vehicles.unarchive' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('vehicle-detail')).toContain('fleet_vehicle_detail');
  });

  test('seeds active and archived vehicles idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_archive_fixture', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_archive_fixture', ['schema', 'data']);
    const list = yaml('api/vehicles.yaml').datasources.find((entry: any) => entry.id === 'fleet_vehicles');
    expect((await repository.querySource(list, { q: null, state: null, vehicle_type: null, trailer_hook: null, archived: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['City Bike 02', 'Pool Vehicle 01']);
    expect((await repository.querySource(list, { q: 'Workshop', state: null, vehicle_type: null, trailer_hook: null, archived: true }, 0, 50)).data).toMatchObject([{ name: 'Workshop Van 04', archived: true }]);
    database.close();
  });

  test('supports guarded archive and restore state transitions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_archive_mutations', ['schema', 'data']);
    const api = yaml('api/vehicle-detail.yaml');
    const archive = action(api, 'archive_fleet_vehicle');
    const restore = action(api, 'unarchive_fleet_vehicle');
    const archived = await repository.executeMutation(archive.mutation, { id: 'fleet-demo-002', expected_row_version: 1, values: { archived: true } });
    expect(archived).toMatchObject({ id: 'fleet-demo-002', archived: true, row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: 'fleet-demo-002', expected_row_version: 2, values: { archived: true } })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_NOT_ACTIVE' });
    await expect(repository.executeMutation(restore.mutation, { id: 'fleet-demo-002', expected_row_version: 1, values: { archived: false } })).rejects.toMatchObject({ status: 409 });
    const restored = await repository.executeMutation(restore.mutation, { id: 'fleet-demo-002', expected_row_version: 2, values: { archived: false } });
    expect(restored).toMatchObject({ id: 'fleet-demo-002', archived: false, row_version: 3 });
    await expect(repository.executeMutation(restore.mutation, { id: 'missing-vehicle', expected_row_version: 1, values: { archived: false } })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_NOT_ARCHIVED' });
    database.close();
  });
});
