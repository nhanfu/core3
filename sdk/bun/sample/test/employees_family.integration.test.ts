import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const authRoot = join(import.meta.dir, '../services/auth');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(authRoot, 'migrations'), undefined, `${name}_auth`, ['schema', 'data']);
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, `${name}_employees`, ['schema', 'data']);
}

describe('Employees family information parity', () => {
  test('maps Odoo current-version Family fields to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const family = personal.groups.find((group: any) => group.title === 'Family');

    expect(sourceModel).toContain("marital = fields.Selection(");
    expect(sourceModel).toContain('spouse_complete_name = fields.Char');
    expect(sourceModel).toContain('spouse_birthdate = fields.Date');
    expect(sourceModel).toContain("children = fields.Integer");
    expect(sourceViews).toContain('<group string="Family" name="hr_family_group">');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(family).toMatchObject({ title: 'Family', permission: 'employees.read' });
    expect(family.fields.map((field: any) => field.field)).toEqual(['marital', 'spouse_complete_name', 'spouse_birthdate', 'children']);
    expect(family.fields[1].show_if).toContain('married');
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('spouse_birthdate');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['marital', 'spouse_complete_name', 'spouse_birthdate', 'children']));
    expect(edit.mutation.concurrency).toMatchObject({ required: true });
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits family information with durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_family_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-FAMILY-001', name: 'Family Information Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', marital: 'married', spouse_complete_name: 'Thao Nguyen', spouse_birthdate: '1991-05-06', children: 2,
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Family Information Test', marital: 'married', spouse_complete_name: 'Thao Nguyen', spouse_birthdate: '1991-05-06T00:00:00.000Z', children: 2, row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Family Information Test', marital: 'single', spouse_complete_name: null, spouse_birthdate: null, children: 0 },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, marital: 'single', spouse_complete_name: null, spouse_birthdate: null, children: 0, row_version: 2 });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company family mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_family_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = { id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', values: { name: 'Nguyen Minh Anh', marital: 'single', spouse_complete_name: null, spouse_birthdate: null, children: 0 } };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, marital: 'unknown' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_FAMILY_MARITAL_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, children: -1 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_FAMILY_CHILDREN_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, spouse_birthdate: '06/05/1991' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_FAMILY_BIRTHDATE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT marital, spouse_complete_name, spouse_birthdate, children, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ marital: 'single', spouse_complete_name: null, spouse_birthdate: null, children: 0, row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic family data through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-family-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_family_restart');
    expect(await firstRepository.query("SELECT marital, spouse_complete_name, spouse_birthdate, children FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ marital: 'married', spouse_complete_name: 'Linh Nguyen', spouse_birthdate: '1992-04-12T00:00:00.000Z', children: 2 }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_family_restart');
    expect(await secondRepository.query("SELECT marital, spouse_complete_name, spouse_birthdate, children FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ marital: 'married', spouse_complete_name: 'Linh Nguyen', spouse_birthdate: '1992-04-12T00:00:00.000Z', children: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
