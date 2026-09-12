import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance team dashboard To Do action parity', () => {
  test('binds the Odoo team card action to the page-owned request facet', () => {
    const page = yaml('pages/dashboard.yaml');
    const api = yaml('api/dashboard.yaml');
    const requests = yaml('api/requests.yaml');
    const card = page.components[0].views[0].card;
    expect(page.page).toMatchObject({ id: 'maintenance-dashboard', route: '/maintenance' });
    expect(card.actions).toContainEqual({ id: 'open_maintenance_team_todo_requests', label: 'To Do', label_field: 'todo_count', variant: 'primary', show_if: 'row.todo_count > 0' });
    expect(card.actions).toContainEqual({ id: 'open_maintenance_team_high_priority_requests', label: 'Top Priorities', label_field: 'high_priority_count', show_if: 'row.high_priority_count > 0' });
    expect(api.page).toEqual({ id: 'maintenance-dashboard' });
    expect(api.actions).toEqual([
      { id: 'view_maintenance_team', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-teams/detail', params: { id: '{row.id}' } },
      { id: 'open_maintenance_team_todo_requests', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-requests', params: { team_id: '{row.id}', todo: true } },
      { id: 'open_maintenance_team_scheduled_requests', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-calendar', params: { team_id: '{row.id}', todo: true } },
      { id: 'open_maintenance_team_high_priority_requests', type: 'navigate', permission: 'maintenance.read', navigate_to: '/maintenance-requests', params: { team_id: '{row.id}', todo: true, priority: 'High' } },
    ]);
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').permission).toBe('maintenance.read');
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':team_id');
    expect(requests.datasources.find((source: any) => source.id === 'maintenance_requests').query).toContain(':todo');
  });

  test('keeps team To Do results deterministic, empty-safe, and read-protected', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_dashboard_action_migrations', ['schema', 'data']);
    const source = yaml('api/requests.yaml').datasources.find((item: any) => item.id === 'maintenance_requests');
    const params = { q: null, equipment_id: null, category_id: null, team_id: 'maintenance-team-subcontractor', todo: true, state: null, priority: null, archived: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'MAINTENANCE_REQUESTS_UNAVAILABLE' });
    expect(yaml('api/dashboard.yaml').actions[0].permission).toBe('maintenance.read');
    database.close();
  });

  test('returns only high-priority active, non-terminal requests for the selected team', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_dashboard_high_priority_migrations', ['schema', 'data']);
    const source = yaml('api/requests.yaml').datasources.find((item: any) => item.id === 'maintenance_requests');
    const params = { q: null, equipment_id: null, category_id: null, team_id: 'maintenance-team-subcontractor', todo: true, state: null, priority: 'High', archived: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-demo-002']);
    expect((await repository.querySource(source, { ...params, team_id: 'maintenance-team-metrology' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
