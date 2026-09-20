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

describe('Employees emergency contact parity', () => {
  test('maps the Odoo Personal emergency-contact group to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const emergency = personal.groups.find((group: any) => group.title === 'Emergency Contact');

    expect(source).toContain('<group string="Emergency Contact">');
    expect(source).toContain('<field name="emergency_contact" string="Contact"/>');
    expect(source).toContain('<field name="emergency_phone" class="o_force_ltr" string="Phone"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(emergency).toMatchObject({ permission: 'employees.read' });
    expect(emergency.fields.map((field: any) => field.field)).toEqual(['emergency_contact', 'emergency_phone']);
    expect(api.datasources.find((sourceDefinition: any) => sourceDefinition.id === 'employee_detail').query).toContain('emergency_contact');
    expect(edit).toMatchObject({ type: 'server_form', permission: 'employees.write', handler: 'yaml_mutation' });
    expect(edit.mutation.fields).toContain('emergency_contact');
    expect(edit.mutation.fields).toContain('emergency_phone');
    expect(edit.mutation.concurrency).toMatchObject({ required: true });
    expect(edit.fields.map((field: any) => field.field)).toContain('emergency_contact');
    expect(edit.fields.map((field: any) => field.field)).toContain('emergency_phone');
  });

  test('creates and edits deterministic emergency contact data with permission-scoped CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_emergency_contact_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-EMERGENCY-001', name: 'Emergency Contact Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', work_email: 'emergency.contact@core3.local',
        emergency_contact: 'Mai Nguyen', emergency_phone: '+84 901 555 001',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Emergency Contact Test', emergency_contact: 'Mai Nguyen', emergency_phone: '+84 901 555 001', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Emergency Contact Test', emergency_contact: 'Lan Pham', emergency_phone: '+84 901 555 002' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, emergency_contact: 'Lan Pham', emergency_phone: '+84 901 555 002', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Emergency Contact Test', emergency_contact: 'Stale Contact', emergency_phone: '+84 901 555 009' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 2, current_company_name: 'Other Company',
      values: { name: 'Emergency Contact Test', emergency_contact: 'Wrong Company', emergency_phone: '+84 901 555 010' },
    })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query(`SELECT emergency_contact, emergency_phone, row_version FROM employees WHERE id = '${created.id}'`))
      .toEqual([{ emergency_contact: 'Lan Pham', emergency_phone: '+84 901 555 002', row_version: 2 }]);
    await database.close();
  });

  test('keeps seeded emergency contacts through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-emergency-contact-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_emergency_contact_restart');
    expect(await firstRepository.query("SELECT emergency_contact, emergency_phone FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ emergency_contact: 'Minh Tran', emergency_phone: '+84 901 100 002' }]);
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_emergency_contact_restart');
    expect(await secondRepository.query("SELECT emergency_contact, emergency_phone FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ emergency_contact: 'Minh Tran', emergency_phone: '+84 901 100 002' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
