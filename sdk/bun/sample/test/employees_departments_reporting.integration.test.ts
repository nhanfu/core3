import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Employees Departments reporting parity', () => {
  test('joins layout and API by page id and declares Odoo view states', () => {
    const page = yaml('pages/departments.yaml');
    const api = yaml('api/departments.yaml');
    const detailPage = yaml('pages/department-detail.yaml');
    const detailApi = yaml('api/department-detail.yaml');

    expect(page.page.id).toBe('employee-departments');
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ source: 'employee_departments_report', variant: 'odoo', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Department Name', 'Company', 'Manager', 'Employees', 'Parent Department', 'Color']);
    expect(detailPage.page.id).toBe('employee-department-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.components[0]).toMatchObject({ source: 'employee_department_detail', status_field: 'state' });
    expect(detailPage.components[0].stat_buttons.map((button: any) => button.label)).toEqual(['Employees', 'Plans']);
  });

  test('seeds the seven installed Odoo departments and deterministic report states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departments_reporting_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departments_reporting_schema_migrations', ['schema', 'data']);

    const source = yaml('api/departments.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.name)).toEqual([
      'Administration', 'Long Term Projects', 'Management', 'Professional Services', 'R&D USA', 'Research & Development', 'Sales',
    ]);
    expect(all.data.find((row: any) => row.name === 'Administration')).toMatchObject({ manager_name: 'Mitchell Admin', employee_count: 2, applicant_count: 1, parent_name: 'Management', color: 2 });
    expect(all.data.find((row: any) => row.name === 'Management')).toMatchObject({ expense_count: 4, time_off_count: 1, plan_count: 2 });

    expect((await repository.querySource(source, { q: 'Mitchell', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Administration', 'Management']);
    expect((await repository.querySource(source, { q: 'does-not-exist', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DEPARTMENTS_UNAVAILABLE' });

    const detail = yaml('api/department-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'department-administration', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Administration', employee_count: 2, plan_count: 2 }) });
    expect((await repository.querySource(detail, { id: 'missing-department', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'department-administration', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DEPARTMENT_DETAIL_UNAVAILABLE' });
  });

  test('executes create, update, archive and restore with validation, duplicate, stale and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departments_reporting_mutation_migrations', ['schema', 'data']);
    const listApi = yaml('api/departments.yaml');
    const detailApi = yaml('api/department-detail.yaml');
    const create = action(listApi, 'create_department');
    const edit = action(detailApi, 'edit_department');
    const archive = action(detailApi, 'archive_department');
    const restore = action(detailApi, 'restore_department');

    expect(create.permission).toBe('employees.manage');
    expect(create.mutation.required).toEqual(['name']);
    expect(create.mutation.guards[0]).toMatchObject({ status: 409, code: 'EMPLOYEE_DEPARTMENT_NAME_EXISTS' });
    expect(edit.mutation.concurrency.required).toBe(true);
    expect(edit.mutation.guards.map((guard: any) => guard.status)).toEqual([404, 409]);
    expect(archive.mutation.concurrency.required).toBe(true);
    expect(restore.mutation.concurrency.required).toBe(true);
    const remove = action(detailApi, 'delete_department');
    expect([create, edit, archive, restore, remove].every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect(remove.mutation.concurrency.required).toBe(true);

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Customer Success', manager_name: 'Tina Williamson', parent_name: 'Management', color: 7 } });
    expect(created).toMatchObject({ name: 'Customer Success', active: true, report_visible: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'customer success' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_DEPARTMENT_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 400 });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Customer Experience', manager_name: 'Tina Williamson', parent_name: 'Management', color: 8 } });
    expect(edited).toMatchObject({ name: 'Customer Experience', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Department' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-department', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEE_DEPARTMENT_NOT_FOUND' });

    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false, state: 'Archived' } });
    const archived = await repository.querySource(listApi.datasources[0], { q: 'Customer Experience', active: 'false', fixture_state: null }, 0, 50);
    expect(archived.data).toMatchObject([{ name: 'Customer Experience', active: false, state: 'Archived' }]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true, state: 'Active' } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Customer Experience', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ active: true, state: 'Active' }]);
    await expect(repository.executeMutation(archive.mutation, { id: 'missing-department', expected_row_version: 1, values: { active: false, state: 'Archived' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEE_DEPARTMENT_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Customer Experience', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });
});
