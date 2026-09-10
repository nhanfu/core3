import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const odooRoot = '/home/nhanjs/projects/odoo/addons/hr';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Employees Departure Reasons bounded parity', () => {
  test('maps the installed Odoo menu/action and keeps page/API ownership explicit', () => {
    const odooMenu = readFileSync(join(odooRoot, 'views/hr_views.xml'), 'utf8');
    const odooViews = readFileSync(join(odooRoot, 'views/hr_departure_reason_views.xml'), 'utf8');
    const odooData = readFileSync(join(odooRoot, 'data/hr_data.xml'), 'utf8');
    const odooAccess = readFileSync(join(odooRoot, 'security/ir.model.access.csv'), 'utf8');
    expect(odooMenu).toContain('id="menu_hr_departure_reason_tree"');
    expect(odooMenu).toContain('action="hr_departure_reason_action"');
    expect(odooViews).toContain('<field name="res_model">hr.departure.reason</field>');
    expect(odooViews).toContain('<field name="view_mode">list</field>');
    expect(odooViews).toContain('<list editable="bottom">');
    expect(odooViews).toContain('<field name="sequence" widget="handle" />');
    expect(odooViews).toContain('<field name="name" />');
    expect(odooViews).toContain('<field name="country_code" optional="hide"/>');
    expect(odooData).toMatch(/id="departure_(fired|resigned|retired)"/);
    expect(odooAccess).toContain('access_hr_departure_reason,access_hr_departure_reason_user,model_hr_departure_reason,group_hr_user,1,1,1,1');

    const listPage = yaml('pages/departure-reasons.yaml');
    const detailPage = yaml('pages/departure-reason-detail.yaml');
    const listApi = yaml('api/departure-reasons.yaml');
    const detailApi = yaml('api/departure-reason-detail.yaml');
    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'employee-departure-reasons', route: '/employees/departure-reasons', auth: { require: ['employees.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'employee-departure-reason-detail', route: '/employees/departure-reasons/detail', auth: { require: ['employees.manage'] } });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_departure_reasons' });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Departure Reason', 'Country']);
    expect(listPage.components[0].columns.some((column: any) => column.actions)).toBe(false);
    expect(listApi.datasources[0].permission).toBe('employees.manage');
    expect(detailApi.datasources[0].permission).toBe('employees.manage');
    expect(listApi.actions.every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect(detailApi.actions.every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['employees.read', 'employees.manage']));
    const menu = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items;
    expect(menu).toContainEqual({ path: '/employees/departure-reasons', label: 'Departure Reasons', icon: 'list', permission: 'employees.manage' });
  });

  test('seeds exactly the Odoo defaults and supports search, empty, detail, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_departure_reasons_acceptance_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_departure_reasons_acceptance_migrations', ['schema', 'data']);

    const listSource = yaml('api/departure-reasons.yaml').datasources[0];
    const populated = await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.id)).toEqual([
      'departure-reason-fired', 'departure-reason-resigned', 'departure-reason-retired',
    ]);
    expect(populated.data.map((row: any) => ({ sequence: row.sequence, name: row.name, country_code: row.country_code, row_version: row.row_version }))).toEqual([
      { sequence: 0, name: 'Fired', country_code: null, row_version: 1 },
      { sequence: 1, name: 'Resigned', country_code: null, row_version: 1 },
      { sequence: 2, name: 'Retired', country_code: null, row_version: 1 },
    ]);
    expect(await repository.query("SELECT created_at, updated_at FROM employee_departure_reasons WHERE id = 'departure-reason-fired'")).toEqual([
      { created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z' },
    ]);
    expect((await repository.querySource(listSource, { q: 'resign', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Resigned']);
    expect((await repository.querySource(listSource, { q: 'not-present', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(listSource, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DATA_UNAVAILABLE' });

    const detailSource = yaml('api/departure-reason-detail.yaml').datasources[0];
    expect(await repository.querySource(detailSource, { id: 'departure-reason-resigned', fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'departure-reason-resigned', name: 'Resigned', sequence: 1 } });
    expect((await repository.querySource(detailSource, { id: 'missing-departure-reason', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detailSource, { id: 'departure-reason-fired', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DATA_UNAVAILABLE' });
    await database.close();
  });

  test('enforces manager-only CRUD, validation, stale, missing, and default-delete boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_departure_reasons_mutation_migrations', ['schema', 'data']);
    const listApi = yaml('api/departure-reasons.yaml');
    const detailApi = yaml('api/departure-reason-detail.yaml');
    const create = action(listApi, 'create_employee_departure_reason_inline');
    const update = action(listApi, 'update_employee_departure_reason_inline');
    const edit = action(detailApi, 'edit_employee_departure_reason');
    const remove = action(listApi, 'delete_employee_departure_reason');

    expect([create, update, edit, remove].every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect([create, update, edit, remove].every((entry: any) => entry.handler === 'yaml_mutation')).toBe(true);
    expect(create.mutation.generated).toEqual(['id']);
    expect(create.mutation.guards.map((guard: any) => guard.status)).toEqual([422, 409]);
    expect(update.mutation.concurrency).toMatchObject({ required: true });
    expect(update.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 422, 409]);
    expect(edit.mutation.concurrency).toMatchObject({ required: true });
    expect(remove.mutation.concurrency).toMatchObject({ required: true });

    const created = await repository.executeMutation(create.mutation, { values: { sequence: 10, name: 'Career Break', country_code: null } });
    expect(created).toMatchObject({ id: 'departure-reason-career-break', name: 'Career Break', sequence: 10, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' career break ' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_DEPARTURE_REASON_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_DEPARTURE_REASON_NAME_REQUIRED' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 11, name: 'Career Break Updated', country_code: 'VN' } });
    expect(edited).toMatchObject({ id: created.id, name: 'Career Break Updated', sequence: 11, country_code: 'VN', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Career Break' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, values: { name: 'Missing Version' } })).rejects.toMatchObject({ status: 400 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-departure-reason', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'Fired' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_DEPARTURE_REASON_EXISTS' });

    await expect(repository.executeMutation(remove.mutation, { id: 'departure-reason-fired', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_DEPARTURE_REASON_DEFAULT' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Career Break', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    await database.close();
  });
});
