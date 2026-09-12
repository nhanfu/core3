import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet vehicle Services stat action parity', () => {
  test('maps Odoo service activity states and the shared target action', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    expect(source.match(/string="Services"/g)).toHaveLength(3);
    expect(source.match(/xml_id':'fleet_vehicle_log_services_action/g)).toHaveLength(3);
    expect(source).toContain('invisible="service_activity != \'none\'"');
    expect(source).toContain('invisible="service_activity != \'overdue\'"');
    expect(source).toContain('invisible="service_activity != \'today\'"');
    expect(model).toContain("service_activity = fields.Selection");
    expect(model).toContain("('overdue', 'Overdue')");
    expect(model).toContain("('today', 'Today')");
    expect(page.components[0].stat_buttons.filter((entry: any) => entry.label === 'Services')).toHaveLength(3);
    for (const id of ['open_fleet_vehicle_services', 'open_fleet_vehicle_services_overdue', 'open_fleet_vehicle_services_today']) {
      expect(action(api, id)).toMatchObject({ type: 'navigate', permission: 'fleet.read', navigate_to: '/fleet/services', params: { vehicle_id: '{state.id}', search_default_inactive: '{state.archived}' } });
    }
    expect(yaml('api/services.yaml').page.id).toBe('fleet-services');
  });

  test('returns a deterministic active-service count and explicit activity state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_services_action', ['schema', 'data']);
    const source = yaml('api/vehicle-detail.yaml').datasources[0];
    const row = await repository.querySource(source, { id: 'fleet-demo-001', fixture_state: null }, 0, 1);
    expect(row.data).toMatchObject({ service_count: 4, service_activity: 'none' });
    database.close();
  });
});
