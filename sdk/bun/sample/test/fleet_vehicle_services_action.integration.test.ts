import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
    expect(page.components[0].stat_buttons.filter((entry: any) => entry.label === 'Services').map((entry: any) => entry.show_if)).toEqual([
      "state.service_activity === 'none'",
      "state.service_activity === 'overdue'",
      "state.service_activity === 'today'",
    ]);
    for (const id of ['open_fleet_vehicle_services', 'open_fleet_vehicle_services_overdue', 'open_fleet_vehicle_services_today']) {
      expect(action(api, id)).toMatchObject({ type: 'navigate', permission: 'fleet.read', navigate_to: '/fleet/services', params: { vehicle_id: '{state.id}', search_default_inactive: '{state.archived}' } });
    }
    expect(yaml('api/services.yaml').page.id).toBe('fleet-services');
  });

  test('derives persisted activity states from service dates and active/archive state', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-fleet-service-activity-'));
    const path = join(directory, 'fleet.duckdb');
    const database = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_services_action', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_services_action', ['schema', 'data']);
    const source = yaml('api/vehicle-detail.yaml').datasources[0];
    const overdue = await repository.querySource(source, { id: 'fleet-demo-001', fixture_state: null }, 0, 1);
    const today = await repository.querySource(source, { id: 'fleet-demo-002', fixture_state: null }, 0, 1);
    const none = await repository.querySource(source, { id: 'fleet-demo-003', fixture_state: null }, 0, 1);
    expect(overdue.data).toMatchObject({ service_count: 4, service_activity: 'overdue' });
    expect(today.data).toMatchObject({ service_count: 2, service_activity: 'today' });
    expect(none.data).toMatchObject({ service_count: 0, service_activity: 'none' });
    expect(await repository.query('SELECT id, service_activity FROM fleet_vehicles WHERE id IN (?, ?, ?) ORDER BY id', ['fleet-demo-001', 'fleet-demo-002', 'fleet-demo-003'])).toEqual([
      { id: 'fleet-demo-001', service_activity: 'overdue' },
      { id: 'fleet-demo-002', service_activity: 'today' },
      { id: 'fleet-demo-003', service_activity: 'none' },
    ]);
    expect((await repository.querySource(source, { id: 'fleet-demo-001', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { id: 'missing-fleet-vehicle', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
    const reopened = await DuckDbDatabase.open(path);
    const reopenedRepository = new YamlRepository(reopened);
    const reopenedRow = await reopenedRepository.querySource(source, { id: 'fleet-demo-002', fixture_state: null }, 0, 1);
    expect(reopenedRow.data).toMatchObject({ service_count: 2, service_activity: 'today' });
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
