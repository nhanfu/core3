import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off allocation and balance persistence', () => {
  test('declares Draft allocation editing and balance-applied migration', () => {
    const detail = yaml('api/allocation-detail.yaml');
    const page = yaml('pages/allocation-detail.yaml');
    const edit = detail.actions.find((action: any) => action.id === 'edit_allocation_detail');
    expect(edit).toMatchObject({ type: 'server_form', operation: 'update', permission: 'time_off.manage' });
    expect(edit.mutation).toMatchObject({ table: 'leave_allocations', concurrency: { required: true } });
    expect(edit.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409, 422, 422, 409]);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_allocation_detail', show_if: "row.state === 'Draft'" }));
    const migration = yaml('migrations/20260913150000-019-allocation-balance-persistence.yaml');
    expect(migration.version).toBe('0.0.19');
    expect(migration.type.postgres.up).toContain('balance_applied');
  });

  test('persists allocation edits, approval balance changes, replay guards, and request recalculation across reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-balance-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_balance_persistence', ['schema', 'data']);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_balance_persistence', ['schema', 'data']);

      const allocationCreate = yaml('pages/allocations.yaml').actions.find((action: any) => action.id === 'create_allocation');
      const allocationEdit = yaml('api/allocation-detail.yaml').actions.find((action: any) => action.id === 'edit_allocation_detail');
      const allocation = await firstRepository.executeMutation(allocationCreate.mutation, {
        id: 'allocation-persistence-test',
        values: { name: 'ALLOC/PERSIST/001', employee_id: 'employee-demo-001', employee_name: 'Admin User', leave_type_id: 'leave-type-annual', leave_type_name: 'Annual Leave', days: 2, date_from: '2026-10-01', date_to: '2026-10-02', reason: 'Persistence test' },
      }) as any;
      expect(allocation).toMatchObject({ id: 'allocation-persistence-test', state: 'Draft', balance_applied: false });

      const edited = await firstRepository.executeMutation(allocationEdit.mutation, {
        id: allocation.id,
        expected_row_version: 1,
        values: { name: 'ALLOC/PERSIST/UPDATED', employee_id: 'employee-demo-001', employee_name: 'Admin User', leave_type_id: 'leave-type-annual', leave_type_name: 'Annual Leave', days: 3, date_from: '2026-10-01', date_to: '2026-10-03', reason: 'Updated persistence test' },
      }) as any;
      expect(edited).toMatchObject({ name: 'ALLOC/PERSIST/UPDATED', days: 3, row_version: 2 });
      await expect(firstRepository.executeMutation(allocationEdit.mutation, { id: allocation.id, expected_row_version: 1, values: { name: 'stale', employee_id: 'employee-demo-001', employee_name: 'Admin User', leave_type_id: 'leave-type-annual', leave_type_name: 'Annual Leave', days: 3, date_from: '2026-10-01', date_to: '2026-10-03' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_EDIT_INVALID' });
      await expect(firstRepository.executeMutation(allocationCreate.mutation, { values: { id: 'bad', name: 'ALLOC/BAD', employee_id: 'employee-demo-001', employee_name: 'Admin User', leave_type_id: 'leave-type-archived', leave_type_name: 'Legacy Leave', days: 2, date_from: '2026-10-03', date_to: '2026-10-01' } })).rejects.toMatchObject({ status: 422 });

      const allocationWorkflow = yaml('pages/allocation-workflow.yaml').workflow;
      const submit = allocationWorkflow.transitions.find((transition: any) => transition.id === 'submit').mutation;
      const approve = allocationWorkflow.transitions.find((transition: any) => transition.id === 'approve').mutation;
      await firstRepository.executeMutation(submit, { id: allocation.id, expected_row_version: 2 });
      const rollbackApproval = {
        ...approve,
        steps: [
          ...approve.steps.slice(0, -1),
          {
            query: "UPDATE leave_allocations SET state = 'Approved', balance_applied = TRUE, row_version = row_version + 1 WHERE id = :id AND row_version = 999",
            expect_changed: true,
            status: 409,
            code: 'TIME_OFF_ALLOCATION_APPROVAL_STALE',
            message: 'Allocation approval was changed by another user. Reload it before approving.',
          },
        ],
      };
      await expect(firstRepository.executeMutation(rollbackApproval, { id: allocation.id, expected_row_version: 3 }))
        .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_APPROVAL_STALE' });
      expect(await firstRepository.query("SELECT state, row_version, balance_applied FROM leave_allocations WHERE id = 'allocation-persistence-test'"))
        .toEqual([{ state: 'Submitted', row_version: 3, balance_applied: false }]);
      expect((await firstRepository.query("SELECT allocated_days FROM leave_balances WHERE employee_id = 'employee-demo-001' AND leave_type_id = 'leave-type-annual' AND year = 2026")).at(0)?.allocated_days).toBe(20);
      await firstRepository.executeMutation(approve, { id: allocation.id, expected_row_version: 3 });
      expect((await firstRepository.query("SELECT allocated_days FROM leave_balances WHERE employee_id = 'employee-demo-001' AND leave_type_id = 'leave-type-annual' AND year = 2026")).at(0)?.allocated_days).toBe(23);
      await expect(firstRepository.executeMutation(approve, { id: allocation.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 409 });
      expect((await firstRepository.query("SELECT allocated_days FROM leave_balances WHERE employee_id = 'employee-demo-001' AND leave_type_id = 'leave-type-annual' AND year = 2026")).at(0)?.allocated_days).toBe(23);

      const requestCreate = yaml('api/requests.yaml').actions.find((action: any) => action.id === 'create_leave_request');
      const request = await firstRepository.executeMutation(requestCreate.mutation, {
        id: 'leave-persistence-test',
        values: { name: 'LEAVE/PERSIST/001', employee_id: 'employee-demo-001', employee_name: 'Admin User', leave_type_id: 'leave-type-annual', leave_type_name: 'Annual Leave', date_from: '2026-11-02', date_to: '2026-11-03', days: 2, reason: 'Balance recalculation' },
      }) as any;
      const source = yaml('api/balance.yaml').datasources.find((candidate: any) => candidate.id === 'time_off_balance_report');
      const balanceParams = { q: null, employee_id: 'employee-demo-001', leave_type_id: 'leave-type-annual', fixture_state: null };
      expect((await firstRepository.querySource(source, balanceParams, 0, 50)).data.at(0)).toMatchObject({ allocation_days: 23, taken_days: 3, planned_days: 0, remaining_days: 20 });
      const requestWorkflow = yaml('pages/time-off-workflow.yaml').workflow;
      await firstRepository.executeMutation(requestWorkflow.transitions.find((transition: any) => transition.id === 'submit').mutation, { id: request.id, expected_row_version: 1 });
      expect((await firstRepository.querySource(source, balanceParams, 0, 50)).data.at(0)).toMatchObject({ planned_days: 2, remaining_days: 18 });
      await firstRepository.executeMutation(requestWorkflow.transitions.find((transition: any) => transition.id === 'approve').mutation, { id: request.id, expected_row_version: 2, current_user_name: 'Mitchell Admin' });
      expect((await firstRepository.querySource(source, balanceParams, 0, 50)).data.at(0)).toMatchObject({ taken_days: 5, planned_days: 0, remaining_days: 18 });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_balance_persistence', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT name, days, state, balance_applied FROM leave_allocations WHERE id = 'allocation-persistence-test'" )).toEqual([{ name: 'ALLOC/PERSIST/UPDATED', days: 3, state: 'Approved', balance_applied: true }]);
      expect((await reopenedRepository.query("SELECT allocated_days, used_days FROM leave_balances WHERE employee_id = 'employee-demo-001' AND leave_type_id = 'leave-type-annual' AND year = 2026")).at(0)).toMatchObject({ allocated_days: 23, used_days: 5 });
      expect((await reopenedRepository.query("SELECT version FROM time_off_balance_persistence WHERE version = '0.0.19'")).length).toBe(1);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
