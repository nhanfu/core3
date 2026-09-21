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

describe('Employees visa and work permit parity', () => {
  test('maps Odoo Personal Visa & Work Permit fields to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Visa & Work Permit');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(source).toContain("permit_no = fields.Char('Work Permit No'");
    expect(source).toContain("visa_no = fields.Char('Visa No'");
    expect(source).toContain("has_work_permit = fields.Binary(string=\"Work Permit\"");
    expect(views).toContain('<group string="Visa &amp; Work Permit">');
    expect(views).toContain('<field name="work_permit_expiration_date"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Visa & Work Permit', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual([
      'visa_no', 'visa_expire', 'permit_no', 'work_permit_expiration_date', 'has_work_permit', 'work_permit_name', 'work_permit_scheduled_activity',
    ]);
    expect(datasource.query).toContain('visa_no');
    expect(datasource.query).toContain('work_permit_expiration_date');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining([
      'visa_no', 'visa_expire', 'permit_no', 'work_permit_expiration_date', 'work_permit_name', 'has_work_permit',
    ]));
    expect(edit.mutation.boolean_fields).toEqual(expect.arrayContaining(['has_work_permit']));
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits visa/work permit details through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_visa_work_permit_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-WP-001', name: 'Permit Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        visa_no: 'VN-VISA-TEST', visa_expire: '2027-06-30', permit_no: 'VN-WP-TEST',
        work_permit_expiration_date: '2027-12-31', work_permit_name: 'Permit Test_work_permit.pdf', has_work_permit: true,
      },
    }) as any;
    expect(created).toMatchObject({
      name: 'Permit Test', visa_no: 'VN-VISA-TEST', visa_expire: '2027-06-30T00:00:00.000Z', permit_no: 'VN-WP-TEST',
      work_permit_expiration_date: '2027-12-31T00:00:00.000Z', work_permit_name: 'Permit Test_work_permit.pdf', has_work_permit: true, row_version: 1,
    });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: {
        name: 'Permit Test', visa_no: 'VN-VISA-UPDATED', visa_expire: '2028-06-30', permit_no: 'VN-WP-UPDATED',
        work_permit_expiration_date: '2028-12-31', work_permit_name: 'Permit Test_work_permit_updated.pdf', has_work_permit: true,
      },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, visa_no: 'VN-VISA-UPDATED', visa_expire: '2028-06-30T00:00:00.000Z', permit_no: 'VN-WP-UPDATED', row_version: 2 });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company visa/work permit mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_visa_work_permit_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', visa_no: 'VN-VISA-002', visa_expire: '2027-03-31', permit_no: '', work_permit_expiration_date: null, work_permit_name: null, has_work_permit: false },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, visa_expire: '31-03-2027' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_VISA_EXPIRATION_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, has_work_permit: true, work_permit_name: null } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_WORK_PERMIT_DOCUMENT_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT visa_no, visa_expire, permit_no, work_permit_expiration_date, has_work_permit, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ visa_no: 'VN-VISA-002', visa_expire: '2027-03-31T00:00:00.000Z', permit_no: null, work_permit_expiration_date: null, has_work_permit: false, row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic visa/work permit fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-visa-work-permit-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_visa_work_permit_restart');
    expect(await firstRepository.query("SELECT visa_no, visa_expire, permit_no, work_permit_expiration_date, work_permit_name, has_work_permit FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ visa_no: 'VN-VISA-001', visa_expire: '2027-06-30T00:00:00.000Z', permit_no: 'VN-WP-001', work_permit_expiration_date: '2027-12-31T00:00:00.000Z', work_permit_name: 'Admin User_work_permit_VN-WP-001.pdf', has_work_permit: true }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_visa_work_permit_restart');
    expect(await secondRepository.query("SELECT visa_no, visa_expire, permit_no, work_permit_expiration_date, work_permit_name, has_work_permit FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ visa_no: 'VN-VISA-001', visa_expire: '2027-06-30T00:00:00.000Z', permit_no: 'VN-WP-001', work_permit_expiration_date: '2027-12-31T00:00:00.000Z', work_permit_name: 'Admin User_work_permit_VN-WP-001.pdf', has_work_permit: true }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
