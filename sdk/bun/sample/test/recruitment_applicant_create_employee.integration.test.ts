import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const createEmployee = () => yaml('api/applicant-detail.yaml').actions.find((entry: any) => entry.id === 'create_employee_from_recruitment_applicant');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, employeesRoot + '/migrations', undefined, `${name}_employees`, ['schema', 'data']);
  await migrateDatabase(repo, root + '/migrations', undefined, `${name}_recruitment`, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment Create Employee applicant action', () => {
  test('traces Odoo create_employee_from_applicant and keeps the page/API contract joined', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const page = yaml('pages/applicant-detail.yaml');
    const api = yaml('api/applicant-detail.yaml');

    expect(source).toMatch(/string="Create Employee" name="create_employee_from_applicant" type="object"/);
    expect(page.page).toMatchObject({ id: 'applicant-detail', route: '/applicants/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'create_employee_from_recruitment_applicant', label: 'Create Employee', permission: 'employees.write' }));
    expect(api.actions.find((entry: any) => entry.id === 'view_recruitment_applicant_employee')).toMatchObject({ permission: 'employees.read', navigate_to: '/employees/detail' });
    expect(createEmployee()).toMatchObject({ action: 'recruitment.applicants.create_employee', permission: 'employees.write', operation: 'create' });
    expect(createEmployee().mutation.steps).toHaveLength(2);
  });

  test('creates one durable employee from a current hired applicant and links it after reload', async () => {
    const { database, repo } = await repository('recruitment_applicant_create_employee');
    await repo.query("UPDATE recruitment_applicants SET stage = 'Hired', hired_date = DATE '2026-01-15', row_version = row_version + 1 WHERE id = 'applicant-demo-003'");
    const result = await repo.executeMutation(createEmployee().mutation, {
      id: 'applicant-demo-003', expected_row_version: 2, current_user_id: 'user-admin', current_company_name: 'Core3 Demo Company',
    });

    expect(result).toMatchObject({ id: 'applicant-demo-003', employee_id: 'employee-recruitment-applicant-demo-003', employee_name: 'Emily Brooks', stage: 'Hired', row_version: 3 });
    expect(await repo.query("SELECT id, employee_number, name, job_title, state, active, company_name FROM employees WHERE id = 'employee-recruitment-applicant-demo-003'"))
      .toEqual([{ id: 'employee-recruitment-applicant-demo-003', employee_number: 'RECRUIT-APPLICANT-DEMO-003', name: 'Emily Brooks', job_title: 'People Partner', state: 'Active', active: true, company_name: 'Core3 Demo Company' }]);
    const detail = yaml('api/applicant-detail.yaml').datasources.find((entry: any) => entry.id === 'recruitment_applicant_detail');
    expect((await repo.querySource(detail, { id: 'applicant-demo-003', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ employee_id: 'employee-recruitment-applicant-demo-003', employee_name: 'Emily Brooks' });
    await database.close();
  });

  test('rejects anonymous, wrong-company, not-ready, duplicate, and stale conversion without partial writes', async () => {
    const { database, repo } = await repository('recruitment_applicant_create_employee_guards');
    const action = createEmployee().mutation;
    await repo.query("UPDATE recruitment_applicants SET stage = 'Hired', hired_date = DATE '2026-01-15', row_version = row_version + 1 WHERE id = 'applicant-demo-003'");
    const base = { id: 'applicant-demo-003', expected_row_version: 2, current_user_id: 'user-admin', current_company_name: 'Core3 Demo Company' };
    await expect(repo.executeMutation(action, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_CREATE_EMPLOYEE_ACTOR_REQUIRED' });
    await expect(repo.executeMutation(action, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_CREATE_EMPLOYEE_COMPANY_FORBIDDEN' });
    await expect(repo.executeMutation(action, { ...base, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_CREATE_EMPLOYEE_NOT_READY' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM employees WHERE id = 'employee-recruitment-applicant-demo-003'"))
      .toEqual([{ count: 0 }]);

    await repo.executeMutation(action, base);
    await expect(repo.executeMutation(action, { ...base, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_CREATE_EMPLOYEE_NOT_READY' });
    await expect(repo.executeMutation(action, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_CREATE_EMPLOYEE_NOT_READY' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM employees WHERE id = 'employee-recruitment-applicant-demo-003'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('requires a hired, named, active applicant and preserves conversion across a file restart', async () => {
    const dbPath = join('/tmp', `core3-recruitment-applicant-employee-${Date.now()}.duckdb`);
    const firstDatabase = await DuckDbDatabase.open(dbPath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, employeesRoot + '/migrations', undefined, 'recruitment_applicant_employee_restart_employees', ['schema', 'data']);
    await migrateDatabase(first, root + '/migrations', undefined, 'recruitment_applicant_employee_restart_recruitment', ['schema', 'data']);
    await first.query("UPDATE recruitment_applicants SET stage = 'Hired', hired_date = DATE '2026-01-15', row_version = row_version + 1 WHERE id = 'applicant-demo-003'");
    await first.executeMutation(createEmployee().mutation, { id: 'applicant-demo-003', expected_row_version: 2, current_user_id: 'user-admin', current_company_name: 'Core3 Demo Company' });
    await firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(dbPath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, employeesRoot + '/migrations', undefined, 'recruitment_applicant_employee_restart_employees', ['schema', 'data']);
    await migrateDatabase(second, root + '/migrations', undefined, 'recruitment_applicant_employee_restart_recruitment', ['schema', 'data']);
    expect(await second.query("SELECT a.employee_id, a.employee_name, e.name, e.state FROM recruitment_applicants a JOIN employees e ON e.id = a.employee_id WHERE a.id = 'applicant-demo-003'"))
      .toEqual([{ employee_id: 'employee-recruitment-applicant-demo-003', employee_name: 'Emily Brooks', name: 'Emily Brooks', state: 'Active' }]);
    await secondDatabase.close();
  });
});
