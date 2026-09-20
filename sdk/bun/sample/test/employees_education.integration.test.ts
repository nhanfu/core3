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

describe('Employees education parity', () => {
  test('maps Odoo Education fields to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const listApi = yaml('api/employees.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const education = personal.groups.find((group: any) => group.title === 'Education');

    expect(sourceModel).toContain("certificate = fields.Selection(selection='_get_certificate_selection'");
    expect(sourceModel).toContain('study_field = fields.Char("Field of Study"');
    expect(sourceViews).toContain('<group string="Education" name="hr_education_group">');
    expect(sourceViews).toContain('<field name="certificate"/>');
    expect(sourceViews).toContain('<field name="study_field"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(education).toMatchObject({ title: 'Education', permission: 'employees.read' });
    expect(education.fields.map((field: any) => field.field)).toEqual(['certificate', 'study_field']);
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('certificate, study_field');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['certificate', 'study_field']));
    expect(edit.permission).toBe('employees.write');
    expect(listApi.actions.find((entry: any) => entry.id === 'create_employee').mutation.fields).toEqual(expect.arrayContaining(['certificate', 'study_field']));
  });

  test('creates and edits education through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_education_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-EDU-001', name: 'Education Information Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', certificate: 'bachelor', study_field: 'Computer Science',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Education Information Test', certificate: 'bachelor', study_field: 'Computer Science', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Education Information Test', certificate: 'master', study_field: 'Data Science' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, certificate: 'master', study_field: 'Data Science', row_version: 2 });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company education mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_education_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', certificate: 'bachelor', study_field: 'Accounting' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, certificate: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_EDUCATION_CERTIFICATE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT certificate, study_field, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ certificate: 'graduate', study_field: 'Business Administration', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic education fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-education-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_education_restart');
    expect(await firstRepository.query("SELECT certificate, study_field FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ certificate: 'bachelor', study_field: 'Computer Science' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_education_restart');
    expect(await secondRepository.query("SELECT certificate, study_field FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ certificate: 'bachelor', study_field: 'Computer Science' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
