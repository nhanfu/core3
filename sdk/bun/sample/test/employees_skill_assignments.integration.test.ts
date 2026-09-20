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

describe('Employees employee skill assignments parity', () => {
  test('maps Odoo employee skills action and keeps page/API ownership separate', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/models/hr_employee_skill.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const work = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'work');
    const grid = work.component;
    expect(model).toContain("_name = 'hr.employee.skill'");
    expect(model).toContain('def open_hr_employee_skill_modal');
    expect(views).toContain('name="current_employee_skill_ids" widget="skills_one2many"');
    expect(views).toContain('name="open_hr_employee_skill_modal"');
    expect(access).toContain('access_hr_employee_skill_employee,hr.employee.skill,model_hr_employee_skill,base.group_user,1,1,1,1');
    expect(page.page.id).toBe(api.page.id);
    expect(page.datasources).toBeUndefined();
    expect(grid).toMatchObject({ type: 'LineItemGrid', source: 'employee_skill_assignments', parent_source: 'employee_detail', variant: 'odoo_x2many' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['employee_skill_assignments', 'employee_skill_types_for_employee', 'employee_skills_for_type', 'employee_skill_levels_for_type']));
    expect(action(api, 'add_employee_skill')).toMatchObject({ type: 'server_form', handler: 'line_item', permission: 'employees.write', domain: 'employee_skill_assignment' });
    expect(action(api, 'archive_employee_skill')).toMatchObject({ type: 'server', handler: 'line_item', permission: 'employees.write', domain: 'employee_skill_assignment' });
  });

  test('seeds current skills and supports durable create/archive', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_skill_assignments_crud');
    const api = yaml('api/employee-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'employee_skill_assignments');
    const add = action(api, 'add_employee_skill');
    const archive = action(api, 'archive_employee_skill');
    expect((await repository.querySource(source, { employee_id: base.id, current_company_name: base.current_company_name }, 0, 20)).data)
      .toMatchObject([{ skill_type_name: 'Technical Skills', skill_name: 'Python', skill_level_name: 'Intermediate' }, { skill_type_name: 'Languages', skill_name: 'English', skill_level_name: 'C1' }]);
    const created = await repository.executeMutation(add.mutation, {
      ...base, parent_expected_row_version: 1,
      values: { skill_type_id: 'skill-type-technical', skill_id: 'skill-sql', skill_level_id: 'level-beginner', valid_from: '2026-02-01', valid_to: null },
    }) as any;
    expect(created).toMatchObject({ id: 'employee-skill-employee-demo-001-skill-sql', employee_id: base.id, skill_id: 'skill-sql', row_version: 1 });
    const archived = await repository.executeMutation(archive.mutation, { ...base, line_id: created.id, parent_expected_row_version: 2, expected_row_version: 1, values: { active: false } });
    expect(archived).toMatchObject({ line_id: created.id, active: false });
    expect(await repository.query(`SELECT active, row_version FROM employee_skill_assignments WHERE id = '${created.id}'`)).toEqual([{ active: false, row_version: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 3 }]);
    await database.close();
  });

  test('enforces actor, company, relation, duplicate, date, and concurrency guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_skill_assignments_guards');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_skill');
    const archive = action(api, 'archive_employee_skill');
    const values = { skill_type_id: 'skill-type-technical', skill_id: 'skill-sql', skill_level_id: 'level-beginner', valid_from: '2026-02-01', valid_to: null };
    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '', parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Other Company', parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_SKILL_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, skill_id: 'skill-python', skill_type_id: 'skill-type-soft' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_SKILL_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { ...values, valid_from: '2026-03-01', valid_to: '2026-02-01' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_SKILL_DATES_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 1, values: { skill_type_id: 'skill-type-technical', skill_id: 'skill-python', skill_level_id: 'level-intermediate', valid_from: '2026-02-01', valid_to: null } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_SKILL_EXISTS' });
    await expect(repository.executeMutation(archive.mutation, { ...base, line_id: 'employee-skill-demo-001-python', parent_expected_row_version: 1, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_SKILL_STALE' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM employee_skill_assignments WHERE employee_id = 'employee-demo-001' AND active = true")).toEqual([{ count: 2 }]);
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic skill assignments through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-skill-assignments-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_skill_assignments_restart');
    expect(await firstRepository.query("SELECT skill_id, skill_level_id FROM employee_skill_assignments WHERE id = 'employee-skill-demo-001-python'")).toEqual([{ skill_id: 'skill-python', skill_level_id: 'level-intermediate' }]);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_skill_assignments_restart');
    expect(await secondRepository.query("SELECT COUNT(*) AS count FROM employee_skill_assignments WHERE employee_id = 'employee-demo-001'")).toEqual([{ count: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});
