import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off allocation bulk actions', () => {
  test('declares Odoo list header actions and manager boundary', () => {
    const page = yaml('pages/allocations.yaml');
    const api = yaml('api/allocations.yaml');
    const list = page.components[0];
    expect(list.selectable).toBe(true);
    expect(list.bulk_actions.map((action: any) => action.label)).toEqual(['Approve', 'Refuse']);
    expect(list.bulk_actions.every((action: any) => action.permission === 'time_off.manage')).toBe(true);
    expect(api.actions.filter((action: any) => action.id.includes('selected_allocations')).map((action: any) => action.action))
      .toEqual(['time_off.allocations.bulk_approve', 'time_off.allocations.bulk_refuse']);
  });

  test('bulk approval and refusal update only submitted allocations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_allocations(id VARCHAR, state VARCHAR, row_version INTEGER, employee_id VARCHAR, employee_name VARCHAR, leave_type_id VARCHAR, leave_type_name VARCHAR, days DECIMAL(18,3), date_from DATE, balance_applied BOOLEAN DEFAULT FALSE);`);
    await repository.run(`CREATE TABLE leave_balances(id VARCHAR, employee_id VARCHAR, employee_name VARCHAR, leave_type_id VARCHAR, leave_type_name VARCHAR, year INTEGER, allocated_days DECIMAL(18,3), used_days DECIMAL(18,3), UNIQUE(employee_id, leave_type_id, year));`);
    await repository.run(`INSERT INTO leave_allocations VALUES ('submitted-1', 'Submitted', 1, 'employee-1', 'Employee 1', 'type-1', 'Type 1', 2, '2026-01-01', FALSE), ('submitted-2', 'Submitted', 1, 'employee-2', 'Employee 2', 'type-1', 'Type 1', 3, '2026-01-01', FALSE), ('already-applied', 'Submitted', 1, 'employee-4', 'Employee 4', 'type-1', 'Type 1', 4, '2026-01-01', TRUE), ('draft-1', 'Draft', 1, 'employee-3', 'Employee 3', 'type-1', 'Type 1', 1, '2026-01-01', FALSE);`);
    const actions = yaml('api/allocations.yaml').actions;
    const approve = actions.find((action: any) => action.id === 'approve_selected_allocations');
    const refuse = actions.find((action: any) => action.id === 'refuse_selected_allocations');
    await repository.executeMutation(approve.mutation, { ids: ['submitted-1'] });
    await repository.executeMutation(refuse.mutation, { ids: ['submitted-2'] });
    expect(await repository.query(`SELECT id, state, row_version FROM leave_allocations ORDER BY id`)).toEqual([
      { id: 'already-applied', state: 'Submitted', row_version: 1 },
      { id: 'draft-1', state: 'Draft', row_version: 1 },
      { id: 'submitted-1', state: 'Approved', row_version: 2 },
      { id: 'submitted-2', state: 'Refused', row_version: 2 },
    ]);
    await expect(repository.executeMutation(approve.mutation, { ids: ['draft-1'] })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_BULK_STATE_INVALID' });
    await expect(repository.executeMutation(approve.mutation, { ids: ['already-applied'] })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_BULK_STATE_INVALID' });
    await expect(repository.executeMutation(refuse.mutation, { ids: ['already-applied'] })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_BULK_STATE_INVALID' });
    expect(await repository.query(`SELECT id, state, row_version, balance_applied FROM leave_allocations WHERE id = 'already-applied'`)).toEqual([
      { id: 'already-applied', state: 'Submitted', row_version: 1, balance_applied: true },
    ]);
    database.close();
  });
});
