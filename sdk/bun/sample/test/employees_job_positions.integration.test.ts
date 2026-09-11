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

describe('Employees Job Positions parity', () => {
  test('maps the installed Odoo action and keeps page/API ownership explicit', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_job_views.xml', 'utf8');
    const recruitment = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_job_views.xml', 'utf8');
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/hr/views/hr_views.xml', 'utf8');
    expect(odoo).toContain('<field name="name">Job Positions</field>');
    expect(odoo).toContain('<field name="res_model">hr.job</field>');
    expect(odoo).toContain('<field name="view_mode">list,form</field>');
    expect(odoo).toContain('search_default_Current');
    expect(recruitment).toContain('string="Open Applications"');
    expect(odoo).toContain('name="no_of_recruitment"');
    expect(menu).toContain('id="menu_view_hr_job"');
    expect(menu).toContain('action="action_hr_job"');

    const listPage = yaml('pages/jobs.yaml');
    const detailPage = yaml('pages/job-detail.yaml');
    const listApi = yaml('api/jobs.yaml');
    const detailApi = yaml('api/job-detail.yaml');
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'employee-job-positions', route: '/employees/jobs', auth: { require: ['employees.read'] } });
    expect(detailPage.page).toMatchObject({ id: 'employee-job-position-detail', route: '/employees/jobs/detail', auth: { require: ['employees.read'] } });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_job_positions', create_action: 'create_employee_job', view_navigation: 'tabs' });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Job Position', 'Department', 'Open Applications', 'Target', 'Number of Employees', 'Company', 'Employment Type']);
    expect(listPage.components[0].default_filters).toEqual({ active: 'true' });
    expect(listPage.components[0].group_by.map((entry: any) => entry.label)).toEqual(['Department', 'Company', 'Employment Type']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'employee_job_position_detail', title_field: 'name', editable: false });
    expect(action(detailApi, 'edit_employee_job')).toMatchObject({ type: 'server_form', permission: 'employees.write' });
    expect(detailPage.components[0].stat_buttons.map((entry: any) => entry.label)).toEqual(['Applications', 'Employees']);
    expect(detailPage.components[0].notebook.tabs.map((entry: any) => entry.label)).toEqual(['Details', 'Summary', 'Trackers']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual({ path: '/employees/jobs', label: 'Job Positions', icon: 'briefcase', permission: 'employees.read' });

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('employee-job-positions')).toBeTruthy();
    expect(discovered.pages.get('employee-job-position-detail')).toBeTruthy();
    expect(discovered.pageDatasources.get('employee-job-positions')).toContain('employee_job_positions');
    expect(discovered.pageDatasources.get('employee-job-position-detail')).toContain('employee_job_position_detail');
  });

  test('seeds the nine live Odoo positions and supports default/search/empty/error states idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_job_positions_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_job_positions_acceptance', ['schema', 'data']);
    const source = yaml('api/jobs.yaml').datasources[0];
    const populated = await repository.querySource(source, { q: null, active: null, company_name: null, department_name: null, employment_type: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual(['Chief Technical Officer', 'Consultant', 'Experienced Developer', 'Human Resources Manager', 'Marketing and Community Manager', 'Trainee', 'Interior Designer', 'Site Manager', 'Handyman']);
    expect(populated.data[0]).toMatchObject({ department_name: 'Management / Research & Development', open_application_count: 5, no_of_recruitment: 1, company_name: 'Visible to all', active_label: 'Current' });
    expect((await repository.querySource(source, { q: 'developer', active: null, company_name: null, department_name: null, employment_type: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Experienced Developer']);
    expect((await repository.querySource(source, { q: null, active: null, company_name: 'My Company (San Francisco)', department_name: null, employment_type: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Interior Designer', 'Site Manager', 'Handyman']);
    expect((await repository.querySource(source, { q: null, active: null, company_name: null, department_name: 'Management', employment_type: null, fixture_state: null }, 0, 50)).data).toHaveLength(5);
    expect((await repository.querySource(source, { q: 'not-present', active: null, company_name: null, department_name: null, employment_type: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, company_name: null, department_name: null, employment_type: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, company_name: null, department_name: null, employment_type: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_JOB_POSITIONS_UNAVAILABLE' });
    const detailSource = yaml('api/job-detail.yaml').datasources[0];
    expect(await repository.querySource(detailSource, { id: 'job-chief-technical-officer', fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'job-chief-technical-officer', name: 'Chief Technical Officer', application_count: 6, employee_count: 2 } });
    expect((await repository.querySource(detailSource, { id: 'missing-job', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await database.close();
  });

  test('enforces HR-user CRUD, validation, duplicate, stale, archive, restore, and missing guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_job_positions_mutation', ['schema', 'data']);
    const listApi = yaml('api/jobs.yaml');
    const detailApi = yaml('api/job-detail.yaml');
    const create = action(listApi, 'create_employee_job');
    const update = action(detailApi, 'edit_employee_job');
    const archive = action(detailApi, 'archive_employee_job');
    const restore = action(detailApi, 'restore_employee_job');
    expect([create, update, archive, restore].every((entry: any) => entry.permission === 'employees.write')).toBe(true);
    expect([create, update, archive, restore].every((entry: any) => entry.handler === 'yaml_mutation')).toBe(true);
    expect(update.mutation.concurrency).toMatchObject({ required: true });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Data Protection Officer', no_of_recruitment: 2 } });
    expect(created).toMatchObject({ id: 'job-data-protection-officer', name: 'Data Protection Officer', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' data protection officer ' } })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_JOB_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_JOB_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Target', no_of_recruitment: -1 } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_JOB_TARGET_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Data Protection Officer Updated', no_of_recruitment: 3 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Data Protection Officer Updated', no_of_recruitment: 3, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Job' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-job', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_JOB_NOT_FOUND' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Data Protection', active: null, company_name: null, department_name: null, employment_type: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(listApi.datasources[0], { q: 'Data Protection', active: null, company_name: null, department_name: null, employment_type: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await database.close();
  });
});
