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

describe('Employees Skill Types parity', () => {
  test('maps the hr_skills action, menu, views, and page/API ownership', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="hr_skill_type_action"');
    expect(source).toContain('<field name="name">Skill Types</field>');
    expect(source).toContain('<field name="view_mode">list,form</field>');
    expect(source).toContain('id="hr_skill_type_menu"');
    expect(source).toContain('parent="hr.menu_config_employee"');
    expect(access).toContain('access_hr_skill_type,hr.skill.type,model_hr_skill_type,hr.group_hr_user,1,1,1,1');
    const page = yaml('pages/skill-types.yaml');
    const detail = yaml('pages/skill-type-detail.yaml');
    const api = yaml('api/skill-types.yaml');
    const detailApi = yaml('api/skill-type-detail.yaml');
    expect(page.page.id).toBe('employee-skill-types');
    expect(detail.page.id).toBe('employee-skill-type-detail');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0].datasources).toBeUndefined();
    expect(discoverPages(join(import.meta.dir, '..')).pages.get('employee-skill-types')).toBeTruthy();
  });

  test('seeds relations idempotently and supports current, archived, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_skill_types_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_skill_types_acceptance', ['schema', 'data']);
    const source = yaml('api/skill-types.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: 'true', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Technical Skills', 'Languages', 'Soft Skills', 'Certifications']);
    expect((await repository.querySource(source, { q: 'python', active: 'true', fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'Technical Skills', skills: 'Python, SQL' });
    expect((await repository.querySource(source, { q: null, active: 'false', fixture_state: null }, 0, 50)).data[0].name).toBe('Legacy Skills');
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_SKILL_TYPES_UNAVAILABLE' });
    await database.close();
  });

  test('enforces HR-user CRUD validation, stale, and archive guards', async () => {
    const api = yaml('api/skill-types.yaml');
    expect(action(api, 'create_employee_skill_type').permission).toBe('employees.write');
    const detailApi = yaml('api/skill-type-detail.yaml');
    expect(action(detailApi, 'edit_employee_skill_type').mutation.concurrency).toMatchObject({ required: true });
    expect(action(detailApi, 'archive_employee_skill_type').permission).toBe('employees.write');
    expect(action(detailApi, 'restore_employee_skill_type').permission).toBe('employees.write');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_skill_types_mutation', ['schema', 'data']);
    const create = action(api, 'create_employee_skill_type');
    const update = action(detailApi, 'edit_employee_skill_type');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Accessibility', color: 3, is_certification: false } });
    expect(created).toMatchObject({ id: 'skill-type-accessibility', name: 'Accessibility', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_SKILL_TYPE_NAME_REQUIRED' });
    await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Accessibility Practice', color: 3, is_certification: false } });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Name', color: 3, is_certification: false } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await database.close();
  });
});
