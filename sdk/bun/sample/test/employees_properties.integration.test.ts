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

describe('Employees employee Properties parity', () => {
  test('maps Odoo Properties to separate employee page and API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const component = page.components[0];
    const edit = action(api, 'edit_employee_properties');

    expect(model).toContain("employee_properties = fields.Properties('Properties'");
    expect(views).toContain('<field name="employee_properties" columns="2"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(component.groups).toContainEqual({
      title: 'Properties',
      permission: 'employees.read',
      fields: [{ field: 'employee_properties', label: 'Properties', type: 'textarea', readonly: true, wide: true }],
    });
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['employee_properties']);
    expect(edit.fields[0]).toMatchObject({ field: 'employee_properties', label: 'Properties', type: 'textarea' });
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('employee_properties');
  });

  test('creates and edits durable company-scoped Properties', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_properties_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_properties');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-PROPERTIES-001', name: 'Properties Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', employee_properties: '{"office":"Hue","equipment":"Tablet"}',
      },
    }) as any;
    expect(created).toMatchObject({
      name: 'Properties Test',
      employee_properties: '{"office":"Hue","equipment":"Tablet"}',
      row_version: 1,
    });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { employee_properties: '{"office":"Hanoi","equipment":"Desktop","parking":"B2"}' },
    }) as any;
    expect(edited).toMatchObject({
      id: 'employee-demo-001',
      employee_properties: '{"office":"Hanoi","equipment":"Desktop","parking":"B2"}',
      row_version: 2,
    });
    expect(await repository.query("SELECT employee_properties, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ employee_properties: '{"office":"Hanoi","equipment":"Desktop","parking":"B2"}', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company Properties changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_properties_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_properties');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { employee_properties: '{"office":"Da Nang","equipment":"Laptop"}' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_PROPERTIES_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { employee_properties: 'not-json' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PROPERTIES_INVALID' });
    expect(await repository.query("SELECT employee_properties, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ employee_properties: '{"office":"Da Nang","equipment":"Laptop"}', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Properties fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-properties-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_properties_restart');
    const expected = [
      { id: 'employee-demo-001', employee_properties: '{"office":"Hanoi","equipment":"Laptop"}' },
      { id: 'employee-demo-002', employee_properties: '{"office":"Da Nang","equipment":"Laptop"}' },
    ];
    expect(await firstRepository.query("SELECT id, employee_properties FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_properties_restart');
    expect(await secondRepository.query("SELECT id, employee_properties FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
