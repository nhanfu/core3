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

describe('Employees private car plate parity', () => {
  test('maps Odoo private_car_plate search/list behavior to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const api = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(api, 'create_employee');
    const edit = action(detailApi, 'edit_employee');

    expect(sourceModel).toContain('private_car_plate = fields.Char(groups="hr.group_hr_user"');
    expect(sourceViews).toContain('<field name="private_car_plate" groups="hr.group_hr_user"/>');
    expect(sourceViews).toContain('<field name="name" readonly="1"/>');
    expect(page.page.id).toBe('employees');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].search.placeholder).toContain('private car plate');
    expect(page.components[0].columns).toContainEqual({ field: 'private_car_plate', label: 'Private Car Plate', optional: 'hide' });
    const listQuery = api.datasources.find((source: any) => source.id === 'employees').query;
    expect(listQuery).toContain('e.private_car_plate');
    expect(listQuery).toContain("COALESCE(e.private_car_plate, '') ILIKE");
    expect(create.mutation.fields).toContain('private_car_plate');
    expect(edit.mutation.fields).toContain('private_car_plate');
    expect(create.permission).toBe('employees.write');
    expect(edit.permission).toBe('employees.write');
  });

  test('creates, lists, reads, and edits a private car plate durably', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_car_plate_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-CAR-001', name: 'Private Car Plate Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', private_car_plate: '51H-246.80',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Private Car Plate Test', private_car_plate: '51H-246.80', row_version: 1 });
    expect(await repository.query("SELECT private_car_plate FROM employees WHERE id = 'employee-emp-car-001'"))
      .toEqual([{ private_car_plate: '51H-246.80' }]);

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Private Car Plate Test', private_car_plate: '59A-135.79' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, private_car_plate: '59A-135.79', row_version: 2 });
    await database.close();
  });

  test('rejects stale and cross-company private car plate mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_car_plate_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', private_car_plate: '43B-678.90' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT private_car_plate, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ private_car_plate: '43B-678.90', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic private car plate fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-private-car-plate-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_private_car_plate_restart');
    expect(await firstRepository.query("SELECT private_car_plate FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_car_plate: '51A-123.45' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_private_car_plate_restart');
    expect(await secondRepository.query("SELECT private_car_plate FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_car_plate: '51A-123.45' }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
