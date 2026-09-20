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

describe('Employees legal name parity', () => {
  test('maps Odoo Personal Information legal name to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const listApi = yaml('api/employees.yaml');
    const edit = action(api, 'edit_employee');
    const personal = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'personal');
    const group = personal.groups.find((candidate: any) => candidate.title === 'Personal Information');

    expect(sourceModel).toContain("legal_name = fields.Char(compute='_compute_legal_name', store=True, readonly=False");
    expect(sourceViews).toContain('<field name="legal_name"/>');
    expect(sourceViews).toContain('<group string="Personal Information" name="hr_birth_group">');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(group).toMatchObject({ title: 'Personal Information', permission: 'employees.read' });
    expect(group.fields.map((field: any) => field.field)).toContain('legal_name');
    expect(api.datasources.find((source: any) => source.id === 'employee_detail').query).toContain('legal_name');
    expect(edit.mutation.fields).toContain('legal_name');
    expect(edit.permission).toBe('employees.write');
    expect(listApi.actions.find((entry: any) => entry.id === 'create_employee').mutation.fields).toContain('legal_name');
  });

  test('creates and edits legal name through durable guarded employee CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_legal_name_crud');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = action(listApi, 'create_employee');
    const edit = action(detailApi, 'edit_employee');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-LEGAL-001', name: 'Legal Name Test', legal_name: 'Nguyen Thi Legal', hire_date: '2026-01-15', company_name: 'Core3 Vietnam',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Legal Name Test', legal_name: 'Nguyen Thi Legal', row_version: 1 });
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Legal Name Test', legal_name: 'Nguyen Thi Updated' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, legal_name: 'Nguyen Thi Updated', row_version: 2 });
    await database.close();
  });

  test('rejects stale and cross-company legal-name changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_legal_name_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam',
      values: { name: 'Nguyen Minh Anh', legal_name: 'Nguyen Minh Anh Updated' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    expect(await repository.query("SELECT legal_name, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ legal_name: 'Nguyen Minh Anh', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic legal names through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-legal-name-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_legal_name_restart');
    expect(await firstRepository.query("SELECT legal_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ legal_name: 'Nguyen Van Admin' }]);
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_legal_name_restart');
    expect(await secondRepository.query("SELECT legal_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ legal_name: 'Nguyen Van Admin' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
