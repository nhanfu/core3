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

describe('Employees birthday visibility parity', () => {
  test('maps Odoo birthday visibility to separate detail and directory contracts', () => {
    const employeeSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const publicViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_public_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const directoryPage = yaml('pages/directory.yaml');
    const directoryApi = yaml('api/directory.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Personal Information');

    expect(employeeSource).toContain("birthday_public_display = fields.Boolean('Show to all employees'");
    expect(employeeSource).toContain('birthday_public_display_string = fields.Char');
    expect(views).toContain('<field name="birthday_public_display"');
    expect(publicViews).toContain('birthday_public_display_string');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(directoryPage.page.id).toBe(directoryApi.page.id);
    expect(group.fields.map((field: any) => field.field)).toContain('birthday_public_display');
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('birthday_public_display');
    expect(directoryApi.datasources.find((source: any) => source.id === 'employee_directory').query).toContain('birthday_public_display_string');
    expect(edit.mutation.fields).toContain('birthday_public_display');
    expect(edit.mutation.boolean_fields).toContain('birthday_public_display');
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits birthday visibility through guarded employee CRUD and directory projection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_birthday_visibility_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const directory = yaml('api/directory.yaml').datasources.find((source: any) => source.id === 'employee_directory');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-BIRTHDAY-001', name: 'Birthday Visibility Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        birthday: '1991-04-12', birthday_public_display: true,
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Birthday Visibility Test', birthday: '1991-04-12T00:00:00.000Z', birthday_public_display: true, row_version: 1 });
    const visible = await repository.querySource(directory, { active: 'active', q: 'Birthday Visibility Test', company_name: null, current_company_name: 'Core3 Vietnam', department_name: null, manager_name: null, newly_hired: null }, 0, 10);
    expect(visible.data).toMatchObject([{ id: created.id, birthday_public_display_string: '12 April' }]);

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Birthday Visibility Test', birthday: '1991-04-12', birthday_public_display: false },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, birthday_public_display: false, row_version: 2 });
    const hidden = await repository.querySource(directory, { active: 'active', q: 'Birthday Visibility Test', company_name: null, current_company_name: 'Core3 Vietnam', department_name: null, manager_name: null, newly_hired: null }, 0, 10);
    expect(hidden.data).toMatchObject([{ id: created.id, birthday_public_display_string: null }]);
    await database.close();
  });

  test('rejects stale and cross-company visibility changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_birthday_visibility_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', birthday: '1992-09-18', birthday_public_display: true },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT birthday, birthday_public_display, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ birthday: '1992-09-18T00:00:00.000Z', birthday_public_display: false, row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic visibility through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-birthday-visibility-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_birthday_visibility_restart');
    expect(await firstRepository.query("SELECT birthday, birthday_public_display FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ birthday: '1990-05-20T00:00:00.000Z', birthday_public_display: true }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_birthday_visibility_restart');
    expect(await secondRepository.query("SELECT birthday, birthday_public_display FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ birthday: '1990-05-20T00:00:00.000Z', birthday_public_display: true }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
