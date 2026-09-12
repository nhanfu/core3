import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Teams delete action parity', () => {
  test('binds the Odoo Configuration > Maintenance Teams delete action to page-owned APIs', () => {
    const page = yaml('pages/teams.yaml');
    const detail = yaml('pages/team-detail.yaml');
    const api = yaml('api/teams.yaml');
    const detailApi = yaml('api/team-detail.yaml');

    expect(yaml('manifest.yaml').menu.groups[3].items[0]).toMatchObject({ path: '/maintenance-teams', label: 'Maintenance Teams' });
    expect(page.page.id).toBe('maintenance-teams');
    expect(detail.page.id).toBe('maintenance-team-detail');
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(api.page.id).toBe('maintenance-teams');
    expect(detailApi.page.id).toBe('maintenance-team-detail');
    expect(api.actions.find((action: any) => action.id === 'delete_maintenance_team')).toMatchObject({ permission: 'maintenance.manage', operation: 'delete' });
    expect(detailApi.actions.find((action: any) => action.id === 'delete_maintenance_team_detail')).toMatchObject({ permission: 'maintenance.manage', operation: 'delete' });
    expect(detail.components[0].header_actions.map((action: any) => action.label)).toEqual(['Edit', 'Delete']);
  });

  test('supports delete, linked-record 409, not-found 404, and stale 409 guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_delete_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_team_delete_migrations', ['schema', 'data']);

    const actions = yaml('api/teams.yaml').actions;
    const action = actions.find((item: any) => item.id === 'delete_maintenance_team');
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-team-subcontractor', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_TEAM_IN_USE' });
    await expect(repository.executeMutation(action.mutation, { id: 'missing-maintenance-team', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_TEAM_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-team-internal', expected_row_version: 0 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const deleted = await repository.executeMutation(action.mutation, { id: 'maintenance-team-internal', expected_row_version: 1 });
    expect(deleted).toMatchObject({ id: 'maintenance-team-internal' });
    const teams = yaml('api/teams.yaml').datasources[0];
    expect((await repository.querySource(teams, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Metrology', 'Subcontractor']);
  });
});
