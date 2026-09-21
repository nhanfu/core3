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

describe('Employees tags parity', () => {
  test('maps Odoo category_ids to separate page/API many-to-many contracts', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const tags = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'tags');
    const add = action(api, 'add_employee_tag');
    const remove = action(api, 'remove_employee_tag');

    expect(model).toContain("category_ids = fields.Many2many(");
    expect(model).toContain("string='Tags'");
    expect(views).toContain('<field name="category_ids" widget="many2many_tags"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail').query).toContain('employee_tag_ids');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_tag_assignments').query).toContain('FROM employee_tag_rel');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_tag_options').query).toContain('NOT EXISTS');
    expect(add).toMatchObject({ permission: 'employees.write', handler: 'line_item', operation: 'create' });
    expect(add.mutation.guards.some((guard: any) => guard.code === 'EMPLOYEES_TAGS_INVALID')).toBe(true);
    expect(remove).toMatchObject({ permission: 'employees.write', handler: 'line_item', operation: 'delete' });
    expect(tags.component).toMatchObject({ type: 'LineItemGrid', source: 'employee_tag_assignments' });
    expect(tags.component.actions).toContainEqual(expect.objectContaining({ id: 'add_employee_tag' }));
    expect(tags.component.children).toContainEqual(expect.objectContaining({ id: 'employee_tag_actions' }));
  });

  test('adds and removes employee tags durably with a deterministic read projection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_tags_crud');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_tag');
    const remove = action(api, 'remove_employee_tag');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const assignments = api.datasources.find((entry: any) => entry.id === 'employee_tag_assignments');
    const options = await repository.querySource(api.datasources.find((entry: any) => entry.id === 'employee_tag_options'), { id: 'employee-demo-001' }, 0, 50);
    expect(options.data).toContainEqual({ value: 'employee-tag-remote', label: 'Remote' });
    expect(options.data).not.toContainEqual({ value: 'employee-tag-engineering', label: 'Engineering' });
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { employee_tag_ids: ['employee-tag-engineering', 'employee-tag-vietnam'], employee_tags: 'Engineering, Vietnam', row_version: 1 } });
    expect((await repository.querySource(assignments, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data).toHaveLength(2);

    await repository.executeMutation(add.mutation, {
      id: 'employee-demo-001', tag_id: 'employee-tag-remote', parent_expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { employee_tag_ids: ['employee-tag-engineering', 'employee-tag-remote', 'employee-tag-vietnam'], employee_tags: 'Engineering, Remote, Vietnam', row_version: 2 } });

    await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', tag_id: 'employee-tag-engineering', parent_expected_row_version: 2,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', tag_id: 'employee-tag-remote', parent_expected_row_version: 3,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await repository.executeMutation(remove.mutation, {
      id: 'employee-demo-001', tag_id: 'employee-tag-vietnam', parent_expected_row_version: 4,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    expect(await repository.querySource(detail, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { employee_tag_ids: [], employee_tags: '', row_version: 5 } });
    expect((await repository.querySource(assignments, { id: 'employee-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 50)).data).toEqual([]);
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, duplicate, and missing relation changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_tags_guards');
    const api = yaml('api/employee-detail.yaml');
    const add = action(api, 'add_employee_tag');
    const remove = action(api, 'remove_employee_tag');
    const base = {
      id: 'employee-demo-001', tag_id: 'employee-tag-remote', parent_expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    };
    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_TAGS_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, tag_id: 'missing-tag' })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_TAGS_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, tag_id: 'employee-tag-engineering' })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_TAGS_EXISTS' });
    await expect(repository.executeMutation(remove.mutation, { ...base, tag_id: 'employee-tag-remote' })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_TAGS_STALE' });
    expect(await repository.query("SELECT row_version FROM employees WHERE id = 'employee-demo-001'")).toEqual([{ row_version: 1 }]);
    expect(await repository.query("SELECT tag_id FROM employee_tag_rel WHERE employee_id = 'employee-demo-001' ORDER BY tag_id")).toEqual([
      { tag_id: 'employee-tag-engineering' },
      { tag_id: 'employee-tag-vietnam' },
    ]);
    await database.close();
  });

  test('preserves employee tags through migration replay and file-backed restart', async () => {
    const databasePath = `/tmp/core3-employees-tags-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_tags_restart');
    const add = action(yaml('api/employee-detail.yaml'), 'add_employee_tag');
    await firstRepository.executeMutation(add.mutation, {
      id: 'employee-demo-002', tag_id: 'employee-tag-remote', parent_expected_row_version: 1,
      current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_tags_restart');
    expect(await secondRepository.query("SELECT tag_id FROM employee_tag_rel WHERE employee_id = 'employee-demo-002' ORDER BY tag_id")).toEqual([
      { tag_id: 'employee-tag-engineering' },
      { tag_id: 'employee-tag-remote' },
    ]);
    expect(await secondRepository.querySource(yaml('api/employee-detail.yaml').datasources[0], { id: 'employee-demo-002', current_company_name: 'Core3 Vietnam' }, 0, 1)).toMatchObject({ data: { employee_tags: 'Engineering, Remote', row_version: 2 } });
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
