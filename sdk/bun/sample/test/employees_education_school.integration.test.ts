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

describe('Employees education school parity', () => {
  test('maps Odoo study_school to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const education = page.components[0].notebook.tabs
      .flatMap((tab: any) => tab.groups ?? [])
      .find((group: any) => group.title === 'Education');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_study_school');

    expect(sourceModel).toContain('study_school = fields.Char("School"');
    expect(sourceViews).toContain('<group string="Education" name="hr_education_group">');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(education.fields).toContainEqual({ field: 'study_school', label: 'School' });
    expect(detail.query).toContain('study_field, study_school');
    expect(edit).toMatchObject({
      permission: 'employees.write',
      action: 'employees.records.education.school.update',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(edit.mutation.fields).toEqual(['study_school']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_EDUCATION_SCHOOL_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_EDUCATION_SCHOOL_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_EDUCATION_SCHOOL_INVALID' }),
    ]));
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_study_school' }));
  });

  test('creates and edits School through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_education_school_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_study_school');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-SCHOOL-001', name: 'School Information Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', certificate: 'bachelor', study_field: 'Computer Science', study_school: 'Hue University',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'School Information Test', study_school: 'Hue University', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { study_school: 'Vietnam National University' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, study_school: 'Vietnam National University', row_version: 2 });
    expect(await repository.query(`SELECT study_school, row_version FROM employees WHERE id = '${created.id}'`))
      .toEqual([{ study_school: 'Vietnam National University', row_version: 2 }]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and invalid School changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_education_school_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_study_school');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { study_school: 'Hanoi University of Science' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_EDUCATION_SCHOOL_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_EDUCATION_SCHOOL_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { study_school: 'x'.repeat(201) } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_EDUCATION_SCHOOL_INVALID' });
    expect(await repository.query("SELECT study_school, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ study_school: 'Hanoi University of Science', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic School fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-education-school-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_education_school_restart');
    expect(await firstRepository.query("SELECT study_school FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ study_school: 'Vietnam National University' }]);
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_study_school');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { study_school: 'Hanoi University' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_education_school_restart');
    expect(await secondRepository.query("SELECT study_school, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ study_school: 'Hanoi University', row_version: 2 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
