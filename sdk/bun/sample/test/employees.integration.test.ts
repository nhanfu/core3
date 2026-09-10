import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Odoo action-mode parity batch', () => {
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
    expect(activities.views.map((view: any) => view.id)).toEqual(['activity', 'list', 'card', 'kanban', 'graph', 'pivot']);
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
    expect(archived.data.map((row: any) => row.id)).toEqual(['employee-demo-004']);

    const activitySource = yaml('api/activities.yaml').datasources.find((source: any) => source.id === 'employee_activities');
    const activities = await repository.querySource(activitySource, { q: null, timing: null, activity_type: null }, 0, 50);
    expect(activities.data).toHaveLength(5);
    expect(activities.data.map((row: any) => row.id)).toEqual([
      'employee-activity-004', 'employee-activity-001', 'employee-activity-005', 'employee-activity-002', 'employee-activity-003',
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
    expect(yaml('manifest.yaml').menu.groups.map((group: any) => group.label)).toEqual(['People', 'Reporting', 'Configuration']);
    expect(yaml('manifest.yaml').menu.groups[0].items.map((item: any) => item.label)).toEqual(['Employees', 'Directory', 'All activities']);
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
    expect(listApi.actions.find((action: any) => action.id === 'update_employee_departure_reason_inline')?.mutation.timestamps).toBeUndefined();
    expect(detailApi.actions.find((action: any) => action.id === 'edit_employee_departure_reason')?.mutation.timestamps).toBeUndefined();
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
    ]);
    expect(populated.data[0]).toMatchObject({ sequence: 0, name: 'Fired', country_code: null });

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
});
