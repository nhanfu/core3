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

describe('Employees ad-hoc activity parity', () => {
  test('maps Odoo mail.activity.mixin and chatter scheduling to separate API and page contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const form = page.components[0];
    const schedule = action(api, 'schedule_employee_activity');

    expect(sourceModel).toContain("'mail.activity.mixin'");
    expect(sourceView).toContain('<chatter reload_on_follower="True"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ activity_action: 'schedule_employee_activity', activity_label: 'Schedule activity' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail_activities')?.query).toContain('FROM employee_activities');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail_activities')?.query).toContain('activity_origin');
    expect(schedule).toMatchObject({ type: 'server_form', permission: 'employees.write', handler: 'yaml_mutation', operation: 'activity' });
    expect(schedule.mutation.concurrency).toEqual({ required: true });
    expect(schedule.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'content', type: 'textarea', required: true }),
      expect.objectContaining({ field: 'activity_type', type: 'select' }),
      expect.objectContaining({ field: 'activity_date', type: 'text' }),
    ]));
  });

  test('schedules a company-scoped activity, increments the employee, and records chatter audit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_activity_crud');
    const api = yaml('api/employee-detail.yaml');
    const schedule = action(api, 'schedule_employee_activity');
    const activities = api.datasources.find((entry: any) => entry.id === 'employee_detail_activities');

    expect((await repository.querySource(activities, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'employee-activity-adhoc-001', activity_origin: 'adhoc', activity_summary: 'Confirm employee review' })]));
    const created = await repository.executeMutation(schedule.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, content: 'Schedule a benefits review', activity_type: 'meeting',
      activity_date: '2026-01-20', activity_user: 'HR Manager', current_company_name: 'Core3 Vietnam',
      current_user_id: 'user-qa', current_user_name: 'QA User',
    }) as any;

    expect(created).toMatchObject({
      id: 'employee-activity-adhoc-employee-demo-001-1', employee_id: 'employee-demo-001',
      activity_type: 'meeting', activity_summary: 'Schedule a benefits review',
      activity_user: 'HR Manager', activity_state: 'planned', activity_origin: 'adhoc', timing: 'Planned',
    });
    expect(String(created.activity_date)).toContain('2026-01-20');
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 2 }]);
    expect(await repository.query("SELECT action, action_label, detail FROM employee_messages WHERE employee_id = 'employee-demo-001' AND action = 'employees.activity.schedule'"))
      .toEqual(expect.arrayContaining([{ action: 'employees.activity.schedule', action_label: 'Scheduled activity', detail: 'Schedule a benefits review' }]));
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid type, blank content, and malformed date atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_activity_guards');
    const schedule = action(yaml('api/employee-detail.yaml'), 'schedule_employee_activity');
    const base = {
      id: 'employee-demo-001', expected_row_version: 1, content: 'Review the employee record', activity_type: 'todo',
      activity_date: '2026-01-15', current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User',
    };

    await expect(repository.executeMutation(schedule.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_ACTIVITY_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, activity_type: 'unsupported' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, content: '   ' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_ACTIVITY_SUMMARY_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, activity_date: '2026/01/15' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_ACTIVITY_DATE_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_activities WHERE employee_id = 'employee-demo-001' AND activity_origin = 'adhoc' AND id <> 'employee-activity-adhoc-001'"))
      .toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves scheduled activity, audit, and row version through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-activity-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_activity_restart');
    const schedule = action(yaml('api/employee-detail.yaml'), 'schedule_employee_activity');
    await firstRepository.executeMutation(schedule.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, content: 'Prepare the probation review', activity_type: 'call',
      activity_date: '2026-01-21', current_company_name: 'Core3 Vietnam', current_user_id: 'user-hr-manager', current_user_name: 'HR Manager',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_activity_restart');
    expect(await secondRepository.query("SELECT id, activity_type, activity_summary, activity_origin FROM employee_activities WHERE id = 'employee-activity-adhoc-employee-demo-002-1'"))
      .toEqual([{ id: 'employee-activity-adhoc-employee-demo-002-1', activity_type: 'call', activity_summary: 'Prepare the probation review', activity_origin: 'adhoc' }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_messages WHERE employee_id = 'employee-demo-002' AND action = 'employees.activity.schedule'"))
      .toEqual([{ count: 1 }]);
    expect(await secondRepository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-002'")).toEqual([{ row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
