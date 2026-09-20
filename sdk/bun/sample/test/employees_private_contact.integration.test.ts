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

describe('Employees private contact parity', () => {
  test('maps Odoo Private Contact fields to separate page/API contracts', () => {
    const employeeSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Private Contact');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(employeeSource).toContain('private_phone = fields.Char(string="Private Phone"');
    expect(employeeSource).toContain('private_email = fields.Char(string="Private Email"');
    expect(views).toContain('<group string="Private Contact">');
    expect(views).toContain('<field name="private_phone"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Private Contact', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual(['private_email', 'private_phone', 'street', 'birthday']);
    expect(datasource.query).toContain('private_phone');
    expect(edit.mutation.fields).toContain('private_phone');
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits private contact through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_contact_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-CONTACT-001', name: 'Private Contact Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        private_email: 'contact.test@core3.local', private_phone: '+84 901 299 001',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Private Contact Test', private_email: 'contact.test@core3.local', private_phone: '+84 901 299 001', row_version: 1 });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Private Contact Test', private_email: 'updated.contact@core3.local', private_phone: '+84 901 299 002' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, private_email: 'updated.contact@core3.local', private_phone: '+84 901 299 002', row_version: 2 });
    await database.close();
  });

  test('rejects stale and cross-company private contact mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_contact_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', private_email: 'anh.updated@core3.local', private_phone: '+84 901 299 002' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT private_email, private_phone, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ private_email: 'anh.private@core3.local', private_phone: '+84 901 200 002', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic private contact fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-private-contact-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_private_contact_restart');
    expect(await firstRepository.query("SELECT private_email, private_phone FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_email: 'admin.private@core3.local', private_phone: '+84 901 200 001' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_private_contact_restart');
    expect(await secondRepository.query("SELECT private_email, private_phone FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_email: 'admin.private@core3.local', private_phone: '+84 901 200 001' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
