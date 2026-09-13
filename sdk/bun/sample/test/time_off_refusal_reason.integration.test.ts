import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off refusal reason', () => {
  test('exposes manager-only refusal forms and persisted reason fields', () => {
    const detail = yaml('api/request-detail.yaml');
    const list = yaml('api/requests.yaml');
    const approval = yaml('api/time-off-approval.yaml');
    const page = yaml('pages/request-detail.yaml');
    for (const api of [detail, list, approval]) {
      const action = api.actions.find((candidate: any) => candidate.action === 'time_off.requests.refuse');
      expect(action).toMatchObject({ type: 'server_form', permission: 'time_off.manage', operation: 'update' });
      expect(action.mutation).toMatchObject({ operation: 'update', table: 'leave_requests', concurrency: { required: true } });
      expect(action.mutation.fields).toContain('refusal_reason');
      expect(action.fields).toContainEqual(expect.objectContaining({ field: 'refusal_reason', type: 'textarea', required: true }));
    }
    expect(list.datasources.find((source: any) => source.id === 'leave_requests').query).toContain('refusal_reason');
    expect(approval.datasources.find((source: any) => source.id === 'time_off_approval_requests').query).toContain('row_version');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'refuse_leave_request_detail' }));
  });

  test('persists a valid refusal and rejects invalid, stale, and non-submitted rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_refusal_reason', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_refusal_reason', ['schema', 'data']);
    const action = yaml('api/request-detail.yaml').actions.find((candidate: any) => candidate.id === 'refuse_leave_request_detail');
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-002', expected_row_version: 1, values: { refusal_reason: '' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_LEAVE_REFUSAL_REASON_INVALID' });
    const refused = await repository.executeMutation(action.mutation, {
      id: 'leave-request-demo-002', expected_row_version: 1, values: { state: 'Refused', refusal_reason: 'Coverage is unavailable.' },
    });
    expect(refused).toMatchObject({ id: 'leave-request-demo-002', state: 'Refused', refusal_reason: 'Coverage is unavailable.', row_version: 2 });
    expect((await repository.query("SELECT refusal_reason FROM leave_requests WHERE id = 'leave-request-demo-002'")).at(0)?.refusal_reason).toBe('Coverage is unavailable.');
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-002', expected_row_version: 1, values: { refusal_reason: 'Again' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_REFUSE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1, values: { refusal_reason: 'No' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_REFUSE_INVALID' });
    database.close();
  });
});
