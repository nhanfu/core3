import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off multiple requests wizard parity', () => {
  test('joins the approval page and API by page id and preserves the Odoo action contract', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/time-off-approval.yaml');
    const api = yaml('api/time-off-approval.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_multiple_requests');

    expect(page.page).toMatchObject({ id: 'time-off-approval', route: '/time-off-approval', auth: { require: ['time_off.manage'] } });
    expect(page.toolbar).toContainEqual(expect.objectContaining({ id: 'create_multiple_requests', label: 'New Group Time Off', permission: 'time_off.manage' }));
    expect(list.header_actions).toContainEqual(expect.objectContaining({ id: 'create_multiple_requests', label: 'New Group Time Off' }));
    expect(action).toMatchObject({ type: 'server_form', title: 'Multiple Requests', permission: 'time_off.manage', handler: 'yaml_mutation' });
    expect(action.fields.map((field: any) => field.label)).toEqual([
      'Time Off Type', 'Mode ?', 'Employees', 'Dates', 'Dates', 'Description',
    ]);
    expect(action.fields.find((field: any) => field.field === 'employee_ids')).toMatchObject({
      type: 'multi-select', multiple: true, options_source: 'multiple_request_employees', placeholder: 'Everyone',
    });
    expect(action.fields.find((field: any) => field.field === 'allocation_mode')).toMatchObject({ default: 'employee', options_source: 'multiple_request_modes' });
    expect(action.submit_label).toBe('Generate Time Off');
    expect(action.cancel_label).toBe('Discard');
    expect(action.modal_style).toBe('time_off_multiple');
    expect(discovered.pageDatasources.get('time-off-approval')).toEqual(expect.arrayContaining([
      'time_off_approval_requests', 'multiple_request_types', 'multiple_request_employees', 'multiple_request_modes',
    ]));
    expect(api.page.id).toBe('time-off-approval');
  });

  test('seeds lookup data idempotently and generates deterministic requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_multiple_requests_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_multiple_requests_schema_migrations', ['schema', 'data']);
    const api = yaml('api/time-off-approval.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_multiple_requests');
    const employees = await repository.querySource(api.datasources.find((source: any) => source.id === 'multiple_request_employees'), {});
    expect(employees.data).toEqual([
      { value: 'employee-demo-001', label: 'Admin User' },
      { value: 'employee-demo-002', label: 'Marc Demo' },
      { value: 'employee-demo-003', label: 'Mitchell Admin' },
      { value: 'employee-demo-004', label: 'Paul Williams' },
    ]);

    const values = {
      holiday_status_id: 'leave-type-annual',
      allocation_mode: 'employee',
      employee_ids: ['employee-demo-002', 'employee-demo-004'],
      date_from: '2026-09-15',
      date_to: '2026-09-16',
      description: 'Product team shutdown',
    };
    const result = await repository.executeMutation(action.mutation, { values });
    expect(result.generated_count).toBe(2);
    expect(await repository.query("SELECT name, employee_name, leave_type_name, date_from, date_to, days, reason, state FROM leave_requests WHERE name LIKE 'LEAVE/GROUP/%' ORDER BY employee_name")).toEqual([
      { name: 'LEAVE/GROUP/2026-09-15/employee-demo-002', employee_name: 'Marc Demo', leave_type_name: 'Annual Leave', date_from: '2026-09-15T00:00:00.000Z', date_to: '2026-09-16T00:00:00.000Z', days: 2, reason: 'Product team shutdown', state: 'Submitted' },
      { name: 'LEAVE/GROUP/2026-09-15/employee-demo-004', employee_name: 'Paul Williams', leave_type_name: 'Annual Leave', date_from: '2026-09-15T00:00:00.000Z', date_to: '2026-09-16T00:00:00.000Z', days: 2, reason: 'Product team shutdown', state: 'Submitted' },
    ]);
    expect((await repository.query("SELECT version FROM time_off_multiple_requests_schema_migrations WHERE version = '0.0.12'")).length).toBe(1);
    await expect(repository.executeMutation(action.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_MULTI_OVERLAP' });
    database.close();
  });

  test('rejects invalid, stale-like, overlapping, archived, and unauthorized wizard submissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_multiple_requests_guards', ['schema', 'data']);
    const action = yaml('api/time-off-approval.yaml').actions.find((candidate: any) => candidate.id === 'create_multiple_requests');
    const values = {
      holiday_status_id: 'leave-type-annual', allocation_mode: 'employee', employee_ids: ['employee-demo-004'],
      date_from: '2026-09-15', date_to: '2026-09-16', description: 'Maintenance closure',
    };
    await expect(repository.executeMutation(action.mutation, { values: { ...values, holiday_status_id: 'leave-type-archived' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MULTI_TYPE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, allocation_mode: 'unknown' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MULTI_MODE_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, date_from: '2026-09-17', date_to: '2026-09-16' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MULTI_DATES_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, employee_ids: ['employee-missing'] } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MULTI_EMPLOYEES_INVALID' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, employee_ids: ['employee-demo-002'], date_from: '2026-03-16', date_to: '2026-03-16' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_MULTI_OVERLAP' });
    expect(action.permission).toBe('time_off.manage');
    expect(action.mutation.guards.map((guard: any) => guard.status)).toEqual([422, 422, 422, 422, 409, 409]);
    database.close();
  });
});
