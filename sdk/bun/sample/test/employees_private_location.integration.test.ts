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

describe('Employees private location parity', () => {
  test('maps Odoo Personal Location fields to separate page/API contracts', () => {
    const versionSource = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Location');
    const datasource = api.datasources.find((candidate: any) => candidate.id === 'employee_detail');

    expect(versionSource).toContain('private_street = fields.Char');
    expect(versionSource).toContain('distance_home_work = fields.Integer');
    expect(versionSource).toContain('distance_home_work_unit = fields.Selection');
    expect(views).toContain('<group string="Location" name="hr_location_group">');
    expect(views).toContain('<field name="private_street2"');
    expect(views).toContain('<field name="distance_home_work"');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Location', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toEqual([
      'private_street', 'private_street2', 'private_city', 'private_state_id', 'private_zip', 'private_country_id', 'distance_home_work', 'distance_home_work_unit',
    ]);
    expect(datasource.query).toContain('private_street');
    expect(datasource.query).toContain('distance_home_work_unit');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining([
      'private_street', 'private_street2', 'private_city', 'private_state_id', 'private_zip', 'private_country_id', 'distance_home_work', 'distance_home_work_unit',
    ]));
    expect(edit.permission).toBe('employees.write');
  });

  test('creates and edits private location through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_location_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-LOC-001', name: 'Private Location Test', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
        private_street: '1 Test Street', private_street2: 'Suite 2', private_city: 'Hue', private_state_id: 'Thua Thien Hue',
        private_zip: '530000', private_country_id: 'Vietnam', distance_home_work: 6, distance_home_work_unit: 'kilometers',
      },
    }) as any;
    expect(created).toMatchObject({
      name: 'Private Location Test', private_street: '1 Test Street', private_street2: 'Suite 2', private_city: 'Hue',
      private_state_id: 'Thua Thien Hue', private_zip: '530000', private_country_id: 'Vietnam', distance_home_work: 6, distance_home_work_unit: 'kilometers', row_version: 1,
    });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: {
        name: 'Private Location Test', private_street: '2 Updated Street', private_street2: '', private_city: 'Da Nang', private_state_id: 'Da Nang',
        private_zip: '550000', private_country_id: 'Vietnam', distance_home_work: 4, distance_home_work_unit: 'miles',
      },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, private_street: '2 Updated Street', private_city: 'Da Nang', distance_home_work: 4, distance_home_work_unit: 'miles', row_version: 2 });
    await database.close();
  });

  test('rejects invalid, stale, and cross-company private location mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_private_location_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', private_street: '88 Le Loi Street', private_city: 'Ho Chi Minh City', private_state_id: 'Ho Chi Minh', private_zip: '700000', private_country_id: 'Vietnam', distance_home_work: 12, distance_home_work_unit: 'kilometers' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, distance_home_work: -1 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PRIVATE_DISTANCE_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { ...base.values, distance_home_work_unit: 'yards' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_PRIVATE_DISTANCE_UNIT_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT private_street, private_city, distance_home_work, distance_home_work_unit, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ private_street: '88 Le Loi Street', private_city: 'Ho Chi Minh City', distance_home_work: 12, distance_home_work_unit: 'kilometers', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic private location fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-private-location-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_private_location_restart');
    expect(await firstRepository.query("SELECT private_street, private_street2, private_city, private_state_id, private_zip, private_country_id, distance_home_work, distance_home_work_unit FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_street: '12 Nguyen Hue Boulevard', private_street2: 'Apartment 8A', private_city: 'Ho Chi Minh City', private_state_id: 'Ho Chi Minh', private_zip: '700000', private_country_id: 'Vietnam', distance_home_work: 8, distance_home_work_unit: 'kilometers' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_private_location_restart');
    expect(await secondRepository.query("SELECT private_street, private_street2, private_city, private_state_id, private_zip, private_country_id, distance_home_work, distance_home_work_unit FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ private_street: '12 Nguyen Hue Boulevard', private_street2: 'Apartment 8A', private_city: 'Ho Chi Minh City', private_state_id: 'Ho Chi Minh', private_zip: '700000', private_country_id: 'Vietnam', distance_home_work: 8, distance_home_work_unit: 'kilometers' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
