import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Type Accruals stat action', () => {
  test('matches Odoo action_see_accrual_plans and filters the manager destination by type', async () => {
    const page = yaml('pages/leave-type-detail.yaml');
    const detailApi = yaml('api/leave-type-detail.yaml');
    const plansApi = yaml('api/accrual-plans.yaml');
    const stat = page.components[0].stat_buttons.find((entry: any) => entry.id === 'open_type_accrual_plans');
    const action = detailApi.actions.find((entry: any) => entry.id === 'open_type_accrual_plans');
    const source = plansApi.datasources.find((entry: any) => entry.id === 'accrual_plans');

    expect(page.components[0].stat_buttons.map((entry: any) => entry.label)).toEqual(['Allocations', 'Time Off', 'Accruals']);
    expect(stat).toMatchObject({ id: 'open_type_accrual_plans', label: 'Accruals', value_field: 'accrual_count', show_if: 'record.accrual_count > 0' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'time_off.manage', navigate_to: '/accrual-plans', params: { time_off_type_id: '{state.id}', default_time_off_type_id: '{state.id}' } });
    expect(source.permission).toBe('time_off.manage');
    expect(source.query).toContain(':time_off_type_id IS NULL OR time_off_type_id = :time_off_type_id');

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_types(id VARCHAR PRIMARY KEY, name VARCHAR, code VARCHAR, allocation_days DECIMAL(18,3), requires_approval BOOLEAN, state VARCHAR);`);
    await repository.run(`CREATE TABLE accrual_plans(id VARCHAR PRIMARY KEY, name VARCHAR, level_count INTEGER, employee_count INTEGER, state VARCHAR, time_off_type_id VARCHAR);`);
    await repository.run(`CREATE TABLE leave_requests(id VARCHAR, leave_type_id VARCHAR, state VARCHAR, date_from DATE, days DECIMAL(18,3));`);
    await repository.run(`CREATE TABLE leave_allocations(id VARCHAR, leave_type_id VARCHAR, state VARCHAR, date_from DATE);`);
    await repository.run("INSERT INTO leave_types VALUES ('leave-type-annual', 'Annual Leave', 'AL', 25, TRUE, 'Active'), ('leave-type-sick', 'Sick Time Off', 'ST', 10, TRUE, 'Active')");
    await repository.run("INSERT INTO accrual_plans VALUES ('plan-annual', 'Annual Seniority', 2, 4, 'Active', 'leave-type-annual'), ('plan-sick', 'Sick Plan', 1, 2, 'Active', 'leave-type-sick')");

    const detail = await repository.querySource(detailApi.datasources[0], { id: 'leave-type-annual' }, 0, 1);
    expect(detail.data).toMatchObject({ name: 'Annual Leave', accrual_count: 1 });
    expect((await repository.querySource(source, { q: null, state: null, time_off_type_id: 'leave-type-annual' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['plan-annual']);
    expect((await repository.querySource(source, { q: null, state: null, time_off_type_id: 'missing-type' }, 0, 50)).data).toEqual([]);
    database.close();
  });
});
