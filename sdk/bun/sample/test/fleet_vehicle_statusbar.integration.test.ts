import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('Fleet vehicle clickable statusbar parity', () => {
  test('maps the Odoo clickable state_id field through the vehicle page/API seam', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    expect(source).toContain('field name="state_id"  widget="statusbar" options="{\'clickable\': \'1\'}"');
    expect(page.page.id).toBe('vehicle-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].statusbar_actions).toEqual({
      Available: 'set_fleet_vehicle_status_available',
      Assigned: 'set_fleet_vehicle_status_assigned',
      Maintenance: 'set_fleet_vehicle_status_maintenance',
      Retired: 'set_fleet_vehicle_status_retired',
    });
    for (const [status, id] of Object.entries(page.components[0].statusbar_actions)) {
      expect(action(api, id)).toMatchObject({ permission: 'fleet.write', operation: 'update', action: 'fleet.vehicles.status' });
      expect(action(api, id).params.values.state).toBe(status);
    }
  });

  test('persists direct statusbar changes and rejects stale, invalid, and out-of-scope writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_statusbar', ['schema', 'data']);
    const api = yaml('api/vehicle-detail.yaml');
    const maintenance = action(api, 'set_fleet_vehicle_status_maintenance');
    const available = action(api, 'set_fleet_vehicle_status_available');
    const updated = await repository.executeMutation(maintenance.mutation, { id: 'fleet-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', state: 'Maintenance' });
    expect(updated).toMatchObject({ id: 'fleet-demo-002', state: 'Maintenance', row_version: 2 });
    await expect(repository.executeMutation(available.mutation, { id: 'fleet-demo-002', expected_row_version: 1, current_company_name: 'Core3 Demo Company', state: 'Available' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(maintenance.mutation, { id: 'fleet-demo-002', expected_row_version: 2, current_company_name: 'Other Company', state: 'Maintenance' })).rejects.toMatchObject({ status: 403, code: 'FLEET_VEHICLE_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(maintenance.mutation, { id: 'fleet-demo-002', expected_row_version: 2, current_company_name: 'Core3 Demo Company', state: 'Missing' })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_STATUS_INVALID' });
    const reloaded = await repository.query('SELECT state, row_version FROM fleet_vehicles WHERE id = ?', ['fleet-demo-002']);
    expect(reloaded).toEqual([{ state: 'Maintenance', row_version: 2 }]);
    database.close();
  });
});
