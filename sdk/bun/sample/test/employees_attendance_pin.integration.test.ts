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

describe('Employees Attendance PIN parity', () => {
  test('maps Odoo Settings Attendance and Point of Sale PIN to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const attendance = settings.groups.find((group: any) => group.title === 'Attendance / Point of Sale');
    const datasource = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_pin');

    expect(source).toContain("pin = fields.Char(string=\"PIN\"");
    expect(views).toContain('<field name="pin" string="PIN Code"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(attendance.permission).toBe('employees.write');
    expect(attendance.fields).toEqual([{ field: 'pin', label: 'PIN Code', readonly: true }]);
    expect(datasource.query).toContain('pin');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['pin']);
    expect(edit.fields[0]).toMatchObject({ field: 'pin', label: 'PIN Code', type: 'password' });
  });

  test('creates and edits an Attendance PIN with durable employee persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_attendance_pin_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_pin');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-ATTENDANCE-PIN-001', name: 'Attendance PIN Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', pin: '2468',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Attendance PIN Test', pin: '2468', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { pin: '7391' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', pin: '7391', row_version: 2 });
    expect(await repository.query("SELECT pin, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ pin: '7391', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company PIN changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_attendance_pin_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_pin');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { pin: '8642' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PIN_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { pin: '86A2' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PIN_INVALID' });
    expect(await repository.query("SELECT pin, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ pin: '7314', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic PIN fixtures through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-attendance-pin-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_attendance_pin_restart');
    const expected = [
      { id: 'employee-demo-001', pin: '4821' },
      { id: 'employee-demo-002', pin: '7314' },
    ];
    expect(await firstRepository.query("SELECT id, pin FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_attendance_pin_restart');
    expect(await secondRepository.query("SELECT id, pin FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
