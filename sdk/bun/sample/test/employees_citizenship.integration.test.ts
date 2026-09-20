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

describe('Employees citizenship parity', () => {
  test('maps Odoo Personal Citizenship fields to separate page/API contracts', () => {
    const versionSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Citizenship');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(versionSource).toContain("country_id = fields.Many2one(");
    expect(versionSource).toContain("identification_id = fields.Char(");
    expect(versionSource).toContain("passport_expiration_date = fields.Date");
    expect(views).toContain('<group name="citizenship" string="Citizenship">');
    expect(views).toContain('<field name="passport_id"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Citizenship', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual([
      'country_id', 'identification_id', 'ssnid', 'passport_id', 'passport_expiration_date',
    ]);
    expect(datasource.query).toContain('country_id');
    expect(datasource.query).toContain('passport_expiration_date');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining([
      'country_id', 'identification_id', 'ssnid', 'passport_id', 'passport_expiration_date',
    ]));
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits citizenship details through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_citizenship_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-CIT-001', name: 'Citizenship Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        country_id: 'Vietnam', identification_id: 'VN-ID-TEST', ssnid: 'VN-SSN-TEST', passport_id: 'P-VN-TEST',
        passport_expiration_date: '2029-06-30',
      },
    }) as any;
    expect(created).toMatchObject({
      name: 'Citizenship Test', country_id: 'Vietnam', identification_id: 'VN-ID-TEST', ssnid: 'VN-SSN-TEST',
      passport_id: 'P-VN-TEST', passport_expiration_date: '2029-06-30T00:00:00.000Z', row_version: 1,
    });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: {
        name: 'Citizenship Test', country_id: 'Vietnam', identification_id: 'VN-ID-UPDATED', ssnid: 'VN-SSN-UPDATED',
        passport_id: 'P-VN-UPDATED', passport_expiration_date: '2030-06-30',
      },
    }) as any;
    expect(edited).toMatchObject({
      id: created.id, identification_id: 'VN-ID-UPDATED', ssnid: 'VN-SSN-UPDATED', passport_id: 'P-VN-UPDATED',
      passport_expiration_date: '2030-06-30T00:00:00.000Z', row_version: 2,
    });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company citizenship mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_citizenship_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', country_id: 'Vietnam', identification_id: 'VN-ID-0002', ssnid: null, passport_id: 'P-VN-0002', passport_expiration_date: '2028-03-31' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, passport_expiration_date: '03-31-2028' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PASSPORT_EXPIRATION_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT country_id, identification_id, ssnid, passport_id, passport_expiration_date, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ country_id: 'Vietnam', identification_id: 'VN-ID-0002', ssnid: null, passport_id: 'P-VN-0002', passport_expiration_date: '2028-03-31T00:00:00.000Z', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic citizenship fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-citizenship-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_citizenship_restart');
    expect(await firstRepository.query("SELECT country_id, identification_id, ssnid, passport_id, passport_expiration_date FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ country_id: 'Vietnam', identification_id: 'VN-ID-0001', ssnid: 'VN-SSN-0001', passport_id: 'P-VN-0001', passport_expiration_date: '2029-06-30T00:00:00.000Z' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_citizenship_restart');
    expect(await secondRepository.query("SELECT country_id, identification_id, ssnid, passport_id, passport_expiration_date FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ country_id: 'Vietnam', identification_id: 'VN-ID-0001', ssnid: 'VN-SSN-0001', passport_id: 'P-VN-0001', passport_expiration_date: '2029-06-30T00:00:00.000Z' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
