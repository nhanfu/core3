import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance recurring request parity', () => {
  test('keeps recurrence generation in the page-id API contract', () => {
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const action = api.actions.find((item: any) => item.id === 'generate_maintenance_request_recurrence');

    expect(page.page.id).toBe('maintenance-request-detail');
    expect(api.page).toEqual({ id: 'maintenance-request-detail' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: action.id,
      label: 'Generate next occurrence',
      permission: 'maintenance.write',
    }));
    expect(action).toMatchObject({
      type: 'server',
      handler: 'yaml_mutation',
      operation: 'create',
      permission: 'maintenance.write',
      action: 'maintenance.requests.recurrence.generate',
      refresh: ['maintenance_request_detail', 'maintenance_request_activity'],
    });
    expect(action.mutation.steps).toHaveLength(2);
    expect(action.mutation.steps[0].query).toContain('INSERT INTO maintenance_requests');
    expect(action.mutation.steps[1].query).toContain('recurrence_generated_id');
    expect(action.mutation.before_steps[0].query).toContain("INTERVAL '1 month'");
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' }),
      expect.objectContaining({ status: 409, code: 'MAINTENANCE_RECURRENCE_NOT_ELIGIBLE' }),
      expect.objectContaining({ status: 409, code: 'MAINTENANCE_RECURRENCE_ALREADY_GENERATED' }),
      expect.objectContaining({ status: 422, code: 'MAINTENANCE_RECURRENCE_INVALID' }),
    ]));
  });

  test('generates one deterministic next occurrence and persists the idempotency marker', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'maintenance_request_recurrence_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'maintenance_request_recurrence_migrations', ['schema', 'data']);

    const migrationRows = await repository.query("SELECT version FROM maintenance_request_recurrence_migrations WHERE version = '0.0.8'");
    expect(migrationRows).toHaveLength(1);
    expect((await repository.query("SELECT recurrence_parent_id, recurrence_sequence FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))[0]).toMatchObject({
      recurrence_parent_id: 'maintenance-demo-001',
      recurrence_sequence: 0,
    });

    await repository.query("UPDATE maintenance_requests SET state = 'Repaired', stage = 'Repaired', completed_date = DATE '2026-01-20' WHERE id = 'maintenance-demo-001'");
    const action = yaml('api/request-detail.yaml').actions.find((item: any) => item.id === 'generate_maintenance_request_recurrence');
    const generated = await repository.executeMutation(action.mutation, { id: 'maintenance-demo-001', expected_row_version: 1 });

    expect(generated).toMatchObject({
      id: 'maintenance-demo-001-recurrence-1',
      name: 'MNT/2026/0001 / Recurrence 1',
      request_type: 'Preventive',
      state: 'New Request',
      stage: 'New Request',
      kanban_state: 'ready',
      scheduled_date: '2026-02-19T00:00:00.000Z',
      request_date: '2026-01-15T00:00:00.000Z',
      recurrence_parent_id: 'maintenance-demo-001',
      recurrence_sequence: 1,
      recurrence_generated_id: null,
      row_version: 1,
    });
    expect((await repository.query("SELECT recurrence_generated_id, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))[0]).toMatchObject({
      recurrence_generated_id: 'maintenance-demo-001-recurrence-1',
      row_version: 2,
    });

    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-demo-001', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action.mutation, { id: 'maintenance-demo-001', expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_RECURRENCE_ALREADY_GENERATED' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM maintenance_requests WHERE recurrence_parent_id = 'maintenance-demo-001'"))[0].count).toBe(2);
    database.close();
  });

  test('survives a file-backed restart and rejects invalid or ineligible sources without writes', async () => {
    const databasePath = `/tmp/core3-maintenance-recurrence-${crypto.randomUUID()}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const migrationName = `maintenance_request_recurrence_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const action = yaml('api/request-detail.yaml').actions.find((item: any) => item.id === 'generate_maintenance_request_recurrence');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);
    await firstRepository.query("UPDATE maintenance_requests SET state = 'Repaired', stage = 'Repaired' WHERE id = 'maintenance-demo-001'");
    await firstRepository.executeMutation(action.mutation, { id: 'maintenance-demo-001', expected_row_version: 1 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query("SELECT COUNT(*) AS count FROM maintenance_requests WHERE recurrence_parent_id = 'maintenance-demo-001'"))[0].count).toBe(2);
    expect((await secondRepository.query("SELECT scheduled_date FROM maintenance_requests WHERE id = 'maintenance-demo-001-recurrence-1'"))[0].scheduled_date).toBe('2026-02-19T00:00:00.000Z');

    await expect(secondRepository.executeMutation(action.mutation, { id: 'missing-maintenance-request', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await expect(secondRepository.executeMutation(action.mutation, { id: 'maintenance-demo-002', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_RECURRENCE_NOT_ELIGIBLE' });
    await secondRepository.query("UPDATE maintenance_requests SET state = 'Repaired', stage = 'Repaired', request_type = 'Preventive', recurrence = 'Every 0 days' WHERE id = 'maintenance-demo-003'");
    await expect(secondRepository.executeMutation(action.mutation, { id: 'maintenance-demo-003', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_RECURRENCE_INVALID' });
    expect((await secondRepository.query("SELECT COUNT(*) AS count FROM maintenance_requests WHERE id LIKE 'maintenance-demo-003-recurrence-%'"))[0].count).toBe(0);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
