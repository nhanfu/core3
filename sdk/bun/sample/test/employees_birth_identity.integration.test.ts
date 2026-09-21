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

describe('Employees birth identity parity', () => {
  test('maps Odoo Personal Information fields to separate page/API contracts', () => {
    const employeeSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const versionSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Personal Information');

    expect(employeeSource).toContain("place_of_birth = fields.Char('Place of Birth'");
    expect(employeeSource).toContain('country_of_birth = fields.Many2one');
    expect(versionSource).toContain("sex = fields.Selection([");
    expect(views).toContain('<group string="Personal Information" name="hr_birth_group">');
    expect(views).toContain('<field name="place_of_birth"');
    expect(views).toContain('<field name="sex" string="Gender"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Personal Information', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual(expect.arrayContaining(['place_of_birth', 'country_of_birth', 'sex']));
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('place_of_birth, country_of_birth, sex');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['place_of_birth', 'country_of_birth', 'sex']));
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits birth identity through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_birth_identity_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-BIRTH-001', name: 'Birth Identity Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', place_of_birth: 'Hue', country_of_birth: 'Vietnam', sex: 'female',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Birth Identity Test', place_of_birth: 'Hue', country_of_birth: 'Vietnam', sex: 'female', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Birth Identity Test', place_of_birth: 'Da Nang', country_of_birth: 'Vietnam', sex: 'other' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, place_of_birth: 'Da Nang', country_of_birth: 'Vietnam', sex: 'other', row_version: 2 });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company birth identity mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_birth_identity_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', place_of_birth: 'Hai Phong', country_of_birth: 'Vietnam', sex: 'female' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, sex: 'unknown' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_BIRTH_IDENTITY_GENDER_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT place_of_birth, country_of_birth, sex, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ place_of_birth: 'Ho Chi Minh City', country_of_birth: 'Vietnam', sex: 'female', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic birth identity fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-birth-identity-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_birth_identity_restart');
    expect(await firstRepository.query("SELECT place_of_birth, country_of_birth, sex FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ place_of_birth: 'Hanoi', country_of_birth: 'Vietnam', sex: 'male' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_birth_identity_restart');
    expect(await secondRepository.query("SELECT place_of_birth, country_of_birth, sex FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ place_of_birth: 'Hanoi', country_of_birth: 'Vietnam', sex: 'male' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
