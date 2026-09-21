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

describe('Employees Job Position assignment parity', () => {
  test('maps Odoo job_id to separate page/API relation contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const edit = action(api, 'edit_employee_job_position');

    expect(model).toContain("job_id = fields.Many2one('hr.job', check_company=True");
    expect(views).toContain('<field name="job_id" string="Job Position"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('job_id');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_job_position_options').query).toContain('j.company_name');
    expect(edit.permission).toBe('employees.write');
    expect(edit.mutation.fields).toEqual(['job_id']);
    expect(edit.mutation.guards.some((guard: any) => guard.code === 'EMPLOYEES_JOB_POSITION_INVALID')).toBe(true);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_job_position' }));
    expect(work.groups[0].fields).toContainEqual({ field: 'job_position_name', label: 'Job Position' });
  });

  test('assigns, clears, and reads a same-company Job Position across employee and active Payroll records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_job_position_crud');
    const api = yaml('api/employee-detail.yaml');
    const edit = action(api, 'edit_employee_job_position');
    const options = await repository.querySource(api.datasources.find((entry: any) => entry.id === 'employee_job_position_options'), { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50);
    expect(options.data).toContainEqual({ value: 'job-frontend-engineer-vietnam', label: 'Frontend Engineer' });
    expect(options.data.find((row: any) => row.value === 'job-interior-designer')).toBeUndefined();

    const updated = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', job_id: 'job-frontend-engineer-vietnam', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(updated).toMatchObject({ id: 'employee-demo-001', job_id: 'job-frontend-engineer-vietnam', job_position_name: 'Frontend Engineer', row_version: 2 });
    expect(await repository.query("SELECT job_id, job_name FROM employee_versions WHERE employee_id = 'employee-demo-001' AND date_version = DATE '2026-01-01'")).toEqual([
      { job_id: 'job-frontend-engineer-vietnam', job_name: 'Frontend Engineer' },
    ]);

    const cleared = await repository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', job_id: null, expected_row_version: 2,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    }) as any;
    expect(cleared).toMatchObject({ id: 'employee-demo-001', job_id: null, job_position_name: null, row_version: 3 });
    await database.close();
  });

  test('rejects actor, stale, cross-company, and invalid Job Position changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_job_position_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_job_position');
    const base = {
      id: 'employee-demo-001', job_id: 'job-frontend-engineer-vietnam', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_JOB_POSITION_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, job_id: 'job-interior-designer' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_JOB_POSITION_INVALID' });
    expect(await repository.query("SELECT job_id, job_position_name, row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([
      { job_id: 'job-operations-lead-vietnam', job_position_name: 'Operations Lead', row_version: 1 },
    ]);
    await database.close();
  });

  test('preserves the Job Position relation through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-job-position-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_job_position_restart');
    expect(await firstRepository.query("SELECT job_id, job_position_name FROM employees WHERE id = 'employee-demo-002'")).toEqual([
      { job_id: 'job-frontend-engineer-vietnam', job_position_name: 'Frontend Engineer' },
    ]);
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_job_position');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-002', job_id: 'job-qa-specialist-vietnam', expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_job_position_restart');
    expect(await secondRepository.query("SELECT job_id, job_position_name FROM employees WHERE id = 'employee-demo-002'")).toEqual([
      { job_id: 'job-qa-specialist-vietnam', job_position_name: 'QA Specialist' },
    ]);
    expect(await secondRepository.query("SELECT job_id, job_name FROM employee_versions WHERE employee_id = 'employee-demo-002' AND date_version = DATE '2025-01-01'")).toEqual([
      { job_id: 'job-qa-specialist-vietnam', job_name: 'QA Specialist' },
    ]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
