import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees Working Hours parity', () => {
  test('maps Odoo employee Working Hours to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_working_hours');
    const payroll = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'payroll');
    const workingHours = payroll.groups.find((group: any) => group.title === 'Working Hours');

    expect(sourceModel).toContain("resource_calendar_id = fields.Many2one(related='version_id.resource_calendar_id'");
    expect(sourceViews).toContain('<field name="resource_calendar_id" help="The default working hours are set in configuration."/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_working_hours', permission: 'employees.manage' }));
    expect(workingHours).toMatchObject({ title: 'Working Hours', permission: 'employees.manage' });
    expect(workingHours.fields.map((field: any) => field.field)).toEqual(['working_schedule']);
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('working_schedule_id');
    expect(api.datasources.find((source: any) => source.id === 'employee_working_schedules_for_employee').query).toContain('employee_working_schedules');
    expect(edit.mutation.fields).toEqual(['working_schedule_id']);
    expect(edit.permission).toBe('employees.manage');
  });

  test('updates the employee and active Payroll record durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_working_hours_crud');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_working_hours');
    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { working_schedule_id: 'working-schedule-standard-38' },
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', working_schedule_id: 'working-schedule-standard-38', working_schedule: 'Standard 38 hours/week', row_version: 2 });
    expect(await repository.query("SELECT working_schedule_id, schedule_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true AND contract_date_start <= DATE '2026-01-15' ORDER BY date_version DESC LIMIT 1"))
      .toEqual([{ working_schedule_id: 'working-schedule-standard-38', schedule_name: 'Standard 38 hours/week' }]);
    await database.close();
  });

  test('rejects actor, invalid, stale, and cross-company Working Hours changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_working_hours_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_working_hours');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, current_user_id: 'user-hr-manager',
      current_company_name: 'Core3 Vietnam', values: { working_schedule_id: 'working-schedule-standard-38' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: null })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { working_schedule_id: 'working-schedule-standard-20' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WORKING_HOURS_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORKING_HOURS_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT working_schedule_id, working_schedule, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ working_schedule_id: 'working-schedule-standard-40', working_schedule: 'Standard 40 hours/week', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Working Hours assignments through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-working-hours-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_working_hours_restart');
    expect(await firstRepository.query("SELECT working_schedule_id FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ working_schedule_id: 'working-schedule-standard-40' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_working_hours_restart');
    expect(await secondRepository.query("SELECT working_schedule_id FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ working_schedule_id: 'working-schedule-standard-40' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
