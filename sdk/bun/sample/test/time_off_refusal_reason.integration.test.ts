import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

  test('persists a valid refusal and rejects invalid, stale, and non-submitted rows on every request surface', async () => {
    const requestApis = ['api/request-detail.yaml', 'api/requests.yaml', 'api/time-off-approval.yaml'];
    for (const apiPath of requestApis) {
      const database = await DuckDbDatabase.open(':memory:');
      const repository = new YamlRepository(database);
      const migrationTable = `time_off_refusal_reason_${apiPath.replace(/[^a-z0-9]+/gi, '_')}`;
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationTable, ['schema', 'data']);
      const action = yaml(apiPath).actions.find((candidate: any) => candidate.action === 'time_off.requests.refuse');
      await expect(repository.executeMutation(action.mutation, { id: 'missing-leave-request', expected_row_version: 1, values: { refusal_reason: 'Missing' } }))
        .rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
      await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-002', expected_row_version: 1, values: { refusal_reason: ' ' } }))
        .rejects.toMatchObject({ status: 422, code: 'TIME_OFF_LEAVE_REFUSAL_REASON_INVALID' });
      expect(await repository.query("SELECT state, row_version, refusal_reason FROM leave_requests WHERE id = 'leave-request-demo-002'"))
        .toEqual([{ state: 'Submitted', row_version: 1, refusal_reason: null }]);
      const refused = await repository.executeMutation(action.mutation, {
        id: 'leave-request-demo-002', expected_row_version: 1, values: { state: 'Refused', refusal_reason: 'Coverage is unavailable.' },
      });
      expect(refused).toMatchObject({ id: 'leave-request-demo-002', state: 'Refused', refusal_reason: 'Coverage is unavailable.', row_version: 2 });
      await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-002', expected_row_version: 1, values: { refusal_reason: 'Again' } }))
        .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_REFUSE_INVALID' });
      await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1, values: { refusal_reason: 'No' } }))
        .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_REFUSE_INVALID' });
      expect((await repository.query("SELECT refusal_reason FROM leave_requests WHERE id = 'leave-request-demo-002'")).at(0)?.refusal_reason)
        .toBe('Coverage is unavailable.');
      database.close();
    }
  });

  test('retains the refusal reason after closing and reopening a file-backed DuckDB database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-refusal-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_refusal_restart', ['schema', 'data']);
      const action = yaml('api/request-detail.yaml').actions.find((candidate: any) => candidate.id === 'refuse_leave_request_detail');
      await firstRepository.executeMutation(action.mutation, {
        id: 'leave-request-demo-002', expected_row_version: 1, values: { state: 'Refused', refusal_reason: 'Coverage is unavailable.' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_refusal_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT state, row_version, refusal_reason FROM leave_requests WHERE id = 'leave-request-demo-002'"))
        .toEqual([{ state: 'Refused', row_version: 2, refusal_reason: 'Coverage is unavailable.' }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
