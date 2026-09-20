import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Odoo action-mode parity batch', () => {
  test('exposes employee history from the persisted version relation', () => {
    const form = yaml('pages/employee-detail.yaml').components[0];
    expect(form.stat_buttons).toContainEqual({ id: 'open_employee_history', label: 'History', value_field: 'version_count', permission: 'employees.read' });
    expect(yaml('api/employee-detail.yaml').actions).toContainEqual(expect.objectContaining({ id: 'open_employee_history', navigate_to: '/employees/versions', permission: 'employees.read', params: { employee_id: '{state.id}' } }));
    expect(yaml('api/employee-detail.yaml').datasources[0].query).toContain('version_count');
  });
  test('keeps the bounded pages layout-only and discoverable by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = [
      ['pages/employees.yaml', 'employees', 'employees'],
      ['pages/directory.yaml', 'employee-directory', 'employee_directory'],
      ['pages/activities.yaml', 'employee-activities', 'employee_activities'],
      ['pages/departments.yaml', 'employee-departments', 'employee_departments_report'],
      ['pages/department-detail.yaml', 'employee-department-detail', 'employee_department_detail'],
      ['pages/work-locations.yaml', 'employee-work-locations', 'employee_work_locations'],
      ['pages/work-location-detail.yaml', 'employee-work-location-detail', 'employee_work_location_detail'],
      ['pages/departure-reasons.yaml', 'employee-departure-reasons', 'employee_departure_reasons'],
      ['pages/departure-reason-detail.yaml', 'employee-departure-reason-detail', 'employee_departure_reason_detail'],
    ] as const;
    for (const [file, pageId, sourceId] of routes) {
      const page = yaml(file);
      expect(page.datasources, file).toBeUndefined();
      expect(page.actions, file).toBeUndefined();
      expect(page.page.id, file).toBe(pageId);
      expect(discovered.pages.get(pageId), file).toBeTruthy();
      expect(discovered.pageDatasources.get(pageId), file).toContain(sourceId);
    }
  });

  test('matches Odoo employee and directory view-mode ordering with visible tabs', () => {
    const employees = yaml('pages/employees.yaml').components[0];
    expect(employees.view_navigation).toBe('tabs');
    expect(employees.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card', 'activity', 'graph', 'pivot']);
    expect(employees.views.map((view: any) => view.label)).toEqual(['Kanban', 'List', 'Cards', 'Activity', 'Graph', 'Pivot']);
    expect(employees.views.find((view: any) => view.id === 'kanban')).toMatchObject({ group_by: 'state', groups_source: 'employee_states' });
    expect(employees.views.find((view: any) => view.id === 'activity')?.activity_types.map((type: any) => type.label))
      .toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Document']);
    expect(employees.views.find((view: any) => view.id === 'pivot')?.pivot.default)
      .toMatchObject({ rows: ['department_name'], columns: ['state'] });

    const directory = yaml('pages/directory.yaml').components[0];
    expect(directory.view_navigation).toBe('tabs');
    expect(directory.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(directory.columns.map((column: any) => column.label)).toEqual(['Avatar', 'Name', 'Job Position', 'Department', 'Work Email', 'Work Phone']);
  });

  test('declares the all-activities and departments action contracts', () => {
    const activities = yaml('pages/activities.yaml').components[0];
    expect(activities.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'activity', 'graph', 'pivot', 'card']);
    expect(activities.row_open_action).toBe('view_employee_activity');
    expect(yaml('api/activities.yaml').actions.find((action: any) => action.id === 'view_employee_activity'))
      .toMatchObject({ navigate_to: '/employees/detail', params: { id: '{row.employee_id}' } });

    const departments = yaml('pages/departments.yaml').components[0];
    expect(departments.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(departments.create_action).toBe('create_department');
    expect(yaml('api/departments.yaml').actions.find((action: any) => action.id === 'create_department')?.permission).toBe('employees.manage');
    expect(yaml('api/department-detail.yaml').actions.map((action: any) => action.id)).toEqual([
      'new_department', 'department_employee_count', 'department_plan_count', 'edit_department', 'archive_department', 'restore_department', 'delete_department',
    ]);
  });

  test('seeds stable activity slots and department counts without page-local SQL', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_action_modes_schema_migrations', ['schema', 'data']);

    const employeeSource = yaml('api/employees.yaml').datasources.find((source: any) => source.id === 'employees');
    const employees = await repository.querySource(employeeSource, { q: null, active: null, state: null, department_name: null }, 0, 50);
    expect(employees.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect(employees.data.find((row: any) => row.id === 'employee-demo-001')).toMatchObject({ activity_type: 'todo', activity_state: 'overdue' });

    const archived = await repository.querySource(employeeSource, { q: null, active: 'false', state: null, department_name: null }, 0, 50);
    expect(archived.data.map((row: any) => row.id)).toEqual(['employee-demo-004', 'employee-demo-005']);

    const activitySource = yaml('api/activities.yaml').datasources.find((source: any) => source.id === 'employee_activities');
    const activities = await repository.querySource(activitySource, { q: null, timing: null, activity_type: null }, 0, 50);
    expect(activities.data).toHaveLength(3);
    expect(activities.data.map((row: any) => row.id)).toEqual([
      'employee-demo-001', 'employee-demo-002', 'employee-demo-003',
    ]);

    const departmentSource = yaml('api/departments.yaml').datasources[0];
    const departments = await repository.querySource(departmentSource, { q: null, active: null }, 0, 50);
    expect(departments.data.map((row: any) => row.name)).toEqual([
      'Administration', 'Long Term Projects', 'Management', 'Professional Services', 'R&D USA', 'Research & Development', 'Sales',
    ]);
    expect(departments.data.find((row: any) => row.name === 'Research & Development')).toMatchObject({ employee_count: 7 });
  });

  test('keeps source-side boundary and seed contracts deterministic', () => {
    const pageFiles = ['pages/employees.yaml', 'pages/directory.yaml', 'pages/activities.yaml', 'pages/departments.yaml', 'pages/department-detail.yaml', 'pages/work-locations.yaml', 'pages/work-location-detail.yaml', 'pages/departure-reasons.yaml', 'pages/departure-reason-detail.yaml'];
    expect(pageFiles.every(file => !/\bSELECT\b|\bUPDATE\b|\bINSERT\b/i.test(readFileSync(join(root, file), 'utf8')))).toBe(true);
    const migration = readFileSync(join(root, 'migrations/20260910140000-004-employees-action-modes.yaml'), 'utf8');
    expect(migration).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i);
    expect(migration).toContain('employee-activity-001');
    expect(yaml('manifest.yaml').menu.groups.map((group: any) => group.label)).toEqual(['People', 'Reporting', 'Learning', 'Configuration']);
    expect(yaml('manifest.yaml').menu.groups[0].items.map((item: any) => item.label)).toEqual(['Employees', 'Directory', 'All activities', 'Employee Records']);
  });

  test('forces employee archive and restore actions to override submitted form state', () => {
    for (const file of ['api/employees.yaml', 'api/employee-detail.yaml']) {
      const api = yaml(file);
      const archive = api.actions.find((action: any) => action.id.startsWith('archive_employee'));
      const restore = api.actions.find((action: any) => action.id.startsWith('restore_employee'));
      expect(archive.params).toEqual({ values: { active: false } });
      expect(restore.params).toEqual({ values: { active: true } });
      expect(archive.mutation.concurrency).toEqual({ required: true });
      expect(restore.mutation.concurrency).toEqual({ required: true });
    }
  });

  test('executes employee create, edit, archive, restore, and stale guards with deterministic persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_records_crud', ['schema', 'data']);

    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_employee');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_employee');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_employee_detail');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_employee_detail');

    expect(create.mutation).toMatchObject({ generated: ['id'], before_steps: [{ assign: true }] });
    const values = { employee_number: 'EMP-0099', name: 'Wave Four Employee', work_email: 'wave-four@core3.local', hire_date: '2026-09-13', employment_type: 'Employee' };
    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'employee-emp-0099', employee_number: 'EMP-0099', name: values.name, active: true, state: 'Draft', row_version: 1 });

    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Duplicate Number' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_RECORD_NUMBER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, employee_number: 'EMP-0100', name: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_RECORD_VALUES_INVALID' });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, name: 'Wave Four Employee Updated', work_phone: '+84 901 000 099' },
    });
    expect(edited).toMatchObject({ id: created.id, name: 'Wave Four Employee Updated', work_phone: '+84 901 000 099', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Stale Employee' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-employee', expected_row_version: 1, values: { name: 'Missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });

    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await database.close();
  });

  test('preserves employee CRUD state across a file-backed database restart and migration replay', async () => {
    const databasePath = `/tmp/core3-employees-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `employees_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const listSource = listApi.datasources.find((source: any) => source.id === 'employees');
    const detailSource = detailApi.datasources.find((source: any) => source.id === 'employee_detail');
    const create = listApi.actions.find((action: any) => action.id === 'create_employee');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_employee');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_employee_detail');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_employee_detail');
    const values = {
      employee_number: 'EMP-RESTART-01',
      name: 'Restart Durable Employee',
      work_email: 'restart.employee@core3.local',
      company_name: 'Core3 Vietnam',
      hire_date: '2026-09-20',
      employment_type: 'Employee',
    };

    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'employee-emp-restart-01', row_version: 1, active: true, state: 'Draft' });
    const edited = await firstRepository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { ...values, name: 'Restart Durable Employee Updated', work_phone: '+84 901 000 001' },
    });
    expect(edited).toMatchObject({ id: created.id, row_version: 2, name: 'Restart Durable Employee Updated' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const afterRestart = await secondRepository.querySource(detailSource, { id: created.id, current_company_name: 'Core3 Vietnam' }, 0, 1);
    expect(afterRestart.data).toMatchObject({
      id: created.id,
      name: 'Restart Durable Employee Updated',
      work_phone: '+84 901 000 001',
      row_version: 2,
      active: true,
    });
    const archived = await secondRepository.executeMutation(archive.mutation, {
      id: created.id,
      expected_row_version: 2,
      current_company_name: 'Core3 Vietnam',
      values: { active: false },
    });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    second.close();

    const third = await DuckDbDatabase.open(databasePath);
    const thirdRepository = new YamlRepository(third);
    await migrateDatabase(thirdRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const archivedAfterRestart = await thirdRepository.querySource(listSource, {
      q: null,
      active: 'false',
      state: null,
      department_name: null,
      current_company_name: 'Core3 Vietnam',
    }, 0, 50);
    expect(archivedAfterRestart.data).toContainEqual(expect.objectContaining({
      id: created.id,
      name: 'Restart Durable Employee Updated',
      row_version: 3,
      active: false,
    }));
    const restored = await thirdRepository.executeMutation(restore.mutation, {
      id: created.id,
      expected_row_version: 3,
      current_company_name: 'Core3 Vietnam',
      values: { active: true },
    });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    third.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces actor company scope across employee reads and lifecycle persistence', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_company_scope', ['schema', 'data']);

    const listApi = yaml('api/employees.yaml');
    const detailApi = yaml('api/employee-detail.yaml');
    const listSource = listApi.datasources.find((source: any) => source.id === 'employees');
    const detailSource = detailApi.datasources[0];
    const company = 'Core3 Vietnam';
    const otherCompany = 'Other Company';

    const coreRows = await repository.querySource(listSource, { q: null, active: 'false', state: null, department_name: null, current_company_name: company }, 0, 50);
    expect(coreRows.data.map((row: any) => row.id)).toEqual(['employee-demo-004']);
    const otherRows = await repository.querySource(listSource, { q: null, active: 'false', state: null, department_name: null, current_company_name: otherCompany }, 0, 50);
    expect(otherRows.data.map((row: any) => row.id)).toEqual(['employee-demo-005']);
    expect((await repository.querySource(detailSource, { id: 'employee-demo-005', current_company_name: company }, 0, 1)).data).toEqual({});

    const create = listApi.actions.find((action: any) => action.id === 'create_employee');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_employee');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_employee_detail');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_employee_detail');
    const values = { employee_number: 'EMP-0098', name: 'Company Scoped Employee', company_name: company, hire_date: '2026-09-13' };

    await expect(repository.executeMutation(create.mutation, { current_company_name: otherCompany, values })).rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_COMPANY_SCOPE_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: company, values });
    expect(created).toMatchObject({ id: 'employee-emp-0098', company_name: company, active: true, row_version: 1 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: otherCompany, values: { ...values, name: 'Cross Company Edit' } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: company, values: { ...values, name: 'Company Scoped Employee Updated' } });
    expect(edited).toMatchObject({ name: 'Company Scoped Employee Updated', company_name: company, row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: otherCompany, values: { active: false } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, current_company_name: company, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, company_name: company, active: false, row_version: 3 });
    await expect(repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: otherCompany, values: { active: true } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_RECORD_NOT_FOUND' });
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, current_company_name: company, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, company_name: company, active: true, row_version: 4 });
    await database.close();
  });

  test('adds the Odoo work-location configuration list/form with manager write boundary', async () => {
    const listPage = yaml('pages/work-locations.yaml');
    const detailPage = yaml('pages/work-location-detail.yaml');
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page.id).toBe('employee-work-locations');
    expect(detailPage.page.id).toBe('employee-work-location-detail');
    expect(listPage.components[0]).toMatchObject({ source: 'employee_work_locations', create_action: 'create_employee_work_location' });
    expect(detailPage.components[0]).toMatchObject({ source: 'employee_work_location_detail', status_field: 'status' });

    const listApi = yaml('api/work-locations.yaml');
    const detailApi = yaml('api/work-location-detail.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listApi.datasources[0].permission).toBe('employees.read');
    expect(listApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EMPLOYEES_DATA_UNAVAILABLE' });
    expect(listApi.actions.find((action: any) => action.id === 'create_employee_work_location')).toMatchObject({ type: 'server_form', permission: 'employees.manage' });
    expect(detailApi.actions.filter((action: any) => action.type !== 'navigate').every((action: any) => action.permission === 'employees.manage')).toBe(true);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_work_locations_schema_migrations', ['schema', 'data']);
    const source = listApi.datasources[0];
    const active = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.id)).toEqual(['work-location-danang', 'work-location-hanoi', 'work-location-hcm', 'work-location-home']);
    expect(active.data.find((row: any) => row.id === 'work-location-danang')).toMatchObject({ location_type: 'office', employee_count: 1, status: 'Active' });
    const archived = await repository.querySource(source, { q: null, active: 'false', fixture_state: null }, 0, 50);
    expect(archived.data.map((row: any) => row.id)).toEqual(['work-location-legacy']);
    const empty = await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DATA_UNAVAILABLE' });
    const detailSource = detailApi.datasources[0];
    const detail = await repository.querySource(detailSource, { id: 'work-location-hcm', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'work-location-hcm', name: 'Ho Chi Minh City', address_name: 'Core3 Vietnam HQ, District 1' });
    const missing = await repository.querySource(detailSource, { id: 'missing-work-location', fixture_state: 'not_found' }, 0, 1);
    expect(missing.data).toEqual({});
  });

  test('adds the Odoo departure-reasons action with manager-only read/write boundary', async () => {
    const listPage = yaml('pages/departure-reasons.yaml');
    const detailPage = yaml('pages/departure-reason-detail.yaml');
    const listApi = yaml('api/departure-reasons.yaml');
    const detailApi = yaml('api/departure-reason-detail.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page.id).toBe('employee-departure-reasons');
    expect(detailPage.page.id).toBe('employee-departure-reason-detail');
    expect(listPage.page.auth.require).toEqual(['employees.manage']);
    expect(detailPage.page.auth.require).toEqual(['employees.manage']);
    expect(listPage.components[0]).toMatchObject({ source: 'employee_departure_reasons', inline_edit: { create_action: 'create_employee_departure_reason_inline', update_action: 'update_employee_departure_reason_inline' } });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Departure Reason', 'Country']);
    expect(detailPage.components[0]).toMatchObject({ source: 'employee_departure_reason_detail', editable: true });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listApi.datasources[0].permission).toBe('employees.manage');
    expect(detailApi.datasources[0].permission).toBe('employees.manage');
    expect(listApi.actions.filter((action: any) => action.type === 'server_form').every((action: any) => action.permission === 'employees.manage')).toBe(true);
    expect(detailApi.actions.every((action: any) => action.permission === 'employees.manage')).toBe(true);
    expect(listApi.actions.find((action: any) => action.id === 'create_employee_departure_reason_inline')?.mutation).toMatchObject({ generated: ['id'] });
    const listUpdate = listApi.actions.find((action: any) => action.id === 'update_employee_departure_reason_inline');
    const detailEdit = detailApi.actions.find((action: any) => action.id === 'edit_employee_departure_reason');
    expect(listUpdate?.mutation.timestamps).toBeUndefined();
    expect(detailEdit?.mutation.timestamps).toBeUndefined();
    expect(listUpdate?.mutation).toMatchObject({ concurrency: { required: true, field: 'row_version', input: 'expected_row_version' } });
    expect(detailEdit?.mutation).toMatchObject({ concurrency: { required: true, field: 'row_version', input: 'expected_row_version' } });
    expect(listUpdate?.params).toEqual({ expected_row_version: '{row.row_version}' });
    expect(detailEdit?.params).toEqual({ expected_row_version: '{row.row_version}' });
    expect(detailApi.actions.map((action: any) => action.id)).toEqual([
      'edit_employee_departure_reason', 'archive_employee_departure_reason', 'restore_employee_departure_reason',
    ]);
    expect(detailApi.actions.find((action: any) => action.id === 'archive_employee_departure_reason')).toMatchObject({ action: 'employees.departure_reasons.archive', params: { values: { active: false } } });
    expect(detailApi.actions.find((action: any) => action.id === 'restore_employee_departure_reason')).toMatchObject({ action: 'employees.departure_reasons.restore', params: { values: { active: true } } });
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toContainEqual({ path: '/employees/departure-reasons', label: 'Departure Reasons', icon: 'list', permission: 'employees.manage' });

    const migration = readFileSync(join(root, 'migrations/20260910170000-006-departure-reasons.yaml'), 'utf8');
    expect(migration).not.toMatch(/gen_random_uuid|CURRENT_TIMESTAMP|CURRENT_DATE/);
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_reasons_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_reasons_schema_migrations', ['schema', 'data']);

    const source = listApi.datasources[0];
    const populated = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(populated.data.map((row: any) => row.id)).toEqual([
      'departure-reason-fired',
      'departure-reason-resigned',
      'departure-reason-retired',
      'departure-reason-vietnam-transfer',
      'departure-reason-vietnam-contract',
    ]);
    expect(populated.data[0]).toMatchObject({ sequence: 0, name: 'Fired', country_code: null, active: true, status: 'Active' });

    const filtered = await repository.querySource(source, { q: 'resign', fixture_state: null }, 0, 50);
    expect(filtered.data.map((row: any) => row.name)).toEqual(['Resigned']);
    const empty = await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DATA_UNAVAILABLE' });

    const detailSource = detailApi.datasources[0];
    const detail = await repository.querySource(detailSource, { id: 'departure-reason-resigned', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'departure-reason-resigned', name: 'Resigned', country_code: null });
    const missing = await repository.querySource(detailSource, { id: 'missing-departure-reason', fixture_state: 'not_found' }, 0, 1);
    expect(missing.data).toEqual({});
  });

  test('runs departure-reason archive and restore with row-version guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_reason_lifecycle', ['schema', 'data']);

    const listApi = yaml('api/departure-reasons.yaml');
    const detailApi = yaml('api/departure-reason-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_employee_departure_reason_inline');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_employee_departure_reason');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_employee_departure_reason');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_employee_departure_reason');
    const created = await repository.executeMutation(create.mutation, { values: { sequence: 10, name: 'Lifecycle reason', country_code: 'VN' } });
    expect(created).toMatchObject({ active: true, row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: created.row_version,
      values: { sequence: 11, name: 'Lifecycle reason updated', country_code: 'VN' },
    });
    expect(edited).toMatchObject({ active: true, row_version: 2, name: 'Lifecycle reason updated' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1,
      values: { sequence: 12, name: 'Stale lifecycle reason', country_code: 'VN' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, values: { sequence: 12, name: 'Missing version', country_code: 'VN' },
    })).rejects.toMatchObject({ status: 400 });

    const archived = await repository.executeMutation(archive.mutation, {
      id: created.id, expected_row_version: 2, values: { active: false },
    });
    expect(archived).toMatchObject({ active: false, row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, {
      id: created.id, expected_row_version: 3, values: { active: false },
    })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    const archivedRows = await repository.querySource(listApi.datasources[0], { q: null, active: 'false', fixture_state: null }, 0, 50);
    expect(archivedRows.data.find((row: any) => row.id === created.id)).toMatchObject({ active: false, status: 'Archived' });

    const restored = await repository.executeMutation(restore.mutation, {
      id: created.id, expected_row_version: 3, values: { active: true },
    });
    expect(restored).toMatchObject({ active: true, row_version: 4 });
    await expect(repository.executeMutation(restore.mutation, {
      id: created.id, expected_row_version: 3, values: { active: true },
    })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    await database.close();
  });

  test('isolates departure reasons across two selected companies', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_departure_reason_company_scope', ['schema', 'data']);
    const listApi = yaml('api/departure-reasons.yaml');
    const detailApi = yaml('api/departure-reason-detail.yaml');
    const list = listApi.datasources[0];
    const detail = detailApi.datasources[0];
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_employee_departure_reason');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_employee_departure_reason');
    const demo = await repository.querySource(list, { q: null, active: null, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(demo.data.every((row: any) => row.company_name === 'Core3 Demo Company')).toBe(true);
    const demoRows = (await repository.querySource(list, { q: null, active: null, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data;
    const vietnamRows = (await repository.querySource(list, { q: null, active: null, fixture_state: null, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data;
    expect(demoRows.map((row: any) => row.id)).toEqual(['departure-reason-fired', 'departure-reason-resigned', 'departure-reason-retired']);
    expect(vietnamRows.map((row: any) => row.id)).toEqual(['departure-reason-vietnam-transfer', 'departure-reason-vietnam-contract']);
    expect(vietnamRows.every((row: any) => row.company_name === 'Core3 Vietnam Branch')).toBe(true);
    expect(vietnamRows.every((row: any) => !demoRows.some((demo: any) => demo.id === row.id))).toBe(true);
    const branch = vietnamRows[0];
    expect((await repository.querySource(detail, { id: branch.id, fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});
    await expect(repository.executeMutation(archive.mutation, { id: branch.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { active: false } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    const archived = await repository.executeMutation(archive.mutation, { id: branch.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam Branch', values: { active: false } });
    expect(archived).toMatchObject({ company_name: 'Core3 Vietnam Branch', active: false, row_version: 2 });
    await expect(repository.executeMutation(restore.mutation, { id: branch.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company', values: { active: true } })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_DEPARTURE_REASON_NOT_FOUND' });
    await database.close();
  });
});
