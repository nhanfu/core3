import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const odooRoot = '/home/nhanjs/projects/odoo/addons/hr';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Employees Contract Templates parity', () => {
  test('maps the installed manager action and keeps page/API ownership explicit', () => {
    const menu = readFileSync(join(odooRoot, 'views/hr_views.xml'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/hr_contract_template_views.xml'), 'utf8');
    const access = readFileSync(join(odooRoot, 'security/ir.model.access.csv'), 'utf8');
    expect(menu).toContain('id="menu_hr_employee_contract_templates"');
    expect(menu).toContain('action="action_hr_contract_templates"');
    expect(menu).toContain('groups="hr.group_hr_manager"');
    expect(views).toContain('<field name="res_model">hr.version</field>');
    expect(views).toContain('<field name="view_mode">list,form</field>');
    expect(views).toContain('<field name="domain">[(\'employee_id\', \'=\', False)]</field>');
    expect(views).toContain('name="job_id"');
    expect(views).toContain('name="contract_type_id"');
    expect(views).toContain('name="resource_calendar_id"');
    expect(access).toContain('access_hr_version_manager,hr.version.manager,model_hr_version,group_hr_manager,1,1,1,1');

    const listPage = yaml('pages/contract-templates.yaml');
    const detailPage = yaml('pages/contract-template-detail.yaml');
    const listApi = yaml('api/contract-templates.yaml');
    const detailApi = yaml('api/contract-template-detail.yaml');
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'employee-contract-templates', route: '/employees/contract-templates', auth: { require: ['employees.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'employee-contract-template-detail', route: '/employees/contract-templates/detail', auth: { require: ['employees.manage'] } });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_contract_templates', create_action: 'create_employee_contract_template', view_navigation: 'tabs' });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Contract Template', 'Job Position', 'Department', 'Wage', 'Contract Type', 'Pay Category', 'Working Schedule', 'Company']);
    expect(listPage.components[0].default_filters).toEqual({ active: 'true' });
    expect(listPage.components[0].group_by.map((entry: any) => entry.label)).toEqual(['Job Position', 'Department', 'Working Schedule', 'Contract Type']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'employee_contract_template_detail', title_field: 'name', editable: false });
    expect(detailPage.components[0].notebook.tabs.map((entry: any) => entry.label)).toEqual(['Salary Information']);
    expect([action(listApi, 'create_employee_contract_template'), action(detailApi, 'edit_employee_contract_template'), action(detailApi, 'archive_employee_contract_template'), action(detailApi, 'restore_employee_contract_template'), action(detailApi, 'delete_employee_contract_template')].every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual({ path: '/employees/contract-templates', label: 'Contract Templates', icon: 'file-text', permission: 'employees.manage' });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('employee-contract-templates')).toBeTruthy();
    expect(discovered.pages.get('employee-contract-template-detail')).toBeTruthy();
    expect(discovered.pageDatasources.get('employee-contract-templates')).toContain('employee_contract_templates');
    expect(discovered.pageDatasources.get('employee-contract-template-detail')).toContain('employee_contract_template_detail');
  });

  test('seeds the two live Odoo templates and supports search, empty, detail, and transport states idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_contract_templates_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_contract_templates_acceptance', ['schema', 'data']);
    const listSource = yaml('api/contract-templates.yaml').datasources[0];
    const populated = await repository.querySource(listSource, { q: null, active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual(['Developer USA', 'HR Manager']);
    expect(populated.data[0]).toMatchObject({ job_position: 'Experienced Developer', department_name: 'R&D USA', wage: 3000, contract_type: 'Permanent', pay_category: 'Employee', working_schedule: 'Standard 38 hours/week', active_label: 'Current' });
    expect((await repository.querySource(listSource, { q: 'developer', active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Developer USA']);
    expect((await repository.querySource(listSource, { q: null, active: null, job_position: null, department_name: 'Administration', contract_type: null, working_schedule: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['HR Manager']);
    expect((await repository.querySource(listSource, { q: 'not-present', active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { q: null, active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(listSource, { q: null, active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_CONTRACT_TEMPLATES_UNAVAILABLE' });
    const detailSource = yaml('api/contract-template-detail.yaml').datasources[0];
    expect(await repository.querySource(detailSource, { id: 'contract-template-developer-usa', fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'contract-template-developer-usa', name: 'Developer USA', wage: 3000, working_schedule: 'Standard 38 hours/week' } });
    expect((await repository.querySource(detailSource, { id: 'missing-contract-template', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await database.close();
  });

  test('enforces manager-only CRUD, validation, duplicate, stale, archive, restore, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_contract_templates_mutation', ['schema', 'data']);
    const listApi = yaml('api/contract-templates.yaml');
    const detailApi = yaml('api/contract-template-detail.yaml');
    const create = action(listApi, 'create_employee_contract_template');
    const update = action(detailApi, 'edit_employee_contract_template');
    const archive = action(detailApi, 'archive_employee_contract_template');
    const restore = action(detailApi, 'restore_employee_contract_template');
    const remove = action(detailApi, 'delete_employee_contract_template');
    expect([create, update, archive, restore, remove].every((entry: any) => entry.permission === 'employees.manage')).toBe(true);
    expect([create, update, archive, restore, remove].every((entry: any) => entry.handler === 'yaml_mutation')).toBe(true);
    expect(update.mutation.concurrency).toMatchObject({ required: true });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Operations USA', wage: 2500, department_name: 'Operations' } });
    expect(created).toMatchObject({ id: 'contract-template-operations-usa', name: 'Operations USA', wage: 2500, row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' operations usa ' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_CONTRACT_TEMPLATE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CONTRACT_TEMPLATE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Wage', wage: -1 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_CONTRACT_TEMPLATE_WAGE_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Operations USA Updated', wage: 2750 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Operations USA Updated', wage: 2750, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Template' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-contract-template', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_CONTRACT_TEMPLATE_NOT_FOUND' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Operations USA', active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Operations USA', active: null, job_position: null, department_name: null, contract_type: null, working_schedule: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_CONTRACT_TEMPLATE_NOT_FOUND' });
    await database.close();
  });
});
