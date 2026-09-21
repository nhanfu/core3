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

describe('Employees HR presence parity', () => {
  test('maps Odoo HR presence state and icon to separate list/detail contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const detailPage = yaml('pages/employee-detail.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const listPage = yaml('pages/employees.yaml');
    const listApi = yaml('api/employees.yaml');
    const settings = detailPage.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const detail = detailApi.datasources.find((entry: any) => entry.id === 'employee_detail');
    const refresh = action(detailApi, 'refresh_employee_presence');

    expect(sourceModel).toContain("hr_presence_state = fields.Selection([");
    expect(sourceModel).toContain("('out_of_working_hour', 'Off-Hours')");
    expect(sourceViews).toContain('<field name="hr_presence_state" string="Presence" optional="hide"/>');
    expect(sourceViews).toContain('<field name="hr_icon_display" invisible="not show_hr_icon_display or not id or not active" widget="hr_presence_status"/>');
    expect(detailPage.page.id).toBe('employee-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.page.id).toBe('employees');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detail.query).toContain('hr_presence_state');
    expect(detail.query).toContain('hr_icon_display');
    expect(settings.groups[0].fields).toContainEqual({ field: 'hr_presence_state', label: 'HR Presence', type: 'StatusChip' });
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'refresh_employee_presence' }));
    expect(listApi.datasources.find((entry: any) => entry.id === 'employees').query).toContain('hr_presence_state');
    expect(listPage.components[0].columns).toContainEqual(expect.objectContaining({ field: 'hr_presence_state', label: 'Presence' }));
    expect(refresh).toMatchObject({
      permission: 'employees.write',
      action: 'employees.records.presence.refresh',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(refresh.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_PRESENCE_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_PRESENCE_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
    ]));
  });

  test('reads and refreshes the durable HR presence projection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_hr_presence_crud');
    const detail = yaml('api/employee-detail.yaml').datasources.find((entry: any) => entry.id === 'employee_detail');
    const list = yaml('api/employees.yaml').datasources.find((entry: any) => entry.id === 'employees');
    const initial = await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1);
    expect(initial.data).toMatchObject({ hr_presence_state: 'present', hr_icon_display: 'presence_present', show_hr_icon_display: true });
    await repository.query("UPDATE employees SET presence = 'away' WHERE id = 'employee-demo-001'");
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_presence');
    const refreshed = await repository.executeMutation(refresh.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(refreshed).toMatchObject({ id: 'employee-demo-001', hr_presence_state: 'out_of_working_hour', row_version: 2 });
    expect((await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).data)
      .toMatchObject({ hr_presence_state: 'out_of_working_hour', hr_icon_display: 'presence_out_of_working_hour' });
    expect((await repository.querySource(list, { active: true, q: null, state: null, department_name: null, coach_name: null, current_company_name: 'Core3 Vietnam' }, 0, 50)).data
      .find((row: any) => row.id === 'employee-demo-001')).toMatchObject({ hr_presence_state: 'out_of_working_hour' });
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and missing employees atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_hr_presence_guards');
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_presence');
    const base = { id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin' };
    await expect(repository.executeMutation(refresh.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_PRESENCE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PRESENCE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, id: 'employee-does-not-exist' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PRESENCE_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT hr_presence_state, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ hr_presence_state: 'absent', row_version: 1 }]);
    await database.close();
  });

  test('preserves the HR presence projection through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-hr-presence-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_hr_presence_restart');
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_presence');
    await firstRepository.query("UPDATE employees SET presence = 'online' WHERE id = 'employee-demo-001'");
    await firstRepository.executeMutation(refresh.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_hr_presence_restart');
    expect(await secondRepository.query("SELECT hr_presence_state, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ hr_presence_state: 'present', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
