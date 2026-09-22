import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

async function repository() {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await repo.run(`
    CREATE TABLE leave_requests(
      id VARCHAR PRIMARY KEY, employee_id VARCHAR, employee_name VARCHAR,
      leave_type_id VARCHAR, leave_type_name VARCHAR, date_from DATE, date_to DATE,
      days DECIMAL(18,3), reason VARCHAR, approver VARCHAR, refusal_reason VARCHAR,
      state VARCHAR, row_version INTEGER DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE leave_balances(
      id VARCHAR PRIMARY KEY, employee_id VARCHAR, employee_name VARCHAR,
      leave_type_id VARCHAR, leave_type_name VARCHAR, year INTEGER,
      allocated_days DECIMAL(18,3), used_days DECIMAL(18,3),
      UNIQUE(employee_id, leave_type_id, year)
    );
    CREATE TABLE time_off_leave_validation_types(
      leave_type_id VARCHAR PRIMARY KEY, validation_type VARCHAR
    );
    CREATE TABLE time_off_leave_approvals(
      request_id VARCHAR PRIMARY KEY, first_approver VARCHAR, second_approver VARCHAR,
      row_version INTEGER DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO leave_balances VALUES
      ('balance-1', 'employee-1', 'Employee One', 'type-manager', 'Annual Leave', 2026, 10, 1),
      ('balance-2', 'employee-2', 'Employee Two', 'type-both', 'Training', 2026, 10, 0),
      ('balance-3', 'employee-3', 'Employee Three', 'type-manager', 'Annual Leave', 2026, 2, 2);
    INSERT INTO time_off_leave_validation_types VALUES ('type-both', 'both');
    INSERT INTO time_off_leave_approvals(request_id, first_approver, second_approver, row_version)
    VALUES ('request-second', 'First Approver', NULL, 1);
    INSERT INTO leave_requests(id, employee_id, employee_name, leave_type_id, leave_type_name, date_from, date_to, days, state)
    VALUES
      ('request-manager', 'employee-1', 'Employee One', 'type-manager', 'Annual Leave', '2026-02-01', '2026-02-02', 2, 'Submitted'),
      ('request-first', 'employee-2', 'Employee Two', 'type-both', 'Training', '2026-03-01', '2026-03-01', 1, 'Submitted'),
      ('request-second', 'employee-2', 'Employee Two', 'type-both', 'Training', '2026-04-01', '2026-04-01', 1, 'Second Approval'),
      ('request-refuse', 'employee-1', 'Employee One', 'type-manager', 'Annual Leave', '2026-05-01', '2026-05-01', 1, 'Submitted'),
      ('request-insufficient', 'employee-3', 'Employee Three', 'type-manager', 'Annual Leave', '2026-06-01', '2026-06-03', 3, 'Submitted');
  `);
  return { repo, database };
}

describe('TIMEOFF-REQUEST-BULK-ACTIONS-001', () => {
  test('maps the Odoo All Time Off header actions to manager-only selection mutations', () => {
    const page = yaml('pages/time-off-approval.yaml');
    const api = yaml('api/time-off-approval.yaml');
    const list = page.components[0];
    const actions = api.actions.filter((action: any) => action.id.endsWith('_selected_requests'));

    expect(page.page).toMatchObject({ id: 'time-off-approval', route: '/time-off-approval' });
    expect(api.page.id).toBe('time-off-approval');
    expect(list).toMatchObject({ selectable: true });
    expect(list.bulk_actions).toEqual([
      { id: 'approve_selected_requests', label: 'Approve', permission: 'time_off.manage', variant: 'success' },
      { id: 'refuse_selected_requests', label: 'Refuse', permission: 'time_off.manage', variant: 'danger' },
    ]);
    expect(actions.map((action: any) => action.action)).toEqual([
      'time_off.requests.bulk_approve', 'time_off.requests.bulk_refuse',
    ]);
    expect(actions.every((action: any) => action.permission === 'time_off.manage' && action.operation === 'bulk_update')).toBe(true);
  });

  test('approves manager and two-step requests atomically, applying balance only on final approval', async () => {
    const { repo, database } = await repository();
    const action = yaml('api/time-off-approval.yaml').actions.find((candidate: any) => candidate.id === 'approve_selected_requests');

    const result = await repo.executeMutation(action.mutation, { ids: ['request-manager', 'request-first', 'request-second'], current_user_name: 'Time Off Manager' });
    expect(result).toEqual({ approved: true });
    expect(await repo.query("SELECT id, state, approver, row_version FROM leave_requests WHERE id IN ('request-manager', 'request-first', 'request-second') ORDER BY id")).toEqual([
      { id: 'request-first', state: 'Second Approval', approver: 'Time Off Manager', row_version: 2 },
      { id: 'request-manager', state: 'Approved', approver: 'Time Off Manager', row_version: 2 },
      { id: 'request-second', state: 'Approved', approver: 'Time Off Manager', row_version: 2 },
    ]);
    expect(await repo.query("SELECT employee_id, used_days FROM leave_balances WHERE employee_id IN ('employee-1', 'employee-2') ORDER BY employee_id")).toEqual([
      { employee_id: 'employee-1', used_days: 3 },
      { employee_id: 'employee-2', used_days: 1 },
    ]);
    expect(await repo.query("SELECT request_id, first_approver, second_approver FROM time_off_leave_approvals ORDER BY request_id")).toEqual([
      { request_id: 'request-first', first_approver: 'Time Off Manager', second_approver: null },
      { request_id: 'request-second', first_approver: 'First Approver', second_approver: 'Time Off Manager' },
    ]);
    await expect(repo.executeMutation(action.mutation, { ids: ['request-insufficient'], current_user_name: 'Time Off Manager' })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_REQUEST_BULK_BALANCE_INVALID' });
    database.close();
  });

  test('refuses selected pending requests and rejects empty or non-pending selections', async () => {
    const { repo, database } = await repository();
    const action = yaml('api/time-off-approval.yaml').actions.find((candidate: any) => candidate.id === 'refuse_selected_requests');

    await repo.executeMutation(action.mutation, { ids: ['request-refuse'], current_user_name: 'Time Off Manager' });
    expect(await repo.query("SELECT state, approver, refusal_reason, row_version FROM leave_requests WHERE id = 'request-refuse'")).toEqual([
      { state: 'Refused', approver: 'Time Off Manager', refusal_reason: 'Bulk refusal', row_version: 2 },
    ]);
    await expect(repo.executeMutation(action.mutation, { ids: ['missing-request'] })).rejects.toMatchObject({ status: 400, code: 'TIME_OFF_REQUEST_SELECTION_REQUIRED' });
    await expect(repo.executeMutation(action.mutation, { ids: ['request-refuse'] })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_REQUEST_BULK_STATE_INVALID' });
    database.close();
  });
});
