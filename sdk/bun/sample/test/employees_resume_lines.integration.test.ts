import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);
const base = { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin', current_user_name: 'Admin User' };

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, root + '/migrations', undefined, name, ['schema', 'data']);
}

describe('Employees resume lines parity', () => {
  test('maps Odoo resume_line_ids and keeps the employee page/API contracts separate', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/models/hr_resume_line.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const resume = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'resume');
    const grid = resume.component;
    expect(model).toContain("_name = 'hr.resume.line'");
    expect(model).toContain('employee_id = fields.Many2one');
    expect(model).toContain("_date_check = models.Constraint");
    expect(views).toContain('name="resume_line_ids" widget="resume_one2many"');
    expect(views).toContain('id="hr_resume_line_list_view"');
    expect(access).toContain('access_hr_resume_line_employee,hr.resume.line.employee,model_hr_resume_line,base.group_user,1,1,1,1');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(grid).toMatchObject({ type: 'LineItemGrid', source: 'employee_resume_lines', parent_source: 'employee_detail', variant: 'odoo_x2many' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['employee_resume_lines', 'employee_resume_line_types_for_employee']));
    expect(action(api, 'add_employee_resume_line')).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'employees.write', domain: 'employee_resume_line' });
    expect(action(api, 'edit_employee_resume_line')).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'employees.write', domain: 'employee_resume_line' });
    expect(action(api, 'delete_employee_resume_line')).toMatchObject({ type: 'server', handler: 'line_item', permission: 'employees.write', domain: 'employee_resume_line' });
  });

  test('seeds employee resume lines and supports durable create, edit, and delete', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_resume_lines_crud');
    const api = yaml('api/employee-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'employee_resume_lines');
    const add = action(api, 'add_employee_resume_line');
    const edit = action(api, 'edit_employee_resume_line');
    const remove = action(api, 'delete_employee_resume_line');
    expect((await repository.querySource(source, { employee_id: base.id, current_company_name: base.current_company_name }, 0, 20)).data)
      .toMatchObject([{ line_type_name: 'Education', name: 'Computer Science' }, { line_type_name: 'Training', name: 'Odoo HR onboarding' }]);
    const values = { line_type_id: 'resume-type-training', name: 'Leadership course', date_start: '2026-02-01', date_end: null, duration: 4, course_type: 'external', description: 'People leadership', external_url: 'https://example.test/course' };
    const created = await repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values }) as any;
    expect(created).toMatchObject({ id: 'employee-resume-employee-demo-001-leadership-course-2026-02-01', employee_id: base.id, name: 'Leadership course', row_version: 1 });
    const edited = await repository.executeMutation(edit.mutation, { ...base, line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1, values: { ...values, name: 'Leadership course advanced', duration: 6 } }) as any;
    expect(edited).toMatchObject({ id: created.id, name: 'Leadership course advanced', duration: 6, row_version: 2 });
    await repository.executeMutation(remove.mutation, { ...base, line_id: created.id, parent_expected_row_version: 3, expected_row_version: 2 });
    expect(await repository.query(`SELECT id FROM employee_resume_lines WHERE id = '${created.id}'`)).toEqual([]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 4 }]);
    await database.close();
  });

  test('enforces actor, company, type, date, duplicate, and concurrency guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_resume_lines_guards');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_resume_line');
    const edit = action(api, 'edit_employee_resume_line');
    const remove = action(api, 'delete_employee_resume_line');
    const values = { line_type_id: 'resume-type-training', name: 'Leadership course', date_start: '2026-02-01', date_end: null, duration: 4, course_type: 'external', description: 'People leadership', external_url: null };
    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '', parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Other Company', parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RESUME_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, line_type_id: 'missing-type' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_RESUME_TYPE_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, date_start: '2026-03-01', date_end: '2026-02-01' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_RESUME_VALUES_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, name: 'Computer Science', date_start: '2018-09-01' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_RESUME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { ...base, line_id: 'employee-resume-demo-001-education', parent_expected_row_version: 1, expected_row_version: 99, values: { ...values, name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_RESUME_STALE' });
    await expect(repository.executeMutation(remove.mutation, { ...base, line_id: 'missing-resume', parent_expected_row_version: 1, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_RESUME_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_resume_lines WHERE employee_id = 'employee-demo-001'")).toEqual([{ count: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves resume lines through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-resume-lines-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_resume_lines_restart');
    expect(await firstRepository.query("SELECT line_type_id, name FROM employee_resume_lines WHERE id = 'employee-resume-demo-001-education'")).toEqual([{ line_type_id: 'resume-type-education', name: 'Computer Science' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_resume_lines_restart');
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_resume_lines WHERE employee_id = 'employee-demo-001'")).toEqual([{ count: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
