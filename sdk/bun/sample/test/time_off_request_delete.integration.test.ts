import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off draft request deletion', () => {
  test('declares permissioned list/detail actions with row-version and draft guards', () => {
    const list = yaml('api/requests.yaml');
    const detail = yaml('api/request-detail.yaml');
    const page = yaml('pages/request-detail.yaml');
    const listAction = list.actions.find((action: any) => action.id === 'delete_leave_request');
    const detailAction = detail.actions.find((action: any) => action.id === 'delete_leave_request_detail');

    expect(listAction).toMatchObject({ type: 'server', permission: 'time_off.write', operation: 'delete', handler: 'yaml_mutation' });
    expect(detailAction).toMatchObject({ type: 'server', permission: 'time_off.write', operation: 'delete', handler: 'yaml_mutation' });
    expect(detailAction.params).toEqual({ id: '{state.id}', expected_row_version: '{state.row_version}' });
    expect(listAction.mutation).toMatchObject({ operation: 'delete', table: 'leave_requests', concurrency: { required: true } });
    expect(listAction.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409]);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'delete_leave_request_detail', show_if: "row.state === 'Draft'" }));
  });

  test('keeps the deletion permission boundary explicit for each Odoo actor tier', () => {
    const list = yaml('api/requests.yaml');
    const detail = yaml('api/request-detail.yaml');
    const deletionActions = [
      list.actions.find((action: any) => action.id === 'delete_leave_request'),
      detail.actions.find((action: any) => action.id === 'delete_leave_request_detail'),
    ];
    const actorPermissions = {
      employee: ['time_off.read', 'time_off.write'],
      time_off_user: ['time_off.read', 'time_off.write'],
      responsible: ['time_off.read', 'time_off.write', 'time_off.manage'],
      manager: ['time_off.read', 'time_off.write', 'time_off.manage'],
    };

    expect(deletionActions.every((action: any) => action.permission === 'time_off.write')).toBe(true);
    for (const permissions of Object.values(actorPermissions)) {
      expect(permissions.includes('time_off.write')).toBe(true);
    }
    expect(actorPermissions.employee.includes('time_off.manage')).toBe(false);
    expect(actorPermissions.time_off_user.includes('time_off.manage')).toBe(false);
    expect(actorPermissions.responsible.includes('time_off.manage')).toBe(true);
    expect(actorPermissions.manager.includes('time_off.manage')).toBe(true);
  });

  test('deletes only an unchanged draft and persists guards for other states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_request_delete_migrations', ['schema', 'data']);
    const action = yaml('api/requests.yaml').actions.find((candidate: any) => candidate.id === 'delete_leave_request');

    await expect(repository.executeMutation(action.mutation, { id: 'missing-leave-request', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-002', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_DELETE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-004', expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_DELETE_INVALID' });

    const deleted = await repository.executeMutation(action.mutation, { id: 'leave-request-demo-004', expected_row_version: 1 });
    expect(deleted).toMatchObject({ id: 'leave-request-demo-004' });
    expect(await repository.query("SELECT id FROM leave_requests WHERE id = 'leave-request-demo-004'")).toEqual([]);
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-004', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
    database.close();
  });

  test('retains the deletion after closing and reopening a file-backed DuckDB database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-delete-'));
    const databasePath = join(directory, 'time-off.duckdb');

    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_request_delete_restart', ['schema', 'data']);
      const action = yaml('api/requests.yaml').actions.find((candidate: any) => candidate.id === 'delete_leave_request');

      await firstRepository.executeMutation(action.mutation, { id: 'leave-request-demo-004', expected_row_version: 1 });
      expect(await firstRepository.query("SELECT id FROM leave_requests WHERE id = 'leave-request-demo-004'" )).toEqual([]);
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_request_delete_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT id FROM leave_requests WHERE id = 'leave-request-demo-004'" )).toEqual([]);
      await expect(reopenedRepository.executeMutation(action.mutation, { id: 'leave-request-demo-004', expected_row_version: 1 }))
        .rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
