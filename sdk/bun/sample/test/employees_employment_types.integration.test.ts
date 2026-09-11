import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Employees Employment Types parity', () => {
  test('maps the installed HR-user action and keeps page/API ownership explicit', () => {
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_views.xml', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_contract_type_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr/security/ir.model.access.csv', 'utf8');
    expect(menu).toContain('id="menu_view_hr_contract_type"');
    expect(menu).toContain('action="hr_contract_type_action"');
    expect(menu).toContain('groups="group_hr_user"');
    expect(views).toContain('<field name="model">hr.contract.type</field>');
    expect(views).toContain('<list string="Contract Types" editable="bottom">');
    expect(views).toContain('<field name="sequence" widget="handle"/>');
    expect(views).toContain('<field name="country_id" optional="hide"/>');
    expect(access).toContain('access_hr_contract_type_manager,hr.contract.type.manager,model_hr_contract_type,group_hr_user,1,1,1,1');

    const page = yaml('pages/employment-types.yaml');
    const api = yaml('api/employment-types.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'employee-employment-types', route: '/employees/employment-types', auth: { require: ['employees.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_employment_types' });
    expect(page.components[0].inline_edit).toMatchObject({ create_action: 'create_employee_employment_type_inline', update_action: 'update_employee_employment_type_inline' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Country', '']);
    expect([action(api, 'create_employee_employment_type_inline'), action(api, 'update_employee_employment_type_inline'), action(api, 'delete_employee_employment_type')].every((entry: any) => entry.permission === 'employees.write')).toBe(true);
    expect(action(api, 'update_employee_employment_type_inline').mutation.concurrency).toMatchObject({ required: true });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual({ path: '/employees/employment-types', label: 'Employment Types', icon: 'list', permission: 'employees.read' });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('employee-employment-types')).toBeTruthy();
    expect(discovered.pageDatasources.get('employee-employment-types')).toContain('employee_employment_types');
  });

  test('seeds all twelve live Odoo types and supports search, empty, and transport states idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_employment_types_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_employment_types_acceptance', ['schema', 'data']);
    const source = yaml('api/employment-types.yaml').datasources[0];
    const populated = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual(['Permanent', 'Temporary', 'Interim', 'Seasonal', 'Full-Time', 'Part-Time', 'Intern', 'Student', 'Apprenticeship', 'Thesis', 'Statutory', 'Employee']);
    expect(populated.data[0]).toMatchObject({ id: 'employment-type-permanent', sequence: 1001, name: 'Permanent' });
    expect((await repository.querySource(source, { q: 'part', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Part-Time']);
    expect((await repository.querySource(source, { q: 'not-present', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_EMPLOYMENT_TYPES_UNAVAILABLE' });
    await database.close();
  });

  test('enforces HR-user CRUD, validation, duplicate, stale, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_employment_types_mutation', ['schema', 'data']);
    const api = yaml('api/employment-types.yaml');
    const create = action(api, 'create_employee_employment_type_inline');
    const update = action(api, 'update_employee_employment_type_inline');
    const remove = action(api, 'delete_employee_employment_type');
    expect([create, update, remove].every((entry: any) => entry.permission === 'employees.write')).toBe(true);
    expect([create, update, remove].every((entry: any) => entry.handler === 'yaml_mutation')).toBe(true);
    expect(update.mutation.concurrency).toMatchObject({ required: true });
    const created = await repository.executeMutation(create.mutation, { values: { sequence: 1013, name: 'Seasonal Contractor', country_name: 'United States' } });
    expect(created).toMatchObject({ id: 'employment-type-seasonal-contractor', name: 'Seasonal Contractor', sequence: 1013, row_version: 1, country_name: 'United States' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' seasonal contractor ' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_EMPLOYMENT_TYPE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_EMPLOYMENT_TYPE_NAME_REQUIRED' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 1014, name: 'Seasonal Contractor Updated', country_name: 'Canada' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Seasonal Contractor Updated', sequence: 1014, row_version: 2, country_name: 'Canada' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Employment Type' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-employment-type', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_EMPLOYMENT_TYPE_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_EMPLOYMENT_TYPE_NOT_FOUND' });
    await database.close();
  });
});
