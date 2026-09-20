import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Request create parity', () => {
  test('creates a request with validated values and rejects invalid or duplicate records atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_create_migrations', ['schema', 'data']);
    const action = yaml('api/requests.yaml').actions.find((candidate: any) => candidate.id === 'create_maintenance_request');
    expect(action.mutation).toMatchObject({
      operation: 'insert',
      table: 'maintenance_requests',
      required: ['name', 'equipment_id', 'equipment_name', 'description'],
    });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_NAME_EXISTS', status: 409 }),
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_TYPE_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_PRIORITY_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_SCHEDULED_DATE_INVALID', status: 422 }),
    ]));

    const values = {
      name: 'Replace QA pump seal', equipment_id: 'equipment-demo-001', equipment_name: 'Air Compressor',
      request_type: 'Preventive', description: 'Replace the pump seal during planned maintenance.',
      priority: 'High', scheduled_date: '2026-03-20', recurrence: '30 days',
    };
    const created = await repository.executeMutation(action.mutation, { id: 'maintenance-create-qa-001', values });
    expect(created).toMatchObject({ id: 'maintenance-create-qa-001', name: values.name, request_type: 'Preventive', priority: 'High', row_version: 1 });
    expect((await repository.query('SELECT name, scheduled_date, row_version FROM maintenance_requests WHERE id = ?', [created.id]))[0]).toMatchObject({ name: values.name, scheduled_date: '2026-03-20T00:00:00.000Z', row_version: 1 });

    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-create-qa-duplicate', values: { ...values, name: '  replace qa pump seal  ' } })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_REQUEST_NAME_EXISTS' });
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-create-qa-invalid-type', values: { ...values, name: 'Invalid type', request_type: 'Emergency' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_REQUEST_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-create-qa-invalid-date', values: { ...values, name: 'Invalid date', scheduled_date: '2026-02-31' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_REQUEST_SCHEDULED_DATE_INVALID' });
    const [createdCount] = await repository.query('SELECT COUNT(*) AS count FROM maintenance_requests WHERE id LIKE \'maintenance-create-qa-%\'');
    expect(Number(createdCount?.count ?? 0)).toBe(1);
    database.close();
  });

  test('preserves a created request across a file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-maintenance-request-create-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `maintenance_request_create_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const action = yaml('api/requests.yaml').actions.find((candidate: any) => candidate.id === 'create_maintenance_request');
    const values = {
      name: 'Restart-safe maintenance request', equipment_id: 'equipment-demo-001', equipment_name: 'Air Compressor',
      request_type: 'Corrective', description: 'Verify the request remains available after the service restarts.',
      priority: 'Normal', scheduled_date: '2026-04-15', recurrence: null,
    };

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(action.mutation, { id: 'maintenance-create-restart-001', values });
    expect(created).toMatchObject({ id: 'maintenance-create-restart-001', name: values.name, row_version: 1 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT name, request_type, scheduled_date, row_version FROM maintenance_requests WHERE id = ?', ['maintenance-create-restart-001']))[0]).toMatchObject({
      name: values.name,
      request_type: 'Corrective',
      scheduled_date: '2026-04-15T00:00:00.000Z',
      row_version: 1,
    });
    await expect(secondRepository.executeMutation(action.mutation, { id: 'maintenance-create-restart-replay', values })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_REQUEST_NAME_EXISTS' });
    second.close();
    rmSync(databasePath, { force: true });
  });
});
