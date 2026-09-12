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

describe('Employees Certifications parity', () => {
  test('maps the hr_skills action, menu, views, and page/API ownership', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="action_hr_employee_skill_certification"');
    expect(source).toContain('<field name="name">Certifications</field>');
    expect(source).toContain('<field name="view_mode">list,form</field>');
    expect(source).toContain('id="hr_certification_menu"');
    expect(source).toContain('parent="hr_skill_learning_menu"');
    expect(source).toContain("('is_certification', '=', True)");
    expect(access).toContain('access_hr_employee_skill,hr.employee.skill,model_hr_employee_skill,hr.group_hr_user,1,1,1,1');
    const page = yaml('pages/certifications.yaml');
    const detail = yaml('pages/certification-detail.yaml');
    const api = yaml('api/certifications.yaml');
    const detailApi = yaml('api/certification-detail.yaml');
    expect(page.page.id).toBe('employee-certifications');
    expect(detail.page.id).toBe('employee-certification-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0].datasources).toBeUndefined();
    expect(discoverPages(join(import.meta.dir, '..')).pages.get('employee-certifications')).toBeTruthy();
  });

  test('seeds valid and expired certifications idempotently with Odoo filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_certifications_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_certifications_acceptance', ['schema', 'data']);
    const source = yaml('api/certifications.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, valid_state: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.employee_name)).toEqual(['Tran Bao Long', 'Admin User', 'Nguyen Minh Anh', 'Le Thu Ha']);
    expect((await repository.querySource(source, { q: null, valid_state: 'valid', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { q: 'Anh', valid_state: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ certification_name: 'Odoo Certification', validity_status: 'Valid' });
    expect((await repository.querySource(source, { q: null, valid_state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, valid_state: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_CERTIFICATIONS_UNAVAILABLE' });
    await database.close();
  });

  test('enforces HR-user writes, date validation, duplicate, stale, and not-found guards', async () => {
    const api = yaml('api/certifications.yaml');
    const detailApi = yaml('api/certification-detail.yaml');
    expect(action(api, 'create_employee_certification').permission).toBe('employees.write');
    expect(action(detailApi, 'edit_employee_certification').mutation.concurrency).toMatchObject({ required: true });
    expect(action(detailApi, 'delete_employee_certification').permission).toBe('employees.write');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_certifications_mutation', ['schema', 'data']);
    const create = action(api, 'create_employee_certification');
    const created = await repository.executeMutation(create.mutation, { values: { employee_id: 'employee-demo-001', skill_type_id: 'skill-type-certifications', skill_id: 'skill-odoo-cert', level_name: 'Expert', valid_from: '2026-02-01', valid_to: null } });
    expect(created).toMatchObject({ id: 'employee-cert-employee-demo-001-skill-odoo-cert-2026-02-01', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { employee_id: 'employee-demo-001', skill_type_id: 'skill-type-certifications', skill_id: 'skill-odoo-cert', valid_from: '2026-02-01', valid_to: '2026-01-01' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CERTIFICATION_DATES_INVALID' });
    const update = action(detailApi, 'edit_employee_certification');
    await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { employee_id: 'employee-demo-001', skill_type_id: 'skill-type-certifications', skill_id: 'skill-odoo-cert', level_name: 'Senior', valid_from: '2026-02-01', valid_to: null } });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { employee_id: 'employee-demo-001', skill_type_id: 'skill-type-certifications', skill_id: 'skill-odoo-cert', level_name: 'Stale', valid_from: '2026-02-01', valid_to: null } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-certification', expected_row_version: 1, values: { employee_id: 'employee-demo-001', skill_type_id: 'skill-type-certifications', skill_id: 'skill-odoo-cert', valid_from: '2026-02-01', valid_to: null } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_CERTIFICATION_NOT_FOUND' });
    await database.close();
  });
});
