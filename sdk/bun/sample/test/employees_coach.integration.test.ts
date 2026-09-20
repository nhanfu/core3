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

describe('Employees coach parity', () => {
  test('maps Odoo coach search/list projection to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const detailPage = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const list = page.components[0];
    const work = detailPage.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const edit = action(detailApi, 'edit_employee_coach');

    expect(model).toContain('coach_id = fields.Many2one(');
    expect(views).toContain('<field name="coach_id" domain="[(\'company_id\', \'in\', allowed_company_ids)]"/>');
    expect(views).toContain('<field name="coach_id" widget="many2one_avatar_employee" optional="hide"/>');
    expect(page.page.id).toBe('employees');
    expect(api.page.id).toBe(page.page.id);
    expect(list.filters).toContainEqual({ field: 'coach_name', label: 'Coach', options_source: 'employee_coaches' });
    expect(list.columns).toContainEqual({ field: 'coach_name', label: 'Coach' });
    expect(api.datasources.find((entry: any) => entry.id === 'employees').query).toContain('e.coach_name');
    expect(work.groups[0].fields).toContainEqual({ field: 'coach_name', label: 'Coach' });
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['coach_name']);
    expect(edit.fields[0]).toMatchObject({ field: 'coach_name', label: 'Coach', type: 'select' });
  });

  test('creates and edits a coach with current-company durable persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_coach_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_coach');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-COACH-001', name: 'Coach Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', coach_name: 'Admin User',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Coach Test', coach_name: 'Admin User', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { coach_name: 'Admin User' },
    }) as any;
    expect(edited).toMatchObject({ id: 'employee-demo-001', coach_name: 'Admin User', row_version: 2 });
    expect(await repository.query("SELECT coach_name, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ coach_name: 'Admin User', row_version: 2 }]);
    await database.close();
  });

  test('rejects actor, stale, invalid, and cross-company coach changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_coach_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_coach');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { coach_name: 'Admin User' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_COACH_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { coach_name: 'Unknown Coach' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_COACH_INVALID' });
    expect(await repository.query("SELECT coach_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ coach_name: 'Admin User', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic coach fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-coach-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_coach_restart');
    const expected = [
      { id: 'employee-demo-001', coach_name: 'Nguyen Minh Anh' },
      { id: 'employee-demo-002', coach_name: 'Admin User' },
    ];
    expect(await firstRepository.query("SELECT id, coach_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_coach_restart');
    expect(await secondRepository.query("SELECT id, coach_name FROM employees WHERE id IN ('employee-demo-001', 'employee-demo-002') ORDER BY id"))
      .toEqual(expected);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
