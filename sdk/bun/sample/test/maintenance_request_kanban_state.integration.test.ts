import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance request kanban state parity', () => {
  test('binds the Odoo state-selection field to a page-owned mutation', () => {
    const page = yaml('pages/request-detail.yaml');
    const listPage = yaml('pages/requests.yaml');
    const api = yaml('api/request-detail.yaml');
    const component = page.components[0];
    const action = api.actions.find((item: any) => item.id === 'update_maintenance_request_kanban_state');

    expect(component.groups[0].fields).toContainEqual({ field: 'kanban_state', label: 'Kanban state' });
    expect(listPage.components[0].views.find((view: any) => view.id === 'kanban').card.fields).toContainEqual({ field: 'kanban_state', label: 'Kanban state' });
    expect(component.header_actions).toContainEqual(expect.objectContaining({ id: action.id, permission: 'maintenance.write' }));
    expect(api.page).toEqual({ id: 'maintenance-request-detail' });
    expect(action).toMatchObject({ type: 'server_form', handler: 'yaml_mutation', operation: 'update', permission: 'maintenance.write' });
    expect(action.fields[0].options).toEqual([
      { value: 'normal', label: 'In Progress' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Ready for next stage' },
    ]);
    expect(action.mutation.fields).toEqual(['kanban_state']);
    expect(action.mutation.concurrency).toEqual({ required: true });
  });

  test('updates deterministic state values with permission, validation, and stale-row guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_kanban_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_kanban_state_migrations', ['schema', 'data']);

    const action = yaml('api/request-detail.yaml').actions.find((item: any) => item.id === 'update_maintenance_request_kanban_state');
    const updated = await repository.executeMutation(action.mutation, {
      id: 'maintenance-demo-002', expected_row_version: 1, values: { kanban_state: 'done' },
    });
    expect(updated).toMatchObject({ id: 'maintenance-demo-002', kanban_state: 'done', row_version: 2 });

    await expect(repository.executeMutation(action.mutation, {
      id: 'maintenance-demo-002', expected_row_version: 1, values: { kanban_state: 'blocked' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'maintenance-demo-002', expected_row_version: 2, values: { kanban_state: 'paused' },
    })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_REQUEST_KANBAN_STATE_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'missing-request', expected_row_version: 1, values: { kanban_state: 'normal' },
    })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
  });
});
