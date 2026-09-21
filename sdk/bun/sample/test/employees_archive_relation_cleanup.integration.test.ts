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

describe('Employees archive relation cleanup parity', () => {
  test('maps Odoo action_archive cleanup to separate page/API contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employees.yaml');
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const archive = action(listApi, 'archive_employee');
    const archiveDetail = action(detailApi, 'archive_employee_detail');

    expect(model).toContain('def _get_employee_m2o_to_empty_on_archived_employees(self):');
    expect(model).toContain("return ['parent_id', 'coach_id']");
    expect(model).toContain('def action_archive(self):');
    expect(view).toContain('string="Archived"');
    expect(page.page.id).toBe('employees');
    expect(listApi.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe('employee-detail');
    expect(archive.permission).toBe('employees.write');
    expect(archiveDetail.permission).toBe('employees.write');
    expect(archive.mutation.concurrency).toEqual({ required: true });
    expect(archive.mutation.fields).toEqual(['active']);
    expect(archive.mutation.defaults).toEqual({ active: false });
    expect(archive.mutation.before_steps).toHaveLength(2);
    expect(archive.mutation.steps.map((step: any) => step.query)).toEqual(expect.arrayContaining([
      expect.stringContaining('employee_archive_cleanup_events'),
      expect.stringContaining('manager_id = NULL'),
    ]));
    expect(archiveDetail.mutation.steps).toEqual(archive.mutation.steps);
    expect(readFileSync(join(employeesRoot, 'pages/employees.yaml'), 'utf8')).not.toMatch(/\bSELECT\b|\bUPDATE\b|\bINSERT\b/i);
  });

  test('archives an employee and clears same-company manager and coach links atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_archive_cleanup_crud');
    const detailApi = yaml('api/employee-detail.yaml');
    const manager = action(detailApi, 'edit_employee_manager');
    const coach = action(detailApi, 'edit_employee_coach');
    const archive = action(detailApi, 'archive_employee_detail');

    await repository.executeMutation(manager.mutation, {
      id: 'employee-demo-001', manager_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await repository.executeMutation(coach.mutation, {
      id: 'employee-demo-001', coach_name: 'Nguyen Minh Anh', expected_row_version: 2,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    const archived = await repository.executeMutation(archive.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, values: { active: false },
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;

    expect(archived).toMatchObject({ id: 'employee-demo-002', active: false, row_version: 2, archive_cleanup_count: 1 });
    expect(await repository.query("SELECT manager_id, manager_name, org_parent_name, coach_name, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ manager_id: null, manager_name: null, org_parent_name: null, coach_name: null, row_version: 4 }]);
    expect(await repository.query("SELECT employee_id, company_name, cleared_employee_count FROM employee_archive_cleanup_events WHERE employee_id = 'employee-demo-002'"))
      .toEqual([{ employee_id: 'employee-demo-002', company_name: 'Core3 Vietnam', cleared_employee_count: 1 }]);
    const activeVersions = await repository.query("SELECT manager_id, manager_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND active = true");
    expect(activeVersions).toHaveLength(2);
    expect(activeVersions).toEqual([{ manager_id: null, manager_name: null }, { manager_id: null, manager_name: null }]);
    await database.close();
  });

  test('enforces permission, company, missing, and stale archive boundaries without partial cleanup', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_archive_cleanup_guards');
    const archive = action(yaml('api/employee-detail.yaml'), 'archive_employee_detail');
    expect(archive.permission).toBe('employees.write');
    const base = { id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', values: { active: false } };

    await expect(repository.executeMutation(archive.mutation, { ...base, id: 'missing-employee' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    await expect(repository.executeMutation(archive.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    await expect(repository.executeMutation(archive.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.query("SELECT active, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ active: true, row_version: 1 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_archive_cleanup_events WHERE employee_id = 'employee-demo-002'"))
      .toEqual([{ count: 0 }]);
    await database.close();
  });

  test('preserves cleanup and replay-safe event state through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-archive-cleanup-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_archive_cleanup_restart');
    const detailApi = yaml('api/employee-detail.yaml');
    const manager = action(detailApi, 'edit_employee_manager');
    const archive = action(detailApi, 'archive_employee_detail');
    await firstRepository.executeMutation(manager.mutation, {
      id: 'employee-demo-001', manager_id: 'employee-demo-002', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await firstRepository.executeMutation(archive.mutation, {
      id: 'employee-demo-002', expected_row_version: 1, values: { active: false },
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_archive_cleanup_restart');
    expect(await secondRepository.query("SELECT active FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ active: false }]);
    expect(await secondRepository.query("SELECT manager_id, manager_name, org_parent_name FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ manager_id: null, manager_name: null, org_parent_name: null }]);
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_archive_cleanup_events WHERE employee_id = 'employee-demo-002'"))
      .toEqual([{ count: 1 }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
