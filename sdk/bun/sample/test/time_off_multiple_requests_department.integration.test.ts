import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('TIMEOFF-MULTIPLE-REQUESTS-DEPARTMENT-001', () => {
  test('maps Odoo department mode to an explicit bounded form and keeps page/API ownership explicit', () => {
    const page = yaml('pages/time-off-approval.yaml');
    const api = yaml('api/time-off-approval.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_department_requests');
    const departmentSource = api.datasources.find((source: any) => source.id === 'multiple_request_departments');

    expect(page.page).toMatchObject({ id: 'time-off-approval', route: '/time-off-approval' });
    expect(api.page.id).toBe('time-off-approval');
    expect(page.toolbar).toContainEqual(expect.objectContaining({ id: 'create_department_requests', label: 'New Department Time Off', permission: 'time_off.manage' }));
    expect(page.components.find((component: any) => component.type === 'ListView').header_actions).toContainEqual(expect.objectContaining({ id: 'create_department_requests', label: 'New Department Time Off' }));
    expect(action).toMatchObject({ type: 'server_form', title: 'Multiple Requests — By Department', permission: 'time_off.manage' });
    expect(action.fields.find((field: any) => field.field === 'department_id')).toMatchObject({
      label: 'Department', type: 'select', options_source: 'multiple_request_departments',
    });
    expect(departmentSource.query).toContain('time_off_multiple_request_departments');
    expect(action.mutation.steps[0].query).toContain('time_off_multiple_request_departments');
    expect(action.mutation.guards.map((guard: any) => guard.code)).toContain('TIME_OFF_MULTI_DEPARTMENT_INVALID');
  });

  test('generates one deterministic request per active employee in the selected department', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_multiple_requests_department', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_multiple_requests_department', ['schema', 'data']);
    const api = yaml('api/time-off-approval.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_department_requests');
    const departments = await repository.querySource(api.datasources.find((source: any) => source.id === 'multiple_request_departments'), {});

    expect(departments.data).toEqual([
      { value: 'department-demo-management', label: 'Management (2)' },
      { value: 'department-demo-product', label: 'Product (2)' },
    ]);

    const values = {
      holiday_status_id: 'leave-type-annual',
      allocation_mode: 'department',
      department_id: 'department-demo-product',
      date_from: '2027-03-15',
      date_to: '2027-03-16',
      description: 'Product department closure',
    };
    const result = await repository.executeMutation(action.mutation, { values });
    expect(result.generated_count).toBe(2);
    expect(await repository.query("SELECT name, employee_name, date_from, date_to, days, reason, state FROM leave_requests WHERE name LIKE 'LEAVE/GROUP/2027-03-15/%' ORDER BY employee_name")).toEqual([
      { name: 'LEAVE/GROUP/2027-03-15/employee-demo-002', employee_name: 'Marc Demo', date_from: '2027-03-15T00:00:00.000Z', date_to: '2027-03-16T00:00:00.000Z', days: 2, reason: 'Product department closure', state: 'Submitted' },
      { name: 'LEAVE/GROUP/2027-03-15/employee-demo-004', employee_name: 'Paul Williams', date_from: '2027-03-15T00:00:00.000Z', date_to: '2027-03-16T00:00:00.000Z', days: 2, reason: 'Product department closure', state: 'Submitted' },
    ]);
    expect((await repository.query("SELECT version FROM time_off_multiple_requests_department WHERE version = '0.0.27'")).length).toBe(1);
    await expect(repository.executeMutation(action.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_MULTI_OVERLAP' });
    await expect(repository.executeMutation(action.mutation, { values: { ...values, department_id: 'department-missing', date_from: '2027-04-15' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MULTI_DEPARTMENT_INVALID' });
    database.close();
  });
});
