import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Type Allocations stat action', () => {
  test('matches Odoo action_see_days_allocated and supplies approved/current-year context', async () => {
    const page = yaml('pages/leave-type-detail.yaml');
    const detailApi = yaml('api/leave-type-detail.yaml');
    const allocationsApi = yaml('api/allocations.yaml');
    const stat = page.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_type_allocations');
    const action = detailApi.actions.find((candidate: any) => candidate.id === 'open_type_allocations');
    const source = allocationsApi.datasources.find((candidate: any) => candidate.id === 'time_off_allocations');

    expect(stat).toMatchObject({ id: 'open_type_allocations', label: 'Allocations', value_field: 'allocation_count' });
    expect(action).toMatchObject({
      type: 'navigate', permission: 'time_off.manage', navigate_to: '/time-off-allocations',
      params: { leave_type_id: '{state.id}', state: 'Approved', year: 2026, default_holiday_status_id: '{state.id}', search_default_approved_state: 1, search_default_year: 1 },
    });
    expect(source.query).toContain(':leave_type_id IS NULL OR leave_type_id = :leave_type_id');
    expect(source.query).toContain(':year IS NULL');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_types(id VARCHAR PRIMARY KEY, name VARCHAR, code VARCHAR, allocation_days DECIMAL(18,3), requires_approval BOOLEAN, state VARCHAR);`);
    await repository.run(`CREATE TABLE leave_requests(id VARCHAR, leave_type_id VARCHAR, days DECIMAL(18,3), state VARCHAR, date_from DATE);`);
    await repository.run(`CREATE TABLE leave_allocations(id VARCHAR, row_version INTEGER DEFAULT 1, name VARCHAR, employee_name VARCHAR, leave_type_name VARCHAR, leave_type_id VARCHAR, days DECIMAL(18,3), date_from DATE, date_to DATE, state VARCHAR, reason VARCHAR);`);
    await repository.run(`CREATE TABLE accrual_plans(id VARCHAR PRIMARY KEY, time_off_type_id VARCHAR);`);
    await repository.run("INSERT INTO leave_types VALUES ('leave-type-annual', 'Annual Leave', 'AL', 25, TRUE, 'Active')");
    await repository.run("INSERT INTO leave_requests VALUES ('r-1', 'leave-type-annual', 2, 'Approved', '2026-03-02')");
    await repository.run("INSERT INTO leave_allocations(id, name, employee_name, leave_type_name, leave_type_id, days, date_from, date_to, state, reason) VALUES ('a-1', 'Annual allocation', 'Marc Demo', 'Annual Leave', 'leave-type-annual', 20, '2026-01-01', '2026-12-31', 'Approved', 'Yearly'), ('a-2', 'Old allocation', 'Marc Demo', 'Annual Leave', 'leave-type-annual', 5, '2025-01-01', '2025-12-31', 'Approved', 'Prior year'), ('a-3', 'Pending allocation', 'Marc Demo', 'Annual Leave', 'leave-type-annual', 5, '2026-04-01', '2026-12-31', 'Submitted', 'Pending')");

    const detail = await repository.querySource(detailApi.datasources[0], { id: 'leave-type-annual' }, 0, 1);
    expect(detail.data).toMatchObject({ group_days_leave: 2, allocation_count: 2 });
    const filtered = await repository.querySource(source, { q: null, state: 'Approved', leave_type_id: 'leave-type-annual', year: 2026 }, 0, 50);
    expect(filtered.data.map((row: any) => row.id)).toEqual(['a-1']);
    expect((await repository.querySource(source, { q: null, state: 'Approved', leave_type_id: 'missing-type', year: 2026 }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
