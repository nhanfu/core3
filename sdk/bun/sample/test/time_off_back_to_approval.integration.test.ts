import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Back to Approval action parity', () => {
  test('declares the Odoo detail route, page/API seam, and manager action', () => {
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'back_to_approval_leave_request_detail');
    expect(page.page).toMatchObject({ id: 'leave-request-detail', route: '/time-off/leave-request-detail' });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: action.id, label: 'Back to Approval', show_if: "row.state === 'Approved'" }));
    expect(action).toMatchObject({ type: 'server', permission: 'time_off.manage', action: 'time_off.requests.back_to_approval', handler: 'yaml_mutation' });
    expect(action.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409]);
    expect(action.mutation.steps).toHaveLength(2);
  });

  test('reverses used balance and returns an approved fixture to Submitted idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_back_to_approval_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_back_to_approval_migrations', ['schema', 'data']);
    const action = yaml('api/request-detail.yaml').actions.find((candidate: any) => candidate.id === 'back_to_approval_leave_request_detail');
    const result = await repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1 });
    expect(result).toMatchObject({ id: 'leave-request-demo-003', state: 'Submitted', row_version: 2, approver: null });
    expect((await repository.query("SELECT used_days FROM leave_balances WHERE employee_id = 'employee-demo-002' AND leave_type_id = 'leave-type-annual'"))[0].used_days).toBe(0);
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_BACK_TO_APPROVAL_INVALID' });
    database.close();
  });

  test('rejects missing requests and requires manager permission', async () => {
    const action = yaml('api/request-detail.yaml').actions.find((candidate: any) => candidate.id === 'back_to_approval_leave_request_detail');
    expect(action.permission).toBe('time_off.manage');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_back_to_approval_guards', ['schema', 'data']);
    await expect(repository.executeMutation(action.mutation, { id: 'missing-leave', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
    database.close();
  });
});
