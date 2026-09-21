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

describe('Employees Work Location Type parity', () => {
  test('maps Odoo work_location_type to the paired employee contracts', () => {
    const sourceEmployee = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceLocation = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_work_location.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const location = work.groups.find((group: any) => group.title === 'Location');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const refresh = action(api, 'refresh_employee_work_location_type');

    expect(sourceEmployee).toContain('work_location_type = fields.Selection([');
    expect(sourceEmployee).toContain('("home", "Home")');
    expect(sourceLocation).toContain('location_type = fields.Selection(');
    expect(sourceViews).toContain('<field name="work_location_id"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detail.query).toContain('work_location_type');
    expect(location.fields).toContainEqual({ field: 'work_location_type', label: 'Work Location Type' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'refresh_employee_work_location_type' }));
    expect(refresh).toMatchObject({
      permission: 'employees.write',
      action: 'employees.records.work_location_type.refresh',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(refresh.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_WORK_LOCATION_TYPE_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_WORK_LOCATION_TYPE_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
    ]));
  });

  test('reads and refreshes a durable employee Work Location Type', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_location_type_crud');
    const detail = yaml('api/employee-detail.yaml').datasources.find((entry: any) => entry.id === 'employee_detail');
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_work_location_type');
    expect((await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).data)
      .toMatchObject({ work_location_id: 'work-location-hcm', work_location_type: 'office' });
    await repository.query("UPDATE employees SET work_location_id = 'work-location-home' WHERE id = 'employee-demo-001'");
    const refreshed = await repository.executeMutation(refresh.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(refreshed).toMatchObject({ id: 'employee-demo-001', work_location_type: 'home', row_version: 2 });
    expect(await repository.query("SELECT work_location_type, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_location_type: 'home', row_version: 2 }]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and missing employees atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_location_type_guards');
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_work_location_type');
    const base = { id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin' };
    await expect(repository.executeMutation(refresh.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_WORK_LOCATION_TYPE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_LOCATION_TYPE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(refresh.mutation, { ...base, id: 'employee-does-not-exist' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_WORK_LOCATION_TYPE_EMPLOYEE_NOT_FOUND' });
    expect(await repository.query("SELECT work_location_type, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ work_location_type: 'office', row_version: 1 }]);
    await database.close();
  });

  test('preserves Work Location Type through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-location-type-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_location_type_restart');
    const refresh = action(yaml('api/employee-detail.yaml'), 'refresh_employee_work_location_type');
    await firstRepository.executeMutation(refresh.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_location_type_restart');
    expect(await secondRepository.query("SELECT work_location_type, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ work_location_type: 'office', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
