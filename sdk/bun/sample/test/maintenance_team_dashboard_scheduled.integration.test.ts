import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance team dashboard Scheduled action parity', () => {
  test('binds the Odoo Scheduled card action to the calendar route and team facet', () => {
    const page = yaml('pages/dashboard.yaml');
    const api = yaml('api/dashboard.yaml');
    const calendar = yaml('api/calendar.yaml');
    const card = page.components[0].views[0].card;

    expect(card.actions).toContainEqual({
      id: 'open_maintenance_team_scheduled_requests',
      label: 'Scheduled',
      label_field: 'scheduled_count',
      show_if: 'row.scheduled_count > 0',
    });
    expect(api.actions).toContainEqual({
      id: 'open_maintenance_team_scheduled_requests',
      type: 'navigate',
      permission: 'maintenance.read',
      navigate_to: '/maintenance-calendar',
      params: { team_id: '{row.id}', todo: true },
    });
    expect(calendar.page).toEqual({ id: 'maintenance-calendar' });
    expect(calendar.datasources.find((source: any) => source.id === 'maintenance_calendar').query)
      .toContain(':team_id');
    expect(calendar.datasources.find((source: any) => source.id === 'maintenance_calendar').query)
      .toContain(':todo');
  });

  test('returns only scheduled, active, non-terminal requests for the selected team', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_dashboard_scheduled_migrations', ['schema', 'data']);
    const dashboard = yaml('api/dashboard.yaml');
    const calendar = yaml('api/calendar.yaml');
    const dashboardSource = dashboard.datasources.find((source: any) => source.id === 'maintenance_dashboard_teams');
    const calendarSource = calendar.datasources.find((source: any) => source.id === 'maintenance_calendar');
    const dashboardRows = await repository.querySource(dashboardSource, { q: null, active: 'active', fixture_state: null }, 0, 50);
    const metrology = dashboardRows.data.find((row: any) => row.id === 'maintenance-team-metrology');
    expect(metrology).toMatchObject({ todo_count: 1, scheduled_count: 1, unscheduled_count: 0 });

    const params = { q: null, team_id: 'maintenance-team-metrology', todo: true, state: null, priority: null, archived: null, fixture_state: null };
    expect((await repository.querySource(calendarSource, params, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['maintenance-demo-001']);
    expect((await repository.querySource(calendarSource, { ...params, fixture_state: 'empty' }, 0, 50)).data)
      .toEqual([]);
    expect(calendarSource.permission).toBe('maintenance.read');
    expect(calendarSource.error_states.transport_error).toMatchObject({ status: 503, code: 'MAINTENANCE_DATA_UNAVAILABLE' });
    database.close();
  });
});
