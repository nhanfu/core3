import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Type Time Off stat action', () => {
  test('matches Odoo action_see_group_leaves and keeps the filtered destination read-only', async () => {
    const page = yaml('pages/leave-type-detail.yaml');
    const detailApi = yaml('api/leave-type-detail.yaml');
    const approvalApi = yaml('api/time-off-approval.yaml');
    const stat = page.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_type_time_off');
    const action = detailApi.actions.find((candidate: any) => candidate.id === 'open_type_time_off');
    const source = approvalApi.datasources.find((candidate: any) => candidate.id === 'time_off_approval_requests');

    expect(page.page).toMatchObject({ id: 'leave-type-detail', route: '/leave-types/detail' });
    expect(stat).toMatchObject({ id: 'open_type_time_off', label: 'Time Off', value_field: 'group_days_leave' });
    expect(action).toMatchObject({
      type: 'navigate', permission: 'time_off.manage',
      navigate_to: '/time-off-approval',
      params: { leave_type_id: '{state.id}', default_holiday_status_id: '{state.id}' },
    });
    expect(source.permission).toBe('time_off.manage');
    expect(source.query).toContain(':leave_type_id IS NULL OR r.leave_type_id = :leave_type_id');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_types(id VARCHAR PRIMARY KEY, name VARCHAR, code VARCHAR, allocation_days DECIMAL(18,3), requires_approval BOOLEAN, state VARCHAR);`);
    await repository.run(`CREATE TABLE leave_requests(id VARCHAR, name VARCHAR, employee_name VARCHAR, leave_type_id VARCHAR, leave_type_name VARCHAR, date_from DATE, date_to DATE, days DECIMAL(18,3), state VARCHAR, reason VARCHAR);`);
    await repository.run(`CREATE TABLE leave_allocations(id VARCHAR, leave_type_id VARCHAR, date_from DATE, state VARCHAR);`);
    await repository.run(`CREATE TABLE accrual_plans(id VARCHAR PRIMARY KEY, time_off_type_id VARCHAR);`);
    await repository.run("INSERT INTO leave_types VALUES ('leave-type-annual', 'Annual Leave', 'AL', 25, TRUE, 'Active'), ('leave-type-sick', 'Sick Time Off', 'ST', 10, TRUE, 'Active')");
    await repository.run("INSERT INTO leave_requests VALUES ('r-1', 'Annual / Marc', 'Marc Demo', 'leave-type-annual', 'Annual Leave', '2026-03-02', '2026-03-03', 2, 'Approved', 'Vacation'), ('r-2', 'Sick / Paul', 'Paul Williams', 'leave-type-sick', 'Sick Time Off', '2026-04-06', '2026-04-06', 1, 'Approved', 'Appointment'), ('r-3', 'Annual / draft', 'Marc Demo', 'leave-type-annual', 'Annual Leave', '2026-05-01', '2026-05-01', 1, 'Draft', 'Unsubmitted')");

    const detail = await repository.querySource(detailApi.datasources[0], { id: 'leave-type-annual' }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Annual Leave', group_days_leave: 2 });
    const filtered = await repository.querySource(source, { q: null, state: null, leave_type_id: 'leave-type-annual' }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['r-3', 'r-1']);
    expect((await repository.querySource(source, { q: null, state: null, leave_type_id: 'missing-type' }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
