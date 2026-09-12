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

describe('Employees Training Attendances parity', () => {
  test('maps the hr_skills Learning action and keeps page/API ownership explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="hr_resume_lines_training_action"');
    expect(source).toContain('<field name="name">Training Attendances</field>');
    expect(source).toContain('<field name="res_model">hr.resume.line</field>');
    expect(source).toContain('<field name="view_mode">list,kanban,form,calendar</field>');
    expect(source).toContain("('line_type_id.is_course', '=', True)");
    expect(source).toContain('id="menu_learnings_training_attendances"');
    expect(source).toContain('parent="hr_skill_learning_menu"');
    expect(access).toContain('access_hr_resume_line,hr.resume.line,model_hr_resume_line,hr.group_hr_user,1,1,1,1');
    expect(access).toContain('access_hr_resume_line_employee,hr.resume.line.employee,model_hr_resume_line,base.group_user,1,1,1,1');

    const page = yaml('pages/training-attendances.yaml');
    const api = yaml('api/training-attendances.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'employee-training-attendances', route: '/employees/training-attendances', auth: { require: ['employees.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_training_attendances' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'calendar']);
    expect([action(api, 'create_employee_training_attendance'), action(api, 'update_employee_training_attendance'), action(api, 'delete_employee_training_attendance')].every((entry: any) => entry.permission === 'employees.write')).toBe(true);
    expect(action(api, 'update_employee_training_attendance').mutation.concurrency).toMatchObject({ required: true });
    expect(yaml('manifest.yaml').menu.groups).toContainEqual({ id: 'learning', label: 'Learning', items: [{ path: '/employees/training-attendances', label: 'Training Attendances', icon: 'education', permission: 'employees.read' }] });
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('employee-training-attendances')).toBeTruthy();
    expect(discovered.pageDatasources.get('employee-training-attendances')).toContain('employee_training_attendances');
  });

  test('seeds deterministic course-only rows and supports search, facets, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_training_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_training_acceptance', ['schema', 'data']);
    const source = yaml('api/training-attendances.yaml').datasources[0];
    const populated = await repository.querySource(source, { q: null, company_name: null, department_name: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual(['New Hire Orientation', 'Team Leadership', 'Secure Coding', 'Python Fundamentals']);
    expect((await repository.querySource(source, { q: 'python', company_name: null, department_name: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ employee_name: 'Ada Lovelace', line_type_name: 'Technical Skills' });
    expect((await repository.querySource(source, { q: null, company_name: null, department_name: 'Engineering', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { q: null, company_name: null, department_name: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, company_name: null, department_name: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_TRAINING_ATTENDANCES_UNAVAILABLE' });
    await database.close();
  });

  test('enforces HR-user CRUD, validation, stale, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_training_mutation', ['schema', 'data']);
    const api = yaml('api/training-attendances.yaml');
    const create = action(api, 'create_employee_training_attendance');
    const update = action(api, 'update_employee_training_attendance');
    const remove = action(api, 'delete_employee_training_attendance');
    expect([create, update, remove].every((entry: any) => entry.permission === 'employees.write')).toBe(true);
    const created = await repository.executeMutation(create.mutation, { values: { employee_name: 'Katherine Johnson', name: 'Data Safety', date_start: '2026-03-01', line_type_name: 'Technical Skills', duration: 2 } });
    expect(created).toMatchObject({ id: 'training-attendance-katherine-johnson-data-safety', employee_name: 'Katherine Johnson', name: 'Data Safety', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { employee_name: ' ', name: 'Missing employee', date_start: '2026-03-01', line_type_name: 'Technical Skills' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TRAINING_ATTENDANCE_VALUES_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { employee_name: 'Katherine Johnson', name: 'Data Safety Advanced', date_start: '2026-03-02', line_type_name: 'Technical Skills', duration: 3 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Data Safety Advanced', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { employee_name: 'Katherine Johnson', name: 'Stale', date_start: '2026-03-03', line_type_name: 'Technical Skills', duration: 1 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(remove.mutation, { id: 'missing-training', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TRAINING_ATTENDANCE_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await database.close();
  });
});
