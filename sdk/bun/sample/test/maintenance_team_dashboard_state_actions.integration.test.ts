import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance team dashboard state actions parity', () => {
  test('binds Blocked and Unscheduled actions to page-owned request facets', () => {
    const page = yaml('pages/dashboard.yaml');
    const requestPage = yaml('pages/requests.yaml');
    const api = yaml('api/dashboard.yaml');
    const requests = yaml('api/requests.yaml');
    const card = page.components[0].views[0].card;

    expect(card.actions).toContainEqual({
      id: 'open_maintenance_team_blocked_requests',
      label: 'Blocked',
      label_field: 'blocked_count',
      show_if: 'row.blocked_count > 0',
    });
    expect(card.actions).toContainEqual({
      id: 'open_maintenance_team_unscheduled_requests',
      label: 'Unscheduled',
      label_field: 'unscheduled_count',
      show_if: 'row.unscheduled_count > 0',
    });
    expect(api.actions).toContainEqual({
      id: 'open_maintenance_team_blocked_requests',
      type: 'navigate',
      permission: 'maintenance.read',
      navigate_to: '/maintenance-requests',
      params: { team_id: '{row.id}', todo: true, kanban_state: 'blocked' },
    });
    expect(api.actions).toContainEqual({
      id: 'open_maintenance_team_unscheduled_requests',
      type: 'navigate',
      permission: 'maintenance.read',
      navigate_to: '/maintenance-requests',
      params: { team_id: '{row.id}', todo: true, unscheduled: true },
    });
    expect(requestPage.components[0].filters).toContainEqual(expect.objectContaining({ field: 'kanban_state', label: 'Kanban state' }));
    expect(requestPage.components[0].filters).toContainEqual(expect.objectContaining({ field: 'unscheduled', label: 'Scheduling' }));
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').permission).toBe('maintenance.read');
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':kanban_state');
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':unscheduled');
  });

  test('returns only active non-terminal requests matching the selected state facet', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_dashboard_state_actions_migrations', ['schema', 'data']);
    const dashboard = yaml('api/dashboard.yaml');
    const requests = yaml('api/requests.yaml');
    const dashboardSource = dashboard.datasources.find((source: any) => source.id === 'maintenance_dashboard_teams');
    const requestSource = requests.datasources.find((source: any) => source.id === 'maintenance_requests');
    const rows = await repository.querySource(dashboardSource, { q: null, active: 'active', fixture_state: null }, 0, 50);
    expect(rows.data.find((row: any) => row.id === 'maintenance-team-subcontractor')).toMatchObject({ blocked_count: 1, unscheduled_count: 1 });

    const base = { q: null, equipment_id: null, category_id: null, team_id: 'maintenance-team-subcontractor', todo: true, state: null, kanban_state: null, priority: null, unscheduled: false, archived: null, fixture_state: null };
    expect((await repository.querySource(requestSource, { ...base, kanban_state: 'blocked' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    expect((await repository.querySource(requestSource, { ...base, unscheduled: true }, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    expect((await repository.querySource(requestSource, { ...base, team_id: 'maintenance-team-metrology', kanban_state: 'blocked' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(requestSource, { ...base, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(requestSource.error_states.transport_error).toMatchObject({ status: 503, code: 'MAINTENANCE_REQUESTS_UNAVAILABLE' });
    database.close();
  });

  test('keeps dashboard state drill-down results after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-maintenance-dashboard-state-${crypto.randomUUID()}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const migrationName = `maintenance_team_dashboard_state_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const requestSource = yaml('api/requests.yaml').datasources.find((source: any) => source.id === 'maintenance_requests');
    const params = { q: null, equipment_id: null, category_id: null, team_id: 'maintenance-team-subcontractor', todo: true, state: null, kanban_state: 'blocked', priority: null, unscheduled: false, archived: null, fixture_state: null };

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
    expect((await firstRepository.querySource(requestSource, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.querySource(requestSource, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
