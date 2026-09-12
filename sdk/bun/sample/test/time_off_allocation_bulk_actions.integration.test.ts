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
    await repository.run(`CREATE TABLE leave_allocations(id VARCHAR, state VARCHAR, row_version INTEGER);`);
    await repository.run(`INSERT INTO leave_allocations VALUES ('submitted-1', 'Submitted', 1), ('submitted-2', 'Submitted', 1), ('draft-1', 'Draft', 1);`);
    const actions = yaml('api/allocations.yaml').actions;
    const approve = actions.find((action: any) => action.id === 'approve_selected_allocations');
    const refuse = actions.find((action: any) => action.id === 'refuse_selected_allocations');
    await repository.executeMutation(approve.mutation, { ids: ['submitted-1'] });
    await repository.executeMutation(refuse.mutation, { ids: ['submitted-2'] });
    expect(await repository.query(`SELECT id, state, row_version FROM leave_allocations ORDER BY id`)).toEqual([
      { id: 'draft-1', state: 'Draft', row_version: 1 },
      { id: 'submitted-1', state: 'Approved', row_version: 2 },
      { id: 'submitted-2', state: 'Refused', row_version: 2 },
    ]);
    await expect(repository.executeMutation(approve.mutation, { ids: ['draft-1'] })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ALLOCATION_BULK_STATE_INVALID' });
    database.close();
  });
});
