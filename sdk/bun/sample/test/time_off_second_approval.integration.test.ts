import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off second approval workflow parity', () => {
  test('declares Odoo states, separate Approve/Validate actions, and page/API seams', () => {
    const workflow = yaml('pages/time-off-workflow.yaml').workflow;
    const detail = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const approvalApi = yaml('api/time-off-approval.yaml');

    expect(workflow.states.map((state: any) => state.id)).toEqual(['Draft', 'Submitted', 'Second Approval', 'Approved', 'Refused', 'Cancelled']);
    expect(workflow.transitions.map((transition: any) => transition.id)).toContain('approve_first');
    expect(workflow.transitions.map((transition: any) => transition.id)).toContain('validate');
    expect(detail.page).toMatchObject({ id: 'leave-request-detail', route: '/time-off/leave-request-detail' });
    expect(api.page).toEqual({ id: 'leave-request-detail' });
    expect(api.datasources[0].query).toContain('validation_type');
    expect(detail.components[0].statusbar).toContainEqual({ value: 'Second Approval', label: 'Second Approval' });
    expect(api.actions.find((action: any) => action.id === 'approve_first_leave_request_detail')).toMatchObject({
      action: 'time_off.requests.approve_first', operation: 'approve_first', permission: 'time_off.manage',
    });
    expect(api.actions.find((action: any) => action.id === 'validate_leave_request_detail')).toMatchObject({
      action: 'time_off.requests.validate', operation: 'validate', permission: 'time_off.manage',
    });
    expect(approvalApi.actions.find((action: any) => action.id === 'approve_first_approval_request')).toBeTruthy();
    expect(approvalApi.actions.find((action: any) => action.id === 'validate_approval_request')).toBeTruthy();
  });

  test('persists first approval, requires the second approval, and applies balance once', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_second_approval', ['schema', 'data']);
    await repository.run("INSERT INTO leave_balances(id, employee_id, employee_name, leave_type_id, leave_type_name, year, allocated_days, used_days) VALUES ('second-approval-balance', 'employee-demo-003', 'Mitchell Admin', 'leave-type-training', 'Training Time Off', 2026, 10, 0)");
    await repository.run("INSERT INTO leave_requests(id, name, employee_id, employee_name, leave_type_id, leave_type_name, date_from, date_to, days, reason, state, row_version) VALUES ('second-approval-request', 'LEAVE/2026/SECOND', 'employee-demo-003', 'Mitchell Admin', 'leave-type-training', 'Training Time Off', '2026-11-02', '2026-11-03', 2, 'Two-step training', 'Submitted', 1)");
    const workflow = yaml('pages/time-off-workflow.yaml').workflow;
    const first = workflow.transitions.find((transition: any) => transition.id === 'approve_first');
    const validate = workflow.transitions.find((transition: any) => transition.id === 'validate');

    await expect(repository.executeMutation(validate.mutation, { id: 'second-approval-request', expected_row_version: 1, current_user_name: 'Admin User' }))
      .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_SECOND_APPROVAL_INVALID' });
    const firstResult = await repository.executeMutation(first.mutation, { id: 'second-approval-request', expected_row_version: 1, current_user_name: 'Mitchell Admin' });
    expect(firstResult).toMatchObject({ id: 'second-approval-request', state: 'Second Approval', row_version: 2 });
    expect(await repository.query("SELECT first_approver, second_approver, row_version FROM time_off_leave_approvals WHERE request_id = 'second-approval-request'"))
      .toEqual([{ first_approver: 'Mitchell Admin', second_approver: null, row_version: 1 }]);

    const validated = await repository.executeMutation(validate.mutation, { id: 'second-approval-request', expected_row_version: 2, current_user_name: 'Admin User' });
    expect(validated).toMatchObject({ id: 'second-approval-request', state: 'Approved', row_version: 3 });
    expect((await repository.query("SELECT used_days FROM leave_balances WHERE id = 'second-approval-balance'")).at(0)?.used_days).toBe(2);
    expect(await repository.query("SELECT first_approver, second_approver, row_version FROM time_off_leave_approvals WHERE request_id = 'second-approval-request'"))
      .toEqual([{ first_approver: 'Mitchell Admin', second_approver: 'Admin User', row_version: 2 }]);
    await expect(repository.executeMutation(validate.mutation, { id: 'second-approval-request', expected_row_version: 2, current_user_name: 'Admin User' }))
      .rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_SECOND_APPROVAL_INVALID' });
    database.close();
  });

  test('replays migration and retains the approval audit after file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-second-approval-'));
    const databasePath = join(directory, 'time-off.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_second_approval_restart', ['schema', 'data']);
      await firstRepository.run("INSERT INTO time_off_leave_approvals(request_id, first_approver, row_version) VALUES ('restart-approval', 'Mitchell Admin', 1)");
      firstDatabase.close();
      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_second_approval_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT first_approver, row_version FROM time_off_leave_approvals WHERE request_id = 'restart-approval'"))
        .toEqual([{ first_approver: 'Mitchell Admin', row_version: 1 }]);
      expect(await reopenedRepository.query("SELECT version FROM time_off_second_approval_restart WHERE version = '0.0.24'"))
        .toEqual([{ version: '0.0.24' }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
