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

describe('Employees identity documents parity', () => {
  test('maps Odoo Personal Documents fields to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Documents');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(source).toContain("id_card = fields.Binary(string=\"ID Card Copy\"");
    expect(source).toContain("driving_license = fields.Binary(string=\"Driving License\"");
    expect(views).toContain('<group string="Documents" name="hr_document_group">');
    expect(views).toContain('<field name="id_card"/>');
    expect(views).toContain('<field name="driving_license"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Documents', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual([
      'id_card', 'id_card_name', 'driving_license', 'driving_license_name',
    ]);
    expect(datasource.query).toContain('id_card');
    expect(datasource.query).toContain('driving_license');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining([
      'id_card', 'id_card_name', 'driving_license', 'driving_license_name',
    ]));
    expect(edit.mutation.boolean_fields).toEqual(['birthday_public_display', 'has_work_permit', 'id_card', 'driving_license']);
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits identity document metadata through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_documents_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-DOC-001', name: 'Document Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        id_card: true, id_card_name: 'Document Test_id_card.pdf', driving_license: false, driving_license_name: null,
      },
    }) as any;
    expect(created).toMatchObject({
      name: 'Document Test', id_card: true, id_card_name: 'Document Test_id_card.pdf',
      driving_license: false, driving_license_name: null, row_version: 1,
    });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: {
        name: 'Document Test', id_card: true, id_card_name: 'Document Test_id_card_updated.pdf',
        driving_license: true, driving_license_name: 'Document Test_driving_license.pdf',
      },
    }) as any;
    expect(edited).toMatchObject({
      id: created.id, id_card: true, id_card_name: 'Document Test_id_card_updated.pdf',
      driving_license: true, driving_license_name: 'Document Test_driving_license.pdf', row_version: 2,
    });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company document mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_documents_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', id_card: false, id_card_name: null, driving_license: false, driving_license_name: null },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, id_card: true, id_card_name: null } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_ID_CARD_DOCUMENT_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, driving_license: true, driving_license_name: null } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DRIVING_LICENSE_DOCUMENT_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT id_card, id_card_name, driving_license, driving_license_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ id_card: false, id_card_name: null, driving_license: false, driving_license_name: null, row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic document metadata through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-documents-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_documents_restart');
    const expected = [{
      id_card: true, id_card_name: 'Admin User_id_card.pdf', driving_license: true,
      driving_license_name: 'Admin User_driving_license.pdf',
    }];
    expect(await firstRepository.query("SELECT id_card, id_card_name, driving_license, driving_license_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_documents_restart');
    expect(await secondRepository.query("SELECT id_card, id_card_name, driving_license, driving_license_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
