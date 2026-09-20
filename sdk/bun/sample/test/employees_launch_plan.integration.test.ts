import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const odooRoot = '/home/nhanjs/projects/odoo/addons/hr';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees Launch Plan parity', () => {
  test('maps the Odoo employee action and keeps the page/API contract separate', () => {
    const sourceViews = readFileSync(join(odooRoot, 'views/hr_employee_views.xml'), 'utf8');
    const sourcePlan = readFileSync(join(odooRoot, 'views/mail_activity_plan_views.xml'), 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const launch = action(api, 'launch_employee_plan');

    expect(sourceViews).toContain('name="%(plan_wizard_action)d" string="Launch Plan" type="action"');
    expect(sourceViews).toContain('groups="hr.group_hr_user" invisible="not active or not id"');
    expect(sourcePlan).toContain('<field name="name">Launch Plan</field>');
    expect(sourcePlan).toContain("'plan_mode': True, 'active_model': 'hr.employee'");
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual({
      id: 'launch_employee_plan', label: 'Launch Plan', variant: 'secondary', permission: 'employees.write', show_if: 'state.employee_detail.active === true',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'employee_launch_plan_wizard')).toMatchObject({ single: true, permission: 'employees.read' });
    expect(api.datasources.find((source: any) => source.id === 'employee_launch_plans')).toMatchObject({ single: false, permission: 'employees.write' });
    expect(launch).toMatchObject({
      type: 'server_form', permission: 'employees.write', handler: 'yaml_mutation',
      action: 'employees.records.launch_plan', prefill: 'state.employee_launch_plan_wizard',
    });
    expect(launch.fields.map((field: any) => field.label)).toEqual(['Activity Plan', 'Plan Date']);
    expect(launch.mutation.steps[0].query).toContain('INSERT INTO employee_activities');
    expect(launch.mutation.steps[0].query).toContain('employee-plan-activity-');
    expect(yaml('permissions.yaml').permissions).toContain('employees.write');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('employee-detail')).toBeTruthy();
    expect(discovered.pageDatasources.get('employee-detail')).toContain('employee_launch_plan_wizard');
  });

  test('launches an eligible plan into ordered durable activities and rejects retries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_launch_plan_create');
    const api = yaml('api/employee-detail.yaml');
    const wizard = api.datasources.find((source: any) => source.id === 'employee_launch_plan_wizard');
    const plans = api.datasources.find((source: any) => source.id === 'employee_launch_plans');
    const launch = action(api, 'launch_employee_plan');
    const base = {
      id: 'employee-demo-002', employee_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_name: 'HR Manager',
      plan_id: 'employee-plan-onboarding', plan_date: '2026-01-15',
    };

    expect(await repository.querySource(wizard, { id: base.id, current_company_name: base.current_company_name }, 0, 1)).toMatchObject({
      data: { id: base.id, row_version: 1, employee_name: 'Nguyen Minh Anh', plan_date: '2026-01-15' },
    });
    expect((await repository.querySource(plans, { employee_id: base.id, current_company_name: base.current_company_name }, 0, 20)).data.map((row: any) => row.label))
      .toEqual(['Offboarding', 'Onboarding']);
    const result = await repository.executeMutation(launch.mutation, base);
    expect(result).toMatchObject({ id: 'employee-plan-activity-employee-demo-002-employee-plan-onboarding-1' });
    expect((await repository.query("SELECT id FROM employee_activities WHERE employee_id = 'employee-demo-002' AND plan_id = 'employee-plan-onboarding' ORDER BY id")).map((row: any) => row.id)).toEqual([
      'employee-plan-activity-employee-demo-002-employee-plan-onboarding-1',
      'employee-plan-activity-employee-demo-002-employee-plan-onboarding-2',
    ]);
    expect(await repository.query("SELECT CAST(activity_date AS VARCHAR) AS activity_date, activity_user, plan_name, responsible_type FROM employee_activities WHERE employee_id = 'employee-demo-002' AND plan_id = 'employee-plan-onboarding' ORDER BY activity_date, id"))
      .toEqual([
        { activity_date: '2026-01-15', activity_user: 'Nguyen Minh Anh', plan_name: 'Onboarding', responsible_type: 'Employee' },
        { activity_date: '2026-01-17', activity_user: 'Engineering Manager', plan_name: 'Onboarding', responsible_type: 'Manager' },
      ]);
    await expect(repository.executeMutation(launch.mutation, base)).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_PLAN_ALREADY_LAUNCHED' });
    await database.close();
  });

  test('enforces company, actor, active-state, stale, date, eligibility, and empty-plan guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_launch_plan_guards');
    const launch = action(yaml('api/employee-detail.yaml'), 'launch_employee_plan');
    expect(launch.permission).toBe('employees.write');
    const base = {
      id: 'employee-demo-002', employee_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_name: 'HR Manager',
      plan_id: 'employee-plan-onboarding', plan_date: '2026-01-15',
    };
    await expect(repository.executeMutation(launch.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PLAN_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(launch.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(launch.mutation, { ...base, id: 'employee-demo-004', employee_id: 'employee-demo-004' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PLAN_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(launch.mutation, { ...base, plan_date: '15-01-2026' }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PLAN_DATE_INVALID' });
    await expect(repository.executeMutation(launch.mutation, { ...base, plan_id: 'employee-plan-engineering' }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PLAN_NOT_ELIGIBLE' });
    await repository.query("UPDATE employee_activity_plan_steps SET summary = 'Temporary' WHERE plan_id = 'employee-plan-onboarding'");
    await repository.query("DELETE FROM employee_activity_plan_steps WHERE plan_id = 'employee-plan-onboarding'");
    await expect(repository.executeMutation(launch.mutation, base)).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PLAN_EMPTY' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_activities WHERE employee_id = 'employee-demo-002'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('preserves launched activities through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-launch-plan-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_launch_plan_restart');
    const launch = action(yaml('api/employee-detail.yaml'), 'launch_employee_plan');
    await firstRepository.executeMutation(launch.mutation, {
      id: 'employee-demo-002', employee_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_name: 'HR Manager',
      plan_id: 'employee-plan-onboarding', plan_date: '2026-01-15',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_launch_plan_restart');
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_activities WHERE employee_id = 'employee-demo-002' AND plan_id = 'employee-plan-onboarding'"))
      .toEqual([{ count: 2 }]);
    expect(await secondRepository.query("SELECT plan_name, responsible_type FROM employee_activities WHERE employee_id = 'employee-demo-002' AND plan_id = 'employee-plan-onboarding' ORDER BY id"))
      .toEqual([
        { plan_name: 'Onboarding', responsible_type: 'Employee' },
        { plan_name: 'Onboarding', responsible_type: 'Manager' },
      ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
