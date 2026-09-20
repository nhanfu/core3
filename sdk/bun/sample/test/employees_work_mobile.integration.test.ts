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

describe('Employees work mobile parity', () => {
  test('maps Odoo Work Mobile to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const workGroup = work.groups.find((candidate: any) => candidate.title === 'Work');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(source).toContain("mobile_phone = fields.Char('Work Mobile')");
    expect(views).toContain('<field name="mobile_phone" widget="phone"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(workGroup.fields.map((field: any) => field.field)).toContain('mobile_phone');
    expect(datasource.query).toContain('mobile_phone');
    expect(edit.mutation.fields).toContain('mobile_phone');
    expect(edit.fields).toEqual(expect.arrayContaining([{ field: 'mobile_phone', label: 'Work Mobile', type: 'text' }]));
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits Work Mobile through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_mobile_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-MOBILE-001', name: 'Mobile Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        mobile_phone: '+84 988 111 222',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Mobile Test', mobile_phone: '+84 988 111 222', row_version: 1 });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Mobile Test', mobile_phone: '+84 988 333 444' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, mobile_phone: '+84 988 333 444', row_version: 2 });
    await database.close();
  });

  test('rejects stale and cross-company Work Mobile changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_work_mobile_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', mobile_phone: '+84 901 000 111' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT mobile_phone, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ mobile_phone: '+84 901 234 567', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Work Mobile fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-work-mobile-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_work_mobile_restart');
    const expected = [{ mobile_phone: '+84 912 345 678' }];
    expect(await firstRepository.query("SELECT mobile_phone FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_work_mobile_restart');
    expect(await secondRepository.query("SELECT mobile_phone FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
