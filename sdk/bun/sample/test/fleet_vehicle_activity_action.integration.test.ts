import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Fleet vehicle Activity action parity', () => {
  test('maps Odoo fleet_vehicle_action activity mode through the page/API seam', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicles.yaml');
    const api = yaml('api/vehicles.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const activity = list.views.find((view: any) => view.id === 'activity');
    const action = api.actions.find((candidate: any) => candidate.id === 'schedule_fleet_vehicle_activity');
    const sourceRows = api.datasources.find((candidate: any) => candidate.id === 'fleet_vehicles');

    expect(source).toContain('<field name="view_mode">kanban,list,form,pivot,activity</field>');
    expect(page.page).toMatchObject({ id: 'vehicles', route: '/vehicles', auth: { require: ['fleet.read'] } });
    expect(api.page).toEqual({ id: 'vehicles' });
    expect(page.datasources).toBeUndefined();
    expect(activity).toMatchObject({
      id: 'activity',
      title_field: 'name',
      subtitle_field: 'license_plate',
      record_date_field: 'activity_date',
      schedule_action: 'schedule_fleet_vehicle_activity',
      empty_cell_action: 'schedule_fleet_vehicle_activity',
    });
    expect(activity.activity_types.map((type: any) => type.id)).toEqual(['todo', 'email', 'call', 'meeting']);
    expect(String(sourceRows.query)).toContain('LEFT JOIN LATERAL');
    expect(String(sourceRows.query)).toContain('activity_row_version');
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'fleet.write',
      action: 'fleet.vehicles.activity.schedule',
      operation: 'update',
    });
    expect(action.mutation.concurrency).toEqual({ required: true });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'FLEET_VEHICLE_ACTIVITY_NOT_FOUND',
      'STALE_RECORD',
      'FLEET_VEHICLE_ACTIVITY_TYPE_INVALID',
      'FLEET_VEHICLE_ACTIVITY_SUMMARY_REQUIRED',
      'FLEET_VEHICLE_ACTIVITY_DATE_INVALID',
    ]);
  });

  test('replays durable vehicle activities and exposes deterministic activity rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_vehicle_activity_action', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_vehicle_activity_action', ['schema', 'data']);

    const source = yaml('api/vehicles.yaml').datasources.find((candidate: any) => candidate.id === 'fleet_vehicles');
    const result = await repository.querySource(source, {
      q: null,
      state: null,
      vehicle_type: null,
      trailer_hook: null,
      archived: false,
      company_name: null,
    }, 0, 50);
    expect(result.data.filter((row: any) => row.activity_id)).toHaveLength(2);
    expect(result.data.filter((row: any) => row.activity_id).map((row: any) => ({ id: row.activity_id, row_version: row.activity_row_version }))).toEqual([
      { id: 'fleet-vehicle-activity-002', row_version: 1 },
      { id: 'fleet-vehicle-activity-001', row_version: 1 },
    ]);
    expect(result.data.find((row: any) => row.id === 'fleet-demo-001')).toMatchObject({
      activity_type: 'todo',
      activity_summary: 'Review vehicle insurance',
      activity_date: '2026-09-30',
      activity_state: 'planned',
      activity_count: 1,
    });
    expect(result.data.find((row: any) => row.id === 'fleet-demo-002')).toMatchObject({
      activity_type: 'email',
      activity_state: 'overdue',
      activity_count: 1,
    });
    expect((await repository.querySource(source, { q: 'insurance', state: null, vehicle_type: null, trailer_hook: null, archived: false, company_name: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['fleet-demo-001']);
    database.close();
  });

  test('schedules with actor, company, validation, and stale-write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_vehicle_activity_mutations', ['schema', 'data']);
    const action = yaml('api/vehicles.yaml').actions.find((candidate: any) => candidate.id === 'schedule_fleet_vehicle_activity');
    const values = { activity_type: 'call', summary: 'Call the assigned driver', due_date: '2026-10-03', assigned_user: 'Admin User' };

    const updated = await repository.executeMutation(action.mutation, {
      id: 'fleet-vehicle-activity-001',
      expected_row_version: 1,
      current_company_name: 'Core3 Demo Company',
      values,
    });
    expect(updated).toMatchObject({ id: 'fleet-vehicle-activity-001', row_version: 2, activity_type: 'call', summary: values.summary, due_date: '2026-10-03' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'fleet-vehicle-activity-001',
      expected_row_version: 1,
      current_company_name: 'Core3 Demo Company',
      values,
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'fleet-vehicle-activity-001',
      expected_row_version: 2,
      current_company_name: 'Other Company',
      values,
    })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_ACTIVITY_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'fleet-vehicle-activity-001',
      expected_row_version: 2,
      current_company_name: 'Core3 Demo Company',
      values: { ...values, activity_type: 'invalid' },
    })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'fleet-vehicle-activity-001',
      expected_row_version: 2,
      current_company_name: 'Core3 Demo Company',
      values: { ...values, due_date: 'tomorrow' },
    })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_ACTIVITY_DATE_INVALID' });
    database.close();
  });
});
