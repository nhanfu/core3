import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet Apply New Driver parity state', () => {
  test('maps Odoo action_accept_driver_change and keeps the page/API pair joined', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    expect(source).toContain('string="Apply New Driver"');
    expect(source).toContain('name="action_accept_driver_change"');
    expect(model).toContain('def action_accept_driver_change(self):');
    expect(page.page.id).toBe('vehicle-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'action_accept_driver_change', label: 'Apply New Driver' }));
    expect(api.actions.find((action: any) => action.id === 'action_accept_driver_change').permission).toBe('fleet.write');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
  });

  test('seeds a deterministic future driver and applies it with 404/409 guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_driver_change', ['schema', 'data']);
    const api = yaml('api/vehicle-detail.yaml');
    const detail = api.datasources[0];
    expect((await repository.querySource(detail, { id: 'fleet-demo-002' }, 0, 1)).data).toMatchObject({ future_driver_name: 'Doris Cole', next_assignation_date: '2026-02-01' });
    expect((await repository.querySource(detail, { id: 'fleet-demo-002', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(detail, { id: 'missing-vehicle', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'fleet-demo-002', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'FLEET_VEHICLE_DETAIL_UNAVAILABLE' });
    const action = api.actions.find((entry: any) => entry.id === 'action_accept_driver_change');
    const updated = await repository.executeMutation(action.mutation, { id: 'fleet-demo-002', expected_row_version: 1 });
    expect(updated).toMatchObject({ driver_name: 'Doris Cole', future_driver_name: null, next_assignation_date: null, row_version: 2 });
    await expect(repository.executeMutation(action.mutation, { id: 'fleet-demo-002', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'FLEET_DRIVER_CHANGE_NOT_PLANNED' });
    await expect(repository.executeMutation(action.mutation, { id: 'missing-vehicle', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_NOT_FOUND' });
    database.close();
  });
});
