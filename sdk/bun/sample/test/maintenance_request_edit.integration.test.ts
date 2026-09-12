import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Request edit parity', () => {
  test('exposes a writable detail form with a guarded update mutation', async () => {
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const edit = api.actions.find((action: any) => action.id === 'edit_maintenance_request_detail');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_edit_migrations', ['schema', 'data']);

    expect(page.components[0].source).toBe('maintenance_request_detail');
    expect(edit).toMatchObject({
      type: 'server_form',
      permission: 'maintenance.write',
      operation: 'update',
      prefill: 'state.maintenance_request_detail',
      params: { id: '{state.id}' },
    });
    expect(edit.mutation).toMatchObject({
      operation: 'update',
      table: 'maintenance_requests',
      fields: ['name', 'request_type', 'description', 'instructions', 'priority', 'assigned_to', 'scheduled_date', 'recurrence'],
      required: ['name', 'description'],
      concurrency: { required: true },
    });

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'maintenance-demo-001',
      expected_row_version: 1,
      values: {
        name: 'Replace compressor belt',
        request_type: 'Preventive',
        description: 'Inspect and replace the compressor belt.',
        instructions: 'Lock out the unit before service.',
        priority: 'High',
        assigned_to: 'Maintenance User',
        scheduled_date: '2026-02-20',
        recurrence: '30 days',
      },
    });
    expect(updated).toMatchObject({
      id: 'maintenance-demo-001',
      name: 'Replace compressor belt',
      request_type: 'Preventive',
      priority: 'High',
      assigned_to: 'Maintenance User',
      row_version: 2,
    });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'maintenance-demo-001',
      expected_row_version: 1,
      values: { name: 'Stale edit', description: 'Must not overwrite the newer record.' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'maintenance-demo-001',
      expected_row_version: 1,
      values: {
        name: 'Replace compressor belt',
        request_type: 'Preventive',
        description: 'Inspect and replace the compressor belt.',
        instructions: 'Lock out the unit before service.',
        priority: 'High',
        assigned_to: 'Maintenance User',
        scheduled_date: '2026-02-20',
        recurrence: '30 days',
      },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const detail = await repository.querySource(api.datasources[0], { id: 'maintenance-demo-001' }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Replace compressor belt', description: 'Inspect and replace the compressor belt.', row_version: 2 });
    database.close();
  });
});
