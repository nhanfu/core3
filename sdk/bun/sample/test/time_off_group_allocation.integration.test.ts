import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off group allocation wizard parity', () => {
  test('declares the installed New Group Allocation action and Odoo-shaped fields', () => {
    const page = yaml('pages/allocations.yaml');
    const api = yaml('api/allocations.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_group_allocation');

    expect(page.page).toMatchObject({ id: 'time-off-allocations', route: '/time-off-allocations' });
    expect(page.toolbar).toContainEqual(expect.objectContaining({ action: 'create_group_allocation', label: 'New Group Allocation', permission: 'time_off.manage' }));
    expect(list.source).toBe('time_off_allocations');
    expect(action).toMatchObject({ type: 'server_form', title: 'New Group Allocation', permission: 'time_off.manage', handler: 'yaml_mutation' });
    expect(action.fields.map((field: any) => field.label)).toEqual([
      'Grant?', 'Employees', 'Time Off Type', 'Allocation Type', 'Accrual Plan',
      'Validity Start', 'Validity End', 'Allocation (Days)', 'Reasons',
    ]);
    expect(action.fields.find((field: any) => field.field === 'employee_ids')).toMatchObject({ type: 'multi-select', multiple: true, options_source: 'group_allocation_employees' });
    expect(action.mutation.steps[0].query).toContain('INSERT INTO leave_allocations');
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'TIME_OFF_GROUP_ALLOCATION_TYPE_INVALID',
      'TIME_OFF_GROUP_ALLOCATION_VALUES_INVALID',
      'TIME_OFF_GROUP_ALLOCATION_EMPLOYEES_INVALID',
      'TIME_OFF_GROUP_ALLOCATION_EXISTS',
    ]);
  });

  test('creates deterministic allocations for selected employees and guards invalid or repeated submissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_group_allocation_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_group_allocation_schema_migrations', ['schema', 'data']);
    const api = yaml('api/allocations.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_group_allocation');

    const values = {
      grant_mode: 'employee',
      employee_ids: ['employee-demo-002', 'employee-demo-004'],
      leave_type_id: 'leave-type-annual',
      allocation_type: 'regular',
      date_from: '2026-09-15',
      date_to: '2026-12-31',
      days: 4,
      reason: 'Product team year-end allocation',
    };
    const result = await repository.executeMutation(action.mutation, { values });
    expect(result.group_id).toBeTruthy();
    const rows = await repository.query("SELECT name, employee_name, leave_type_name, days, state, reason FROM leave_allocations WHERE name LIKE 'ALLOC/GROUP/%' ORDER BY employee_name");
    expect(rows).toEqual([
      { name: 'ALLOC/GROUP/2026-09-15/employee-demo-004', employee_name: 'Paul Williams', leave_type_name: 'Annual Leave', days: 4, state: 'Submitted', reason: 'Product team year-end allocation' },
      { name: 'ALLOC/GROUP/2026-09-15/employee-demo-002', employee_name: 'Marc Demo', leave_type_name: 'Annual Leave', days: 4, state: 'Submitted', reason: 'Product team year-end allocation' },
    ].sort((left, right) => left.employee_name.localeCompare(right.employee_name)));
    expect((await repository.query("SELECT version FROM time_off_group_allocation_schema_migrations WHERE version = '0.0.11'")).length).toBe(1);
    await expect(repository.executeMutation(action.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_GROUP_ALLOCATION_EXISTS' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, leave_type_id: 'leave-type-archived', date_from: '2026-10-01' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_GROUP_ALLOCATION_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, employee_ids: ['employee-missing'], date_from: '2026-10-01' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_GROUP_ALLOCATION_EMPLOYEES_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, employee_ids: ['employee-demo-003'], date_from: '2026-10-01', date_to: '2026-09-30' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_GROUP_ALLOCATION_VALUES_INVALID' });
    database.close();
  });

  test('keeps the group wizard manager-only and the source lookups scoped', () => {
    const api = yaml('api/allocations.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_group_allocation');
    expect(action.permission).toBe('time_off.manage');
    expect(api.datasources.filter((source: any) => source.id.startsWith('group_allocation_')).every((source: any) => source.permission === 'time_off.manage')).toBe(true);
    expect(action.fields.find((field: any) => field.field === 'leave_type_id')?.options_source).toBe('group_allocation_types');
    expect(action.fields.find((field: any) => field.field === 'accrual_plan_id')?.show_if).toContain("state.allocation_type === 'accrual'");
  });
});
