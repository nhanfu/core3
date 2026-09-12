import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet Drivers History / Assignment Logs parity', () => {
  test('maps the source stat action and keeps the hidden page/API route joined', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_assignation_log.py', 'utf8');
    expect(source).toContain('name="open_assignation_logs"');
    expect(source).toContain('string="Drivers History"');
    expect(source).toContain('string="Assignment Logs" editable="bottom"');
    expect(model).toContain("_name = 'fleet.vehicle.assignation.log'");
    expect(model).toContain('date_start = fields.Date');
    expect(model).toContain('date_end = fields.Date');

    const page = yaml('pages/assignment-logs.yaml');
    const api = yaml('api/assignment-logs.yaml');
    const vehiclePage = yaml('pages/vehicle-detail.yaml');
    const vehicleApi = yaml('api/vehicle-detail.yaml');
    expect(page.page).toMatchObject({ id: 'fleet-assignment-logs', route: '/fleet/vehicles/assignment-logs', auth: { require: ['fleet.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_vehicle_assignment_logs' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Vehicle', 'Current Driver', 'Start Date', 'End Date']);
    expect(vehiclePage.components[0].stat_buttons).toContainEqual({ id: 'open_fleet_vehicle_assignment_logs', label: 'Drivers History', value_field: 'assignment_count', permission: 'fleet.read' });
    expect(action(vehicleApi, 'open_fleet_vehicle_assignment_logs')).toMatchObject({ type: 'navigate', navigate_to: '/fleet/vehicles/assignment-logs' });
    expect(api.datasources[1].permission).toBe('fleet.read');
    expect([action(api, 'create_fleet_vehicle_assignment_log'), action(api, 'update_fleet_vehicle_assignment_log'), action(api, 'delete_fleet_vehicle_assignment_log')].every((entry: any) => entry.permission === 'fleet.write')).toBe(true);
    const pages = discoverPages(join(import.meta.dir, '..'));
    expect(pages.pageDatasources.get('fleet-assignment-logs')).toEqual(['fleet_assignment_log_vehicles', 'fleet_vehicle_assignment_logs']);
    expect(discoverPageRoutes(pages)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/fleet/vehicles/assignment-logs', page: 'fleet-assignment-logs', module: 'fleet' })]));
  });

  test('seeds six latest-first logs, vehicle filtering, empty state, and transport error', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_assignment_log_state', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_assignment_log_state', ['schema', 'data']);
    const source = yaml('api/assignment-logs.yaml').datasources[1];
    const params = { q: null, vehicle_id: null, fixture_state: null };
    const all = await repository.querySource(source, params, 0, 50);
    expect(all.data).toHaveLength(6);
    expect(all.data.map((row: any) => row.driver_name)).toEqual(['Doris Cole', 'Audrey Peterson', 'Beth Evans', 'Abigail Peterson', 'Marc Demo', 'Beth Evans']);
    expect(all.data[0]).toMatchObject({ vehicle_name: 'City Bike 02', date_start: '2026-09-10', date_end: null });
    expect((await repository.querySource(source, { ...params, vehicle_id: 'fleet-demo-001' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, q: 'No such driver' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'FLEET_ASSIGNMENT_LOGS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'FLEET_ASSIGNMENT_LOGS_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_ASSIGNMENT_LOGS_UNAVAILABLE' });
    database.close();
  });

  test('supports create/update/delete with relation, date, stale-write, and missing-row guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_assignment_log_mutations', ['schema', 'data']);
    const api = yaml('api/assignment-logs.yaml');
    const create = action(api, 'create_fleet_vehicle_assignment_log');
    const update = action(api, 'update_fleet_vehicle_assignment_log');
    const remove = action(api, 'delete_fleet_vehicle_assignment_log');
    const values = { vehicle_id: 'fleet-demo-001', driver_name: 'Core3 Driver', date_start: '2026-02-01', date_end: null };
    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ vehicle_id: values.vehicle_id, driver_name: values.driver_name, row_version: 1 });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { ...values, driver_name: 'Core3 Driver Updated' } });
    expect(edited).toMatchObject({ row_version: 2, driver_name: 'Core3 Driver Updated' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, vehicle_id: 'missing-vehicle' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_ASSIGNMENT_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, driver_name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ASSIGNMENT_DRIVER_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, date_start: '2026-03-01', date_end: '2026-02-01' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ASSIGNMENT_DATE_INVALID' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-assignment', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'FLEET_ASSIGNMENT_LOG_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404 });
    database.close();
  });

  test('uses deterministic timestamps and no generated UUID or current date', () => {
    const files = ['migrations/20260912100000-029-fleet-assignment-logs-schema.yaml', 'migrations/20260912101000-030-fleet-assignment-logs-data.yaml', 'api/assignment-logs.yaml'].map(file => readFileSync(join(root, file), 'utf8')).join('\n');
    expect(files).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(files).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
