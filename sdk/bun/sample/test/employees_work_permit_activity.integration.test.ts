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

describe('Employees work permit scheduled activity parity', () => {
  test('maps Odoo work_permit_scheduled_activity to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const permit = personal.groups.find((group: any) => group.title === 'Visa & Work Permit');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_work_permit_activity');

    expect(sourceModel).toContain('work_permit_scheduled_activity = fields.Boolean(default=False, groups="hr.group_hr_user")');
    expect(sourceViews).toContain('<record id="view_employee_form" model="ir.ui.view">');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(permit.fields).toContainEqual({ field: 'work_permit_scheduled_activity', label: 'Schedule Work Permit Activity', type: 'checkbox' });
    expect(detail.query).toContain('has_work_permit, work_permit_scheduled_activity');
    expect(edit).toMatchObject({
      permission: 'employees.write',
      action: 'employees.records.work_permit.activity.update',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(edit.mutation.fields).toEqual(['work_permit_scheduled_activity']);
    expect(edit.mutation.boolean_fields).toEqual(['work_permit_scheduled_activity']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_WORK_PERMIT_ACTIVITY_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_PERMIT_ACTIVITY_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
    ]));
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_work_permit_activity' }));
  });

  test('creates and edits the scheduled activity preference through durable guarded CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_permit_activity_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_permit_activity');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-WORK-PERMIT-ACTIVITY-001', name: 'Work Permit Activity Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', work_permit_scheduled_activity: true,
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Work Permit Activity Test', work_permit_scheduled_activity: true, row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_permit_scheduled_activity: false },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, work_permit_scheduled_activity: false, row_version: 2 });
    expect(await repository.query(`SELECT work_permit_scheduled_activity, row_version FROM employees WHERE id = '${created.id}'`))
      .toEqual([{ work_permit_scheduled_activity: false, row_version: 2 }]);
    await database.close();
  });

  test('rejects missing actor, stale, and cross-company updates atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_permit_activity_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_permit_activity');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_permit_scheduled_activity: true },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_WORK_PERMIT_ACTIVITY_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_PERMIT_ACTIVITY_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT work_permit_scheduled_activity, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ work_permit_scheduled_activity: false, row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic preference fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-permit-activity-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_permit_activity_restart');
    expect(await firstRepository.query("SELECT work_permit_scheduled_activity FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_permit_scheduled_activity: true }]);
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_work_permit_activity');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { work_permit_scheduled_activity: false },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_permit_activity_restart');
    expect(await secondRepository.query("SELECT work_permit_scheduled_activity, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_permit_scheduled_activity: false, row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
